import { STREAM_STYLES, useStreamStyle } from '../lib/streamStyles';
import Icon from './Icon';

// pick your stream style grid on the settings page
export default function StylePicker() {
  const { style, setStyle } = useStreamStyle();
  return (
    <div className="style-grid" role="radiogroup" aria-label="Stream style">
      {STREAM_STYLES.map((s) => {
        const active = s.id === style;
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={active}
            className={`style-card ${active ? 'is-active' : ''}`}
            onClick={() => setStyle(s.id)}
          >
            <span className="style-preview" data-style={s.id} aria-hidden="true">
              <span className="sp-bar" />
              <span className="sp-row"><span className="sp-dot" /><span className="sp-line" /></span>
              <span className="sp-row"><span className="sp-line short" /></span>
              <span className="sp-chip">+1 follower</span>
            </span>
            <span className="style-meta">
              <span className="style-name">{s.name}{active ? <Icon name="check" size={16} className="style-check" /> : null}</span>
              <span className="style-vibe">{s.vibe}</span>
              <span className="style-desc">{s.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// small dropdown in the top bar
export function StyleQuickSwitch() {
  const { style, setStyle } = useStreamStyle();
  return (
    <label className="style-switch">
      <Icon name="palette" size={18} />
      <span className="sr-only">Stream style</span>
      <select value={style} onChange={(e) => setStyle(e.target.value)}>
        {STREAM_STYLES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </label>
  );
}