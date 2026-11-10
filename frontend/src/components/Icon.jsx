// currently line drawings --> no icon library or licensing to worry about
// FORMAT TO ADD PRE-MADE ICONS: add a name here with its svg shapes, then use <Icon name="your-name" />
const PATHS = {
  dashboard: <><rect x="3" y="3" width="7.5" height="9" rx="2" /><rect x="13.5" y="3" width="7.5" height="5" rx="2" /><rect x="13.5" y="11" width="7.5" height="10" rx="2" /><rect x="3" y="15" width="7.5" height="6" rx="2" /></>,
  alerts: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>,
  setup: <><rect x="2.5" y="4" width="19" height="13" rx="2" /><path d="M8 21h8M12 17v4" /><path d="m9.5 9.5 2 2 3.5-3.5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M4.2 6.2l2.1 2.1M17.7 15.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 17.8l2.1-2.1M17.7 8.3l2.1-2.1" /></>,
  follow: <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />,
  sub: <path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" />,
  resub: <><path d="m12 5 1.9 4 4.4.5-3.3 3 .9 4.4L12 14.8 8.1 16.9 9 12.5l-3.3-3 4.4-.5z" /><path d="M3 12a9 9 0 0 0 15.4 6.4M21 12A9 9 0 0 0 5.6 5.6" /></>,
  gift: <><rect x="3.5" y="9" width="17" height="11.5" rx="1.5" /><path d="M2.5 9h19v-3h-19zM12 6v14.5" /><path d="M12 6c-1.5-3-5-3.2-5-1.2S10 6 12 6zM12 6c1.5-3 5-3.2 5-1.2S14 6 12 6z" /></>,
  cheer: <><path d="M12 2.5 20 9l-8 12.5L4 9z" /><path d="M4 9h16M9 9l3 12.5L15 9M9 9l3-6.5L15 9" /></>,
  redemption: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v9M8.5 10.5c0-1.5 1.5-2.5 3.5-2.5s3.5 1 3.5 2.3c0 3-7 1.7-7 4.6 0 1.4 1.5 2.4 3.5 2.4s3.5-1 3.5-2.5" /></>,
  chat: <path d="M4 5.5h16v10H9l-5 4z" />,
  viewers: <><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  followers: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.8 6.5-5.8s5.9 2.2 6.5 5.8" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.6c2 .7 3.2 2.6 3.5 5.4" /></>,
  copy: <><rect x="8.5" y="8.5" width="12" height="12" rx="2" /><path d="M15.5 8.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v9A1.5 1.5 0 0 0 5 15.5h3.5" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" /><path d="M4 3.5V8h4.5" /><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" /><path d="M20 20.5V16h-4.5" /></>,
  logout: <><path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" /><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15" /></>,
  unlink: <><path d="M9.5 14.5 7 17a3.5 3.5 0 0 1-5-5l2.5-2.5M14.5 9.5 17 7a3.5 3.5 0 0 1 5 5l-2.5 2.5" /><path d="M3 3l18 18" /></>,
  trash: <><path d="M4 6.5h16M9.5 6.5V4h5v2.5M6 6.5l1 13.5h10l1-13.5" /><path d="M10 10.5v6M14 10.5v6" /></>,
  play: <path d="M7 4.5v15l12-7.5z" />,
  send: <><path d="M21 3 3 10.5l7 3 3 7z" /><path d="m10 13.5 4.5-4.5" /></>,
  sound: <><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></>,
  mute: <><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="m16 9.5 5 5M21 9.5l-5 5" /></>,
  check: <path d="m4.5 12.5 4.5 4.5 10.5-10.5" />,
  warning: <><path d="M12 3.5 22 20.5H2z" /><path d="M12 10v4.5M12 17.5v.01" /></>,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" /></>,
  eye: <><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 5.6A10 10 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3.1 3.9M6.6 6.6C3.7 8.4 2 12 2 12s3.6 6.5 10 6.5a9.7 9.7 0 0 0 4.4-1" /></>,
  broadcast: <><circle cx="12" cy="12" r="2" /><path d="M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7M5.6 18.4a9 9 0 0 1 0-12.8M18.4 5.6a9 9 0 0 1 0 12.8" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-1.5-1.2-1.7-1.2-3 0-1.1.9-2 2-2H17a4 4 0 0 0 4-4c0-4-4-7-9-7z" /><circle cx="7.5" cy="11" r="1.2" /><circle cx="10" cy="7" r="1.2" /><circle cx="15" cy="7.5" r="1.2" /></>,
  pulse: <path d="M2 12h4.5l2.5-6 4 12 3-8 1.5 2H22" />
};

export default function Icon({ name, size = 20, className = '', strokeWidth = 1.8, title }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {PATHS[name] || PATHS.pulse}
    </svg>
  );
}

// the streampulse mark: a heartbeat line inside a rounded square
export function PulseMark({ size = 32 }) {
  return (
    <svg className="pulse-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <path className="pulse-mark-line" d="M5 17h6l3-7 4 13 3-9 2 3h4" fill="none" stroke="var(--accent-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}