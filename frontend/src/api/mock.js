// mock backend for demos and design work
// same methods as the real one, no twitch needed
const randomHex = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));

const state = {
  me: {
    broadcasterId: '41207388',
    login: 'demo_streamer',
    displayName: 'DemoStreamer',
    profileImageUrl: null,
    broadcasterType: 'affiliate'
  },
  overlayToken: randomHex(16),
  stats: {
    followers: 1284,
    subscribers: 87,
    bitsTotal: 15230,
    isLive: true,
    viewerCount: 142,
    startedAt: new Date(Date.now() - (83 * 60 + 12) * 1000).toISOString(),
    unavailable: {}
  }
};

export const mockApi = {
  mode: 'demo',
  loginUrl: '/dashboard',
  getMe: async () => { await wait(); return { ...state.me }; },
  getOverlay: async () => ({ overlayToken: state.overlayToken }),
  regenerateOverlay: async () => { await wait(); state.overlayToken = randomHex(16); return { overlayToken: state.overlayToken }; },
  logout: async () => ({ message: 'Logged out.' }),
  disconnect: async () => { await wait(400); return { message: 'Your Twitch account was disconnected.' }; },
  deleteAccount: async () => { await wait(400); return { message: 'All your StreamPulse data was deleted.' }; },
  getStats: async () => {
    // small random drift so the demo is realistic
    const s = state.stats;
    s.viewerCount = Math.max(20, s.viewerCount + Math.round((Math.random() - 0.45) * 6));
    return { ...s };
  },
  // demo feed calls this so the numbers follow the fake events
  bump: (event) => {
    if (event.type === 'follow') state.stats.followers += 1;
    if (event.type === 'sub' || event.type === 'resub') state.stats.subscribers += 1;
    if (event.type === 'gift') state.stats.subscribers += event.amount || 1;
    if (event.type === 'cheer') state.stats.bitsTotal += event.amount || 0;
  }
};