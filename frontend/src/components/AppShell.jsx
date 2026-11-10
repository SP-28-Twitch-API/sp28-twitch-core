import { Link, useRouter } from '../router';
import { useSession } from '../lib/session';
import Icon, { PulseMark } from './Icon';
import Avatar from './Avatar';
import { StyleQuickSwitch } from './StylePicker';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/alerts', label: 'Alerts', icon: 'alerts' },
  { to: '/setup', label: 'Overlay setup', icon: 'setup' },
  { to: '/settings', label: 'Settings', icon: 'settings' }
];

// sidebar and top bar around every logged-in page
export default function AppShell({ children }) {
  const { path } = useRouter();
  const { me, error, reload, demo } = useSession();

  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <aside className="sidebar">
        <Link to="/dashboard" className="brand">
          <PulseMark size={34} />
          <span className="brand-name">StreamPulse</span>
        </Link>
        <nav className="nav" aria-label="Main">
          {NAV.map((item) => (
            <Link key={item.to} to={item.to} className={`nav-link ${path === item.to ? 'is-active' : ''}`} aria-current={path === item.to ? 'page' : undefined}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          {demo ? <span className="tag tag-demo">Demo data</span> : null}
          <span className="muted small">SP-28 · CS 4850</span>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div className="topbar-channel">
            {me ? <><Avatar me={me} size={34} /><span className="topbar-name">{me.displayName}</span></> : <span className="skeleton skeleton-name" />}
          </div>
          <div className="topbar-actions">
            <StyleQuickSwitch />
          </div>
        </header>

        <main id="main" className="content" tabIndex={-1}>
          {error ? (
            <div className="card empty-state">
              <Icon name="warning" size={28} />
              <h2>We couldn't load your channel</h2>
              <p className="muted">{error.message}</p>
              <button type="button" className="btn btn-primary" onClick={reload}><Icon name="refresh" size={18} />Try again</button>
            </div>
          ) : children}
        </main>
      </div>
    </div>
  );
}