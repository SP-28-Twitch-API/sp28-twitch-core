// alert types, their defaults, and how alert text is built

export const ALERT_TYPES = [
  { type: 'follow', label: 'Follows', icon: 'follow', needsAffiliate: false },
  { type: 'sub', label: 'Subscriptions', icon: 'sub', needsAffiliate: true },
  { type: 'resub', label: 'Resubs', icon: 'resub', needsAffiliate: true },
  { type: 'gift', label: 'Gift subs', icon: 'gift', needsAffiliate: true },
  { type: 'cheer', label: 'Cheers (Bits)', icon: 'cheer', needsAffiliate: true },
  { type: 'redemption', label: 'Channel points', icon: 'redemption', needsAffiliate: true }
];

export const DEFAULT_SETTINGS = {
  follow: { enabled: true, message: '{user} just followed!', durationSec: 5, sound: true },
  sub: { enabled: true, message: '{user} subscribed at {tier}!', durationSec: 7, sound: true },
  resub: { enabled: true, message: '{user} resubscribed for {months} months!', durationSec: 7, sound: true },
  gift: { enabled: true, message: '{user} gifted {amount} subs!', durationSec: 8, sound: true },
  cheer: { enabled: true, message: '{user} cheered {amount} Bits!', durationSec: 6, sound: true },
  redemption: { enabled: true, message: '{user} redeemed {reward}', durationSec: 5, sound: false }
};

export const PLACEHOLDERS = ['{user}', '{amount}', '{tier}', '{months}', '{reward}'];
export const LIMITS = { messageMax: 200, durationMin: 2, durationMax: 15 };

const KEY = 'sp28.alertSettings';

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    const merged = {};
    for (const { type } of ALERT_TYPES) merged[type] = { ...DEFAULT_SETTINGS[type], ...(saved[type] || {}) };
    return merged;
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(settings) {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* storage blocked, keep in memory */ }
}

export function validate(entry) {
  const errors = {};
  const text = (entry.message || '').trim();
  if (!text) errors.message = "Message can't be empty.";
  else if (text.length > LIMITS.messageMax) errors.message = `Keep it under ${LIMITS.messageMax} characters.`;
  if (!(entry.durationSec >= LIMITS.durationMin && entry.durationSec <= LIMITS.durationMax)) {
    errors.durationSec = `Pick ${LIMITS.durationMin} to ${LIMITS.durationMax} seconds.`;
  }
  return errors;
}

const tierLabel = (tier) => (tier ? `Tier ${tier}` : 'Tier 1');

// "{user} cheered {amount} Bits!" -> "BestUser" cheered 500 Bits!" (plain text, react escapes it)
export function fillTemplate(template, event) {
  const values = {
    user: event.user || 'Someone',
    amount: event.amount != null ? Number(event.amount).toLocaleString() : '',
    tier: tierLabel(event.tier),
    months: event.months != null ? String(event.months) : '',
    reward: event.reward || 'a reward'
  };
  return template.replace(/\{(user|amount|tier|months|reward)\}/g, (_, key) => values[key]);
}

// bigger cheers and gift bombs get bigger alerts: 0 normal, 1 big, 2 huge
export function intensityOf(event) {
  if (event.type === 'cheer') return event.amount >= 1000 ? 2 : event.amount >= 100 ? 1 : 0;
  if (event.type === 'gift') return event.amount >= 20 ? 2 : event.amount >= 5 ? 1 : 0;
  if (event.type === 'sub' || event.type === 'resub') return event.tier >= 3 ? 2 : event.tier === 2 ? 1 : 0;
  return 0;
}

// sample events for previews and test alerts
export const SAMPLE_EVENTS = {
  follow: { type: 'follow', user: 'PixelPanda' },
  sub: { type: 'sub', user: 'NightOwlGG', tier: 1 },
  resub: { type: 'resub', user: 'CaffeineQueen', tier: 1, months: 14, message: 'Still here, still vibing!' },
  gift: { type: 'gift', user: 'GenerousGhost', amount: 5, tier: 1 },
  cheer: { type: 'cheer', user: 'BitBandit', amount: 500, message: 'GG that clutch was insane' },
  redemption: { type: 'redemption', user: 'HydroHomie', reward: 'Hydrate!', message: 'drink water chat' }
};

export const sampleEvent = (type) => ({
  id: `test-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  ts: Date.now(),
  test: true,
  ...SAMPLE_EVENTS[type]
});