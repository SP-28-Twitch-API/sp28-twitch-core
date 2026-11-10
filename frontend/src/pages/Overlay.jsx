import { useEffect, useRef, useState } from 'react';
import { useRouter } from '../router';
import { useStreamStyle } from '../lib/streamStyles';
import { onOverlayMessage } from '../lib/overlayBus';
import { intensityOf, loadSettings } from '../lib/alertSettings';
import { playAlertSound } from '../lib/sound';
import AlertCard from '../components/AlertCard';

const EXIT_MS = 600;   // matches the leave animation in alerts.css
const GAP_MS = 400;    // short breather between queued alerts
const SEEN_MAX = 200;  // remember recent ids so duplicates are ignored

// the page obs loads as a browser source
//  fully transparent until an alert plays (srs 3.3.3, 3.3.7, 3.3.9)
// url: /overlay/<token>?style=pulse&widgets=alerts,chat
export default function Overlay({ token }) {
  const { query } = useRouter();
  const { style } = useStreamStyle();
  const widgets = (query.get('widgets') || 'alerts').split(',');
  const showChat = widgets.includes('chat');

  const [current, setCurrent] = useState(null);
  const [chat, setChat] = useState([]);
  const queue = useRef([]);
  const busy = useRef(false);
  const seen = useRef([]);
  const settingsRef = useRef(loadSettings());

  // transparent page
  // not visible while idle
  useEffect(() => {
    document.documentElement.classList.add('overlay-mode');
    return () => document.documentElement.classList.remove('overlay-mode');
  }, []);

  useEffect(() => {
    const next = () => {
      const item = queue.current.shift();
      if (!item) { busy.current = false; return; }
      busy.current = true;
      setCurrent({ ...item, phase: 'in' });
      if (item.settings.sound) playAlertSound(item.event.type, { intensity: intensityOf(item.event), style });
      const showFor = item.settings.durationSec * 1000;
      setTimeout(() => setCurrent((c) => c && { ...c, phase: 'out' }), showFor);
      setTimeout(() => { setCurrent(null); setTimeout(next, GAP_MS); }, showFor + EXIT_MS);
    };

    const enqueue = (event, settings) => {
      if (seen.current.includes(event.id)) return;
      seen.current = [...seen.current, event.id].slice(-SEEN_MAX);
      if (!settings?.enabled) return;
      queue.current.push({ event, settings });
      if (!busy.current) next();
    };

    // demo and "send test" messages from a dashboard tab in this browser
    // (the backend websocket feeds the same enqueue() in the live connection step, using `token`)
    return onOverlayMessage((msg) => {
      if (msg.type === 'alert') enqueue(msg.event, msg.settings || settingsRef.current[msg.event.type]);
      if (msg.type === 'settings') settingsRef.current = msg.settings;
      if (msg.type === 'chat' && showChat) {
        setChat((list) => [...list, { ...msg.message, shownAt: Date.now() }].slice(-6));
      }
    });
  }, [style, showChat, token]);

  // chat ticker lines fade out after 20 seconds
  useEffect(() => {
    if (!showChat) return undefined;
    const t = setInterval(() => setChat((list) => list.filter((m) => Date.now() - m.shownAt < 20000)), 1000);
    return () => clearInterval(t);
  }, [showChat]);

  return (
    <div className="overlay-root" data-style={style}>
      <div className="overlay-alert-slot">
        {current ? <AlertCard key={current.event.id} event={current.event} settings={current.settings} phase={current.phase} style={style} /> : null}
      </div>
      {showChat && chat.length ? (
        <ul className="overlay-chat">
          {chat.map((m) => (
            <li key={m.id}><span style={{ color: m.color }}>{m.user}</span> {m.text}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}