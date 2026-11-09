const axios = require('axios');
const twitchConfig = require('../config/twitch');
const userStore = require('../store/userStore');
const sessionStore = require('./sessionStore');
const { AppError } = require('../utils/errors');

const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const REVOKE_URL = 'https://id.twitch.tv/oauth2/revoke';
const REFRESH_MARGIN_MS = 5 * 60 * 1000; // refresh when under 5 minutes remain (sdd 5.1)

// twitch's token response --> what we save in the store
const toTokenRecord = (data) => ({
  accessToken: data.access_token,
  refreshToken: data.refresh_token,
  expiresAt: Date.now() + data.expires_in * 1000,
  scopes: Array.isArray(data.scope) ? data.scope : []
});

class TokenManager {
  constructor() {
    // broadcasterId -> refresh promise, so each streamer only ever has one refresh running
    this.refreshing = new Map();
  }

  // swap the code from "/auth/callback" for tokens
  // secret goes in the request body, never in the url
  async exchangeCode(code) {
    const { data } = await axios.post(TOKEN_URL, new URLSearchParams({
      client_id: twitchConfig.clientId,
      client_secret: twitchConfig.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: twitchConfig.redirectUri
    }));
    return toTokenRecord(data);
  }

  async getValidAccessToken(broadcasterId) {
    const user = userStore.get(broadcasterId);
    if (!user || !user.tokens) {
      throw new AppError('REAUTH_REQUIRED', `no stored tokens for ${broadcasterId}`);
    }
    if (Date.now() >= user.tokens.expiresAt - REFRESH_MARGIN_MS) {
      return this.refreshAccessToken(broadcasterId);
    }
    return user.tokens.accessToken;
  }

  refreshAccessToken(broadcasterId) {
    const id = String(broadcasterId);
    // reuse the refresh that's already running for this streamer
    if (this.refreshing.has(id)) return this.refreshing.get(id);

    const promise = this.runRefresh(id).finally(() => this.refreshing.delete(id));
    this.refreshing.set(id, promise);
    return promise;
  }

  async runRefresh(id) {
    const user = userStore.get(id);
    if (!user || !user.tokens || !user.tokens.refreshToken) {
      throw new AppError('REAUTH_REQUIRED', `no refresh token for ${id}`);
    }

    try {
      console.log(`[TokenManager] Refreshing token for ${user.profile.displayName || id}...`);
      const { data } = await axios.post(TOKEN_URL, new URLSearchParams({
        client_id: twitchConfig.clientId,
        client_secret: twitchConfig.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: user.tokens.refreshToken
      }));
      const tokens = toTokenRecord(data);
      userStore.setTokens(id, tokens); // twitch rotates the refresh token too, save both
      return tokens.accessToken;
    } catch (err) {
      const status = err.response && err.response.status;
      if (status === 400 || status === 401) {
        // refresh token revoked or expired: end the session (srs 3.1.7)
        this.endSession(id);
        throw new AppError('REAUTH_REQUIRED', err.response.data);
      }
      // network problem or twitch down: keep the tokens and try again later
      throw new AppError('TWITCH_UNAVAILABLE', (err.response && err.response.data) || err.message);
    }
  }
// wait for a refresh that's already running, so it can't save new tokens after a disconnect
  async waitForRefresh(broadcasterId) {
    const running = this.refreshing.get(String(broadcasterId));
    if (running) await running.catch(() => {});
  }

  // tell twitch to cancel this streamer's tokens (srs 3.5.5)
  // best effort: a token that's already dead makes twitch answer 400, that's fine
  async revokeTokens(broadcasterId) {
    const user = userStore.get(broadcasterId);
    const tokens = user && user.tokens;
    if (!tokens) return 0;

    const toRevoke = [tokens.accessToken, tokens.refreshToken].filter(Boolean);
    const results = await Promise.allSettled(toRevoke.map((token) =>
      axios.post(REVOKE_URL, new URLSearchParams({ client_id: twitchConfig.clientId, token }))
    ));

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length) {
      const reason = failed[0].reason;
      console.error(`[TokenManager] ${failed.length} token(s) not revoked:`, (reason.response && reason.response.data) || reason.message);
    }
    return toRevoke.length - failed.length;
  }
  // wipe tokens and log the streamer out of every browser, settings and overlay url stay
  endSession(broadcasterId) {
    userStore.clearTokens(broadcasterId);
    sessionStore.destroyAllForUser(broadcasterId);
  }
}

module.exports = new TokenManager();