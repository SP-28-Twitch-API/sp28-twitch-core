const crypto = require('crypto');
const env = require('../config/env');
const twitchConfig = require('../config/twitch');
const tokenManager = require('../services/tokenManager');
const twitchApi = require('../services/twitchApi');
const sessionStore = require('../services/sessionStore');
const userStore = require('../store/userStore');
const { SESSION_COOKIE, sessionCookieOptions } = require('../middleware/session');

const STATE_COOKIE = 'oauth_state';
const STATE_TTL_MS = 10 * 60 * 1000; // a login has 10 minutes to come back from twitch

const stateCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax', // lax b/c strict would drop it on the redirect back from twitch
  secure: env.isProd,
  signed: true,
  path: '/auth',
  maxAge: STATE_TTL_MS
});

// reason is state, denied, twitch (the login page turns it into a message)
const redirectToLogin = (res, reason) =>
  res.redirect(`${env.frontendUrl}/login?reason=${encodeURIComponent(reason)}`);

// constant-time compare so the check doesn't leak anything through timing
const sameState = (a, b) =>
  typeof a === 'string' && typeof b === 'string' && a.length === b.length &&
  crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

// redirect streamer to the twitch consent screen with a fresh state value (srs 3.1.6)
exports.login = (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE, state, stateCookieOptions());

  const params = new URLSearchParams({
    client_id: twitchConfig.clientId,
    redirect_uri: twitchConfig.redirectUri,
    response_type: 'code',
    scope: twitchConfig.scopes,
    state,
    force_verify: 'true'
  });
  res.redirect(`https://id.twitch.tv/oauth2/authorize?${params.toString()}`);
};

// twitch sends the streamer back here with "?code=...&state=..."
exports.callback = async (req, res) => {
  const { code, state, error } = req.query;
  const expectedState = req.signedCookies && req.signedCookies[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE, { path: '/auth' }); // each state works once

  if (!sameState(state, expectedState)) return redirectToLogin(res, 'state');
  if (error) return redirectToLogin(res, error === 'access_denied' ? 'denied' : 'twitch');
  if (!code) return redirectToLogin(res, 'twitch');

  try {
    const tokens = await tokenManager.exchangeCode(code);
    const { id, ...profile } = await twitchApi.getUser(tokens.accessToken);
    userStore.upsert(id, { profile, tokens });

    // replace any older login in this browser
    const oldSid = req.signedCookies && req.signedCookies[SESSION_COOKIE];
    if (oldSid) sessionStore.destroy(oldSid);

    res.cookie(SESSION_COOKIE, sessionStore.create(id), sessionCookieOptions());
    res.redirect(`${env.frontendUrl}/dashboard`);
  } catch (err) {
    // details stay in the server log, the streamer just sees message
    console.error('[Auth] Login failed:', (err.response && err.response.data) || err.message);
    redirectToLogin(res, 'twitch');
  }
};

// ends this browser's login, tokens stay saved so the overlay keeps working (srs 3.1.5)
exports.logout = (req, res) => {
  const sid = req.signedCookies && req.signedCookies[SESSION_COOKIE];
  if (sid) sessionStore.destroy(sid);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ message: 'Logged out.' });
};