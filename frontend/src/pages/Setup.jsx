import { useOverlayUrl } from '../lib/useOverlayUrl';
import { getStyleInfo, useStreamStyle } from '../lib/streamStyles';
import { Link } from '../router';
import OverlayUrlBox from '../components/OverlayUrlBox';
import Icon from '../components/Icon';

const STEPS = [
  { title: 'Copy your overlay URL', body: 'Use the Copy button above. Keep it private: anyone with it can see your alerts.' },
  { title: 'Add a Browser Source', body: 'In OBS Studio or Streamlabs, click + under Sources, choose Browser, and name it "StreamPulse alerts".' },
  { title: 'Paste and size it', body: 'Paste the URL, set Width 1920 and Height 1080, and tick "Control audio via OBS" so alert sounds go through your mixer.' },
  { title: 'Send a test', body: 'Open Alerts and click "Send test to overlay". The alert should appear on stream, then the source goes fully transparent again.' }
];

// overlay url and short obs/streamlabs steps (srs 3.3.2, 4.3 --> working in under 5 minutes)
export default function Setup() {
  const { url, error } = useOverlayUrl();
  const { style } = useStreamStyle();

  return (
    <div className="page setup-page">
      <header className="page-head">
        <div>
          <h1 className="display">Overlay setup</h1>
          <p className="muted">Add your alerts to OBS or Streamlabs in about two minutes.</p>
        </div>
      </header>

      <section className="card">
        <h2>Your overlay URL</h2>
        <p className="muted small">
          Uses the <strong>{getStyleInfo(style).name}</strong> style. <Link to="/settings">Change style</Link> and copy the URL again to switch.
        </p>
        {error ? <div className="notice notice-warn"><Icon name="warning" size={18} />{error.message}</div> : <OverlayUrlBox url={url} />}
        <div className="row-actions">
          <a className={`btn btn-ghost btn-sm ${url ? '' : 'is-disabled'}`} href={url || undefined} target="_blank" rel="noreferrer">
            <Icon name="external" size={16} />Open overlay in a new tab
          </a>
          <span className="muted small">Handy for testing: send a test alert and watch it appear in that tab.</span>
        </div>
      </section>

      <ol className="steps">
        {STEPS.map((s, i) => (
          <li key={s.title} className="card step">
            <span className="step-num">{i + 1}</span>
            <div>
              <h3>{s.title}</h3>
              <p className="muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}