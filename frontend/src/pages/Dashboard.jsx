import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useSession } from '../lib/session';
import { useLiveFeed } from '../lib/useLiveFeed';
import { fillTemplate, loadSettings } from '../lib/alertSettings';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import Sparkline from '../components/Sparkline';

const STATUS_TEXT = { connected: 'Connected', reconnecting: 'Reconnecting', disconnected: 'Disconnected', waiting: 'Live events not connected yet' };

const ago = (ts) => {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

const uptime = (startedAt, now) => {
  const s = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

// tick every second so uptime stays current
function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

function StatTile({ icon, label, value, note, accent }) {
  const unavailable = value == null;
  return (
    <div className={`card stat ${accent ? 'stat-accent' : ''}`}>
      <div className="stat-head"><Icon name={icon} size={18} /><span>{label}</span></div>
      <div className={`stat-value ${unavailable ? 'is-empty' : ''}`}>{unavailable ? '—' : Number(value).toLocaleString()}</div>
      {note ? <div className="stat-note">{note}</div> : null}
    </div>
  );
}

export default function Dashboard() {
  const { me } = useSession();
  const feed = useLiveFeed();
  const now = useNow();
  const [stats, setStats] = useState(undefined);
  const [statsError, setStatsError] = useState(null);
  const settings = useMemo(loadSettings, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const s = await api().getStats();
        if (alive) { setStats(s); setStatsError(null); }
      } catch (err) {
        if (alive) setStatsError(err);
      }
    };
    load();
    const t = setInterval(load, 30000); // matches the backends 30 second cache
    return () => { alive = false; clearInterval(t); };
  }, [feed.events.length]);

  const notAffiliate = me && !me.broadcasterType;
  const monetized = (value) => (notAffiliate ? null : value);
  const affiliateNote = notAffiliate ? 'Needs Affiliate or Partner' : null;
  const notConnected = stats === null ? 'Connects in the stats update' : null;

  return (
    <div className="page dashboard">
      <section className="channel-hero card">
        <Avatar me={me} size={64} />
        <div className="hero-text">
          <h1 className="display">{me ? me.displayName : <span className="skeleton skeleton-title" />}</h1>
          <div className="hero-meta">
            {stats?.isLive ? (
              <span className="live-pill"><span className="live-dot" />LIVE · {uptime(stats.startedAt, now)}</span>
            ) : (
              <span className="offline-pill">{stats === null ? 'Status not connected yet' : 'Offline'}</span>
            )}
            <span className={`conn conn-${feed.status}`} role="status"><span className="conn-dot" />{STATUS_TEXT[feed.status]}</span>
          </div>
        </div>
        {feed.demo ? (
          <button type="button" className="btn btn-ghost btn-sm hero-demo" onClick={feed.simulateDrop} title="Demo: pretend the connection dropped">
            <Icon name="unlink" size={16} />Drop connection
          </button>
        ) : null}
      </section>

      {feed.gap ? (
        <div className="notice notice-warn" role="status">
          <Icon name="warning" size={18} />
          <span>The live connection dropped for a moment. Twitch doesn't resend missed events, so a few may be missing from the feed.</span>
          <button type="button" className="link-btn" onClick={feed.dismissGap}>Got it</button>
        </div>
      ) : null}

      {statsError ? (
        <div className="notice notice-warn" role="status"><Icon name="warning" size={18} /><span>{statsError.message}</span></div>
      ) : null}

      <section className="stats-grid" aria-label="Channel stats">
        <StatTile icon="followers" label="Followers" value={stats?.followers} note={notConnected} accent />
        <StatTile icon="sub" label="Subscribers" value={monetized(stats?.subscribers)} note={affiliateNote || notConnected} />
        <StatTile icon="cheer" label="Bits" value={monetized(stats?.bitsTotal)} note={affiliateNote || notConnected} />
        <StatTile icon="viewers" label="Viewers" value={stats?.isLive ? stats.viewerCount : null} note={stats?.isLive ? null : (notConnected || 'Shown while live')} />
      </section>

      <div className="split">
        <section className="card panel" aria-label="Recent activity">
          <header className="panel-head">
            <h2>Activity</h2>
            <span className="muted small">{feed.events.length ? `${feed.events.length} recent` : ''}</span>
          </header>
          {feed.events.length === 0 ? (
            <div className="empty-state compact">
              <Icon name="alerts" size={26} />
              <p>{feed.demo ? 'Waiting for the first event...' : 'Follows, subs, cheers and redemptions will show up here once live events are connected.'}</p>
            </div>
          ) : (
            <ul className="feed">
              {feed.events.map((event) => (
                <li key={event.id} className={`feed-item feed-${event.type}`}>
                  <span className="feed-icon"><Icon name={event.type} size={18} /></span>
                  <span className="feed-text">
                    {fillTemplate(settings[event.type].message, event)}
                    {event.message ? <span className="feed-msg">“{event.message}”</span> : null}
                  </span>
                  <span className="feed-time">{ago(event.ts)}</span>
                  {feed.demo ? (
                    <button type="button" className="icon-btn" onClick={() => feed.replay(event)} title="Replay on overlay" aria-label="Replay on overlay">
                      <Icon name="play" size={16} />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card panel chat-panel" aria-label="Live chat">
          <header className="panel-head">
            <h2>Chat</h2>
            <div className="chat-pulse" title="Messages in the last minute">
              <Sparkline values={feed.spark} label={`Chat activity, ${feed.mpm} messages per minute`} />
              <span className="mpm"><strong>{feed.mpm}</strong> msg/min</span>
            </div>
          </header>
          {feed.chat.length === 0 ? (
            <div className="empty-state compact">
              <Icon name="chat" size={26} />
              <p>{feed.demo ? 'Chat is quiet...' : 'Live chat will show up here once live events are connected.'}</p>
            </div>
          ) : (
            <ol className="chat" aria-live="polite">
              {feed.chat.slice(-40).reverse().map((m) => ( // newest first and column-reverse so its pinned to the bottom 
                <li key={m.id}>
                  <span className="chat-user" style={{ color: m.color }}>{m.user}</span>
                  <span className="chat-text">{m.text}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}