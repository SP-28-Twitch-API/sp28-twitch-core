import Icon from './Icon';
import { fillTemplate, intensityOf } from '../lib/alertSettings';

const TITLES = { follow: 'New follower', sub: 'New subscriber', resub: 'Resub', gift: 'Gift subs', cheer: 'Cheer', redemption: 'Channel points' };

// one alert, used both on the obs overlay and in the dashboard preview so they always match
//'in' while showing, 'out' while leaving
// animation for each style is in styles/alerts.css
export default function AlertCard({ event, settings, phase = 'in', style }) {
  const intensity = intensityOf(event);
  const text = fillTemplate(settings.message, event);
  return (
    <div
      className={`alert-card alert-${event.type} intensity-${intensity} phase-${phase}`}
      data-style={style}
      role="status"
      style={{ '--alert-ms': `${settings.durationSec * 1000}ms` }}
    >
      <svg className="alert-beat" viewBox="0 0 300 40" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 22h95l12-16 16 30 14-22 10 8h153" />
      </svg>
      <div className="alert-icon"><Icon name={event.type} size={30} strokeWidth={2} /></div>
      <div className="alert-body">
        <div className="alert-kicker">{TITLES[event.type] || 'Alert'}</div>
        <div className="alert-text">{text}</div>
        {event.message ? <div className="alert-message">“{event.message}”</div> : null}
      </div>
      <div className="alert-timer" aria-hidden="true" />
    </div>
  );
}