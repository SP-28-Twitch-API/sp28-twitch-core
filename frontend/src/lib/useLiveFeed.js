import { useEffect, useRef, useState } from 'react';
import { isDemo } from '../api';
import { mockApi } from '../api/mock';
import { demoChat, demoEvent } from './demoFeed';
import { loadSettings } from './alertSettings';
import { sendToOverlay } from './overlayBus';

const MAX_EVENTS = 50;   // sdd 5.5: keep the feed small on long streams
const MAX_CHAT = 100;    // only the latest 100 lines, chat is never stored
const SPARK_POINTS = 36; // 36 samples x 5 s = the last 3 minutes

// live events and chat for the dashboard
// demo mode makes them up --> live mode will listen to the backend websocket in a later step
export function useLiveFeed() {
  const demo = isDemo();
  const [status, setStatus] = useState(demo ? 'connected' : 'waiting');
  const [events, setEvents] = useState([]);
  const [chat, setChat] = useState([]);
  const [mpm, setMpm] = useState(0);
  const [spark, setSpark] = useState(() => Array(SPARK_POINTS).fill(0));
  const [gap, setGap] = useState(false);
  const chatTimes = useRef([]);

  useEffect(() => {
    if (!demo) return undefined;
    let alive = true;

    const pushEvent = (event) => {
      mockApi.bump(event);
      setEvents((list) => [event, ...list].slice(0, MAX_EVENTS)); // functional update: never loses an item
      const settings = loadSettings()[event.type];
      if (settings?.enabled) sendToOverlay({ type: 'alert', event, settings });
    };
    const pushChat = (msg) => {
      chatTimes.current.push(msg.ts);
      setChat((list) => [...list, msg].slice(-MAX_CHAT));
      sendToOverlay({ type: 'chat', message: msg });
    };

    // a believable chat history for the sparkline, and a few lines right away so the screen isn't empty
    setSpark(Array.from({ length: SPARK_POINTS }, (_, i) => Math.max(1, Math.round(9 + 5 * Math.sin(i / 4) + Math.random() * 4))));
    for (let i = 0; i < 6; i++) pushChat({ ...demoChat(), ts: Date.now() - (6 - i) * 4000 });
    setEvents([demoEvent(), demoEvent(), demoEvent()].map((e, i) => ({ ...e, ts: Date.now() - (i + 1) * 45000 })));

    const loop = (fn, min, max) => {
      let t;
      const tick = () => { if (!alive) return; fn(); t = setTimeout(tick, min + Math.random() * (max - min)); };
      t = setTimeout(tick, min);
      return () => clearTimeout(t);
    };
    const stopEvents = loop(() => pushEvent(demoEvent()), 4000, 9000);
    const stopChat = loop(() => pushChat(demoChat()), 700, 2200);

    return () => { alive = false; stopEvents(); stopChat(); };
  }, [demo]);

  // messages per minute (srs 3.4.2): count the last 60 s, refresh every second, sample every 5 s
  useEffect(() => {
    let ticks = 0;
    const timer = setInterval(() => {
      const cutoff = Date.now() - 60000;
      chatTimes.current = chatTimes.current.filter((t) => t >= cutoff);
      const now = chatTimes.current.length;
      setMpm(now);
      if (++ticks % 5 === 0) setSpark((s) => [...s.slice(1), now]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // demo control: pretend the connection dropped and came back (srs 3.2.5)
  const simulateDrop = () => {
    if (!demo) return;
    setStatus('reconnecting');
    setTimeout(() => { setStatus('connected'); setGap(true); }, 2500);
  };

  const replay = (event) => {
    const settings = loadSettings()[event.type];
    sendToOverlay({ type: 'alert', event: { ...event, id: `${event.id}-replay-${Date.now()}` }, settings: { ...settings, enabled: true } });
  };

  return { status, events, chat, mpm, spark, gap, dismissGap: () => setGap(false), simulateDrop, replay, demo };
}