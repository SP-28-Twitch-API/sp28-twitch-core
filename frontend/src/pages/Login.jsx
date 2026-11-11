import { useRouter } from '../router';
import { api, startDemo } from '../api';
import Icon, { PulseMark } from '../components/Icon';
import { StyleQuickSwitch } from '../components/StylePicker';

// reason comes from the url
//  only these known messages are ever shown
const MESSAGES = {
  state: 'That login expired or was started in another tab. Please try again.',
  denied: 'You cancelled the Twitch login. No problem, try again whenever you like.',
  twitch: "Twitch login didn't work. Please try again.",
  expired: 'Your Twitch session ended or access was removed. Please log in again.',
  busy: 'Too many login attempts. Please wait a minute and try again.',
  disconnected: 'Your Twitch account was disconnected. Log in again any time to reconnect.',
  deleted: 'All your StreamPulse data was deleted.'
};

const PERMISSIONS = ['Your channel name and picture', 'Followers', 'Subscriptions', 'Bits and cheers', 'Channel point redemptions', 'Live chat'];

export default function Login() {
  const { query, navigate } = useRouter();
  const message = MESSAGES[query.get('reason')];
  const isGood = ['disconnected', 'deleted', 'denied'].includes(query.get('reason'));

  const tryDemo = () => { startDemo(); navigate('/dashboard'); };
  const demoOnly = api().mode === 'demo';

  return (
    <div className="login-page">
      <svg className="login-beat" viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 110h420l30-60 40 120 34-90 24 30h652" />
      </svg>
      <div className="login-style"><StyleQuickSwitch /></div>

      <main className="login-card card">
        <PulseMark size={56} />
        <h1 className="display">StreamPulse</h1>
        <p className="muted lead">Live stats, chat and on-stream alerts for your Twitch channel.</p>

        {message ? (
          <div className={`notice ${isGood ? 'notice-info' : 'notice-warn'}`} role="status">
            <Icon name={isGood ? 'check' : 'warning'} size={18} />
            <span>{message}</span>
          </div>
        ) : null}

        {demoOnly ? (
          <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard')}>
            <Icon name="broadcast" />Open the demo dashboard
          </button>
        ) : (
          <a className="btn btn-primary btn-lg" href={api().loginUrl}>
            <Icon name="broadcast" />Login with Twitch
          </a>
        )}
        {!demoOnly ? (
          <button type="button" className="btn btn-ghost" onClick={tryDemo}>Try the demo without logging in</button>
        ) : null}

        <details className="perms">
          <summary>What StreamPulse can see</summary>
          <ul>{PERMISSIONS.map((p) => <li key={p}><Icon name="check" size={16} />{p}</li>)}</ul>
          <p className="muted small">Read-only. We never see your password and never post anything.</p>
        </details>
      </main>
    </div>
  );
}