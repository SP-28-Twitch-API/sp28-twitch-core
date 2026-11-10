import { useState } from 'react';
import { api, endDemo } from '../api';
import { useRouter } from '../router';
import { useSession } from '../lib/session';
import { useOverlayUrl } from '../lib/useOverlayUrl';
import StylePicker from '../components/StylePicker';
import ConfirmButton from '../components/ConfirmButton';
import OverlayUrlBox from '../components/OverlayUrlBox';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';

// alert settings live in this browser until the backend stores them --> delete them here too
const clearLocalSettings = () => { try { localStorage.removeItem('sp28.alertSettings'); } catch { /* ignore */ } };

// stream style, connected account, overlay url reset, disconnect and delete (srs 3.5)
export default function Settings() {
  const { me, demo } = useSession();
  const { navigate } = useRouter();
  const overlay = useOverlayUrl();
  const [notice, setNotice] = useState(null);

  const leave = (reason) => {
    if (demo) endDemo();
    navigate(`/login${reason ? `?reason=${reason}` : ''}`, { replace: true });
  };

  const run = (fn, reason) => async () => {
    try {
      await fn();
      leave(reason);
    } catch (err) {
      setNotice(err.message);
    }
  };

  const regenerate = async () => {
    try {
      await overlay.regenerate();
      setNotice('New overlay URL created. The old one stopped working, so update it in OBS.');
    } catch (err) {
      setNotice(err.message);
    }
  };

  return (
    <div className="page settings-page">
      <header className="page-head">
        <div>
          <h1 className="display">Settings</h1>
          <p className="muted">Make StreamPulse match your stream, and manage your account.</p>
        </div>
      </header>

      {notice ? <div className="notice notice-info" role="status"><Icon name="check" size={18} /><span>{notice}</span></div> : null}

      <section className="card">
        <h2>Stream style</h2>
        <p className="muted small">Changes this dashboard right away. Your OBS overlay uses the style in its URL, so copy it again from Overlay setup after switching.</p>
        <StylePicker />
      </section>

      <section className="card">
        <h2>Overlay URL</h2>
        <OverlayUrlBox url={overlay.url} />
        <div className="row-actions">
          <ConfirmButton icon="refresh" className="btn btn-ghost" onConfirm={regenerate}>Regenerate URL</ConfirmButton>
          <span className="muted small">Use this if your URL was shown on stream. The old URL stops working immediately.</span>
        </div>
      </section>

      <section className="card account">
        <h2>Twitch account</h2>
        <div className="account-row">
          <Avatar me={me} size={48} />
          <div>
            <div className="strong">{me?.displayName}</div>
            <div className="muted small">twitch.tv/{me?.login} · {me?.broadcasterType || 'not affiliate yet'}</div>
          </div>
          <button type="button" className="btn btn-ghost account-logout" onClick={run(() => api().logout())}>
            <Icon name="logout" size={18} />Log out
          </button>
        </div>

        <div className="danger-zone">
          <div>
            <div className="strong">Disconnect Twitch</div>
            <p className="muted small">Removes our access to your Twitch account. Your alert settings and overlay URL are kept for next time.</p>
          </div>
          <ConfirmButton icon="unlink" onConfirm={run(() => api().disconnect(), 'disconnected')}>Disconnect</ConfirmButton>
        </div>
        <div className="danger-zone">
          <div>
            <div className="strong">Delete all my data</div>
            <p className="muted small">Disconnects Twitch and deletes your settings and overlay URL from StreamPulse.</p>
          </div>
          <ConfirmButton icon="trash" onConfirm={run(async () => { await api().deleteAccount(); clearLocalSettings(); }, 'deleted')}>Delete everything</ConfirmButton>
        </div>
      </section>
    </div>
  );
}