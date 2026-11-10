// make up believable follows, subs, cheers and chat for demo mode
const NAMES = ['PixelPanda', 'NightOwlGG', 'CaffeineQueen', 'BitBandit', 'HydroHomie', 'LoafOfBread', 'Zephyr_99', 'MossyRock',
  'TurboTaco', 'QuietStorm', 'GlitchGoblin', 'SunnySideUp', 'ByteSizedBen', 'LunaLux', 'CritKing', 'MapleSyrupMo'];
const COLORS = ['#ff7eb6', '#7ee0ff', '#b9a6ff', '#ffd166', '#06d6a0', '#ff9f43', '#9be15d', '#f78fb3'];
const CHAT = [
  'hey everyone, just got here',
  'hi! how is the stream going so far?',
  'good evening chat',
  'that was a really nice play',
  'how long have you been playing this game?',
  'what rank are you right now?',
  'the audio sounds great today',
  'is this your first time playing this level?',
  'nice, that worked out perfectly',
  'what time do you usually stream?',
  'love the new overlay',
  'that was close haha',
  'can you explain how that ability works?',
  'just finished work, perfect timing',
  'good luck on this next part',
  'are you doing a second run after this?',
  'I tried that strategy yesterday and it helped a lot',
  'thanks for the tips earlier',
  'what settings are you using?',
  'that boss took me forever too',
  'welcome back everyone',
  'gotta head out, have a good stream!',
  'watching while I study, have fun'
];
const REWARDS = [
  'Pick the next game',
  'Choose the next song',
  'Shoutout',
  'Ask me a question',
  'Try a new strategy',
  'Highlight my message'
];
const MESSAGES = [
  'Thanks for the stream, always a good time',
  'Been watching for a while, keep it up!',
  'Happy to support the channel',
  'Great run today',
  'Thanks for the help with that level last week',
  'Love the community here',
  'Here since the early days',
  'Keep up the good work',
  '',
  ''
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];
let counter = 0;
const id = () => `demo-${Date.now()}-${counter++}`;

export function demoEvent() {
  const roll = Math.random();
  const user = pick(NAMES);
  const base = { id: id(), ts: Date.now(), user };
  if (roll < 0.38) return { ...base, type: 'follow' };
  if (roll < 0.55) return { ...base, type: 'sub', tier: Math.random() < 0.85 ? 1 : Math.random() < 0.7 ? 2 : 3 };
  if (roll < 0.66) return { ...base, type: 'resub', tier: 1, months: 2 + Math.floor(Math.random() * 30), message: pick(MESSAGES) };
  if (roll < 0.74) return { ...base, type: 'gift', tier: 1, amount: pick([1, 1, 5, 5, 10, 20, 50]) };
  if (roll < 0.9) return { ...base, type: 'cheer', amount: pick([100, 100, 250, 500, 1000, 5000]), message: pick(MESSAGES) };
  return { ...base, type: 'redemption', reward: pick(REWARDS), message: '' };
}

export function demoChat() {
  const user = pick(NAMES);
  return { id: id(), ts: Date.now(), user, color: COLORS[user.length % COLORS.length], text: pick(CHAT) };
}