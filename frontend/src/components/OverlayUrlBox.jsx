import { useState } from 'react';
import Icon from './Icon';

// hidden by default so it doesn't leak on a shared screen --> anyone with the url sees your alerts
export default function OverlayUrlBox({ url }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy your overlay URL:', url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="url-box">
      <code className={`url-text ${shown ? '' : 'is-hidden'}`}>{url ? (shown ? url : url.replace(/\/overlay\/.*/, '/overlay/••••••••••••••••••••••••')) : 'Loading...'}</code>
      <div className="url-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShown((s) => !s)} disabled={!url}>
          <Icon name={shown ? 'eyeOff' : 'eye'} size={16} />{shown ? 'Hide' : 'Show'}
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={copy} disabled={!url}>
          <Icon name={copied ? 'check' : 'copy'} size={16} />{copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}