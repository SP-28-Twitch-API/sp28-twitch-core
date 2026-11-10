import { useEffect, useState } from 'react';
import Icon from './Icon';

// requires need a second click within 5 seconds to confirm
export default function ConfirmButton({ icon, children, confirmText = 'Click again to confirm', onConfirm, className = 'btn btn-danger', busyText = 'Working...' }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);

  const onClick = async () => {
    if (!armed) return setArmed(true);
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); setArmed(false); }
  };

  return (
    <button type="button" className={`${className} ${armed ? 'is-armed' : ''}`} onClick={onClick} disabled={busy}>
      {icon ? <Icon name={icon} size={18} /> : null}
      <span>{busy ? busyText : armed ? confirmText : children}</span>
    </button>
  );
}