const axios = require('axios');
const crypto = require('crypto');
const twitchConfig = require('../config/twitch');

class TokenManager {
constructor() {
// in-memory session store
this.session = {
accessToken: null,
refreshToken: null,
expiresAt: null,
broadcasterId: null,
displayName: null,
overlayToken: null
};
// flag that prevents spamming refresh requests
this.isRefreshing = false;
this.refreshPromise = null;
}

setSession(tokenData, broadcasterData) {
this.session.accessToken = tokenData.access_token;
this.session.refreshToken = tokenData.refresh_token;
// convert expires_in (seconds) to absolute timestamp in ms
this.session.expiresAt = Date.now() + tokenData.expires_in * 1000;

if (broadcasterData) {
this.session.broadcasterId = broadcasterData.id;
this.session.displayName = broadcasterData.display_name;
}

if (!this.session.overlayToken) {
this.regenerateOverlayToken();
}
}

regenerateOverlayToken() {
// unguessable token for obs browser source
this.session.overlayToken = crypto.randomBytes(16).toString('hex');
return this.session.overlayToken;
}

async getValidAccessToken() {
if (!this.session.accessToken || !this.session.refreshToken) {
throw new Error('No active session found. Broadcaster must log in via /auth/login.');
}

// refresh if less than 5 minutes remain on the token
const fiveMinutes = 5 * 60 * 1000;
if (Date.now() >= this.session.expiresAt - fiveMinutes) {
return await this.refreshAccessToken();
}

return this.session.accessToken;
}

async refreshAccessToken() {
    // reuse promise if a refresh is already running
if (this.isRefreshing) {
return await this.refreshPromise;
}


this.isRefreshing = true;
this.refreshPromise = (async () => {
try {
console.log('[TokenManager] Cycling refresh token with Twitch ID server...');
const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
params: {
client_id: twitchConfig.clientId,
client_secret: twitchConfig.clientSecret,
grant_type: 'refresh_token',
refresh_token: this.session.refreshToken
}
});
// update stored tokens with new credetnials
this.session.accessToken = response.data.access_token;
this.session.refreshToken = response.data.refresh_token;
this.session.expiresAt = Date.now() + response.data.expires_in * 1000;
console.log('[TokenManager] Token refresh successful.');

return this.session.accessToken;
} catch (error) {
console.error('[TokenManager] Token refresh failed:', error.response?.data || error.message);
throw new Error('Failed to refresh Twitch token. Re-authentication required.');
} finally {
// reset lock when done
this.isRefreshing = false;
this.refreshPromise = null;
}
})();

return await this.refreshPromise;
}

getSession() {
return this.session;
}

clearSession() {
// wipe memory on logout
this.session = {
accessToken: null,
refreshToken: null,
expiresAt: null,
broadcasterId: null,
displayName: null,
overlayToken: null
};
}
}

module.exports = new TokenManager();