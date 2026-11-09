const crypto = require('crypto');
const env = require('../config/env');
const Vault = require('./vault');

const SAVE_DELAY_MS = 250;

class UserStore {
constructor(vault) {
this.vault = vault;
this.users = new Map(); // broadcasterId -> user record
this.overlayIndex = new Map(); // overlayToken -> broadcasterId
this.saveTimer = null;
this.load();
}

load() {
const data = this.vault.load();
for (const [id, user] of Object.entries(data.users)) {
this.users.set(id, user);
if (user.overlayToken) this.overlayIndex.set(user.overlayToken, id);
}
console.log(`[UserStore] Loaded ${this.users.size} streamer(s) from encrypted store.`);
}

// batch rapid writes (like several token refreshes) into one disk write
persist() {
if (this.saveTimer) return;
this.saveTimer = setTimeout(() => {
this.saveTimer = null;
this.flush();
}, SAVE_DELAY_MS);
this.saveTimer.unref();
}

// write immediately, used on shutdown
flush() {
if (this.saveTimer) {
clearTimeout(this.saveTimer);
this.saveTimer = null;
}
this.vault.save({ version: 1, users: Object.fromEntries(this.users) });
}

get(broadcasterId) {
return this.users.get(String(broadcasterId)) || null;
}

list() {
return [...this.users.values()];
}

// create the user on first login, otherwise merge the new fields in
upsert(broadcasterId, { profile, tokens, settings } = {}) {
const id = String(broadcasterId);
const now = new Date().toISOString();
const existing = this.users.get(id);
const user = existing || {
broadcasterId: id,
profile: {},
tokens: null,
overlayToken: null,
settings: null,
createdAt: now
};

if (profile) user.profile = { ...user.profile, ...profile };
if (tokens) user.tokens = { ...user.tokens, ...tokens };
if (settings) user.settings = settings;
user.updatedAt = now;

this.users.set(id, user);
// only make an overlay token the first time so existing obs sources keep working
if (!user.overlayToken) this.regenerateOverlayToken(id);
this.persist();
return user;
}

setTokens(broadcasterId, tokens) {
const user = this.get(broadcasterId);
if (!user) throw new Error(`No stored user ${broadcasterId}`);
user.tokens = tokens;
user.updatedAt = new Date().toISOString();
this.persist();
return user;
}

// keeps settings + overlay token, used when a refresh fails or on disconnect
clearTokens(broadcasterId) {
const user = this.get(broadcasterId);
if (!user) return;
user.tokens = null;
user.updatedAt = new Date().toISOString();
this.persist();
}

regenerateOverlayToken(broadcasterId) {
const user = this.get(broadcasterId);
if (!user) throw new Error(`No stored user ${broadcasterId}`);
if (user.overlayToken) this.overlayIndex.delete(user.overlayToken); // old url stops working right away
user.overlayToken = crypto.randomBytes(16).toString('hex'); // 128 bits
this.overlayIndex.set(user.overlayToken, user.broadcasterId);
this.persist();
return user.overlayToken;
}

findByOverlayToken(token) {
if (typeof token !== 'string' || !/^[a-f0-9]{32}$/.test(token)) return null;
const id = this.overlayIndex.get(token);
return id ? this.get(id) : null;
}

// deletes everything we hold for this streamer (srs 3.5.6)
delete(broadcasterId) {
const user = this.get(broadcasterId);
if (!user) return false;
if (user.overlayToken) this.overlayIndex.delete(user.overlayToken);
this.users.delete(user.broadcasterId);
this.persist();
return true;
}
}

module.exports = new UserStore(new Vault(env.dataFile, env.dataKey));