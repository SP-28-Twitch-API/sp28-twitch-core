import { useEffect, useRef, useState } from 'react';
import { useSession } from '../lib/session';
import { useStreamStyle } from '../lib/streamStyles';
import { ALERT_TYPES, LIMITS, PLACEHOLDERS, loadSettings, sampleEvent, saveSettings, validate, intensityOf } from '../lib/alertSettings';
import { playAlertSound } from '../lib/sound';
import { sendToOverlay } from '../lib/overlayBus';
import AlertCard from '../components/AlertCard';
import Icon from '../components/Icon';

// turn alert types on/off, edit text, duration and sound, preview and send tests (srs 3.3.4, 3.3.5, 3.3.8)
export default function Alerts() {
  const { me } = useSession();
  const { style } = useStreamStyle();
  const [saved, setSaved] = useState(loadSettings);
  const [draft, setDraft] = useState(saved);
  const [selected, setSelected] = useState('follow');
  const [preview, setPreview] = useState(null);
  const [toast, setToast] = useState('');
  const messageRef = useRef(null);
  const previewTimers = useRef([]);

  const entry = draft[selected];
  const errors = validate(entry);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const valid = Object.keys(errors).length === 0;
  const notAffiliate = me && !me.broadcasterType;

  const update = (type, patch) => setDraft((d) => ({ ...d, [type]: { ...d[type], ...patch } }));

  const flash = (text) => {
    setToast(text);
    setTimeout(() => setToast(''), 2500);
  };

  const playPreview = (type = selected) => {
    previewTimers.current.forEach(clearTimeout);
    const event = sampleEvent(type);
    const settings = draft[type];
    setPreview({ event, settings, phase: 'in' });
    if (settings.sound) playAlertSound(type, { intensity: intensityOf(event), style });
    previewTimers.current = [
      setTimeout(() => setPreview((p) => p && { ...p, phase: 'out' }), settings.durationSec * 1000),
      setTimeout(() => setPreview(null), settings.durationSec * 1000 + 600)
    ];
  };

  useEffect(() => () => previewTimers.current.forEach(clearTimeout), []);
  useEffect(() => { playPreview(selected); }, [selected, style]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    saveSettings(draft);
    setSaved(draft);
    sendToOverlay({ type: 'settings', settings: draft });
    flash('Saved');
  };

  const sendTest = () => {
    sendToOverlay({ type: 'alert', event: sampleEvent(selected), settings: { ...entry, enabled: true } });
    flash('Test alert sent to open overlay tabs');
  };

  const insert = (token) => {
    const el = messageRef.current;
    const start = el?.selectionStart ?? entry.message.length;
    const end = el?.selectionEnd ?? entry.message.length;
    update(selected, { message: entry.message.slice(0, start) + token + entry.message.slice(end) });
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + token.length, start + token.length); });
  };

  return (
    <div className="page alerts-page">
      <header className="page-head">
        <div>
          <h1 className="display">Alerts</h1>
          <p className="muted">Choose which alerts show on stream and how they look and sound.</p>
        </div>
        <div className="page-actions">
          {toast ? <span className="toast" role="status"><Icon name="check" size={16} />{toast}</span> : null}
          <button type="button" className="btn btn-ghost" disabled={!dirty} onClick={() => setDraft(saved)}>Undo changes</button>
          <button type="button" className="btn btn-primary" disabled={!dirty || !valid} onClick={save}>Save</button>
        </div>
      </header>

      <div className="alerts-layout">
        <nav className="card alert-list" aria-label="Alert types">
          {ALERT_TYPES.map(({ type, label, icon, needsAffiliate }) => (
            <div key={type} className={`alert-row ${selected === type ? 'is-selected' : ''}`}>
              <button type="button" className="alert-row-main" onClick={() => setSelected(type)} aria-current={selected === type}>
                <span className="feed-icon"><Icon name={icon} size={18} /></span>
                <span className="alert-row-label">
                  {label}
                  {needsAffiliate && notAffiliate ? <span className="muted small">Affiliate/Partner only</span> : null}
                </span>
              </button>
              <label className="switch" title={draft[type].enabled ? 'On' : 'Off'}>
                <input type="checkbox" checked={draft[type].enabled} onChange={(e) => update(type, { enabled: e.target.checked })} />
                <span className="switch-track" aria-hidden="true" />
                <span className="sr-only">{label} alerts {draft[type].enabled ? 'on' : 'off'}</span>
              </label>
            </div>
          ))}
        </nav>

        <section className="card editor" aria-label="Edit alert">
          <div className="field">
            <label htmlFor="alert-message">Message</label>
            <input
              id="alert-message"
              ref={messageRef}
              className={`input ${errors.message ? 'has-error' : ''}`}
              value={entry.message}
              maxLength={LIMITS.messageMax + 20}
              onChange={(e) => update(selected, { message: e.target.value })}
            />
            <div className="field-foot">
              <div className="chips">
                {PLACEHOLDERS.map((p) => <button key={p} type="button" className="chip" onClick={() => insert(p)}>{p}</button>)}
              </div>
              <span className={`muted small ${entry.message.length > LIMITS.messageMax ? 'text-danger' : ''}`}>{entry.message.length}/{LIMITS.messageMax}</span>
            </div>
            {errors.message ? <p className="field-error">{errors.message}</p> : null}
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="alert-duration">Show for <strong>{entry.durationSec}s</strong></label>
              <input
                id="alert-duration"
                type="range"
                min={LIMITS.durationMin}
                max={LIMITS.durationMax}
                value={entry.durationSec}
                onChange={(e) => update(selected, { durationSec: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <span className="label">Sound</span>
              <button type="button" className={`btn btn-ghost ${entry.sound ? 'is-on' : ''}`} onClick={() => update(selected, { sound: !entry.sound })} aria-pressed={entry.sound}>
                <Icon name={entry.sound ? 'sound' : 'mute'} size={18} />{entry.sound ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          <div className="stage" aria-label="Preview">
            <span className="stage-label">Preview · your stream</span>
            <div className="stage-slot">
              {preview ? <AlertCard key={preview.event.id} event={preview.event} settings={preview.settings} phase={preview.phase} style={style} /> : null}
            </div>
          </div>

          <div className="editor-actions">
            <button type="button" className="btn btn-ghost" onClick={() => playPreview()}><Icon name="play" size={18} />Play preview</button>
            <button type="button" className="btn btn-ghost" onClick={sendTest}><Icon name="send" size={18} />Send test to overlay</button>
          </div>
          <p className="muted small">Settings are saved in this browser for now. They'll sync to your OBS overlay automatically once the live connection is added.</p>
        </section>
      </div>
    </div>
  );
}