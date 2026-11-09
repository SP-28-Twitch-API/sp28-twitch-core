const tokenManager = require('../services/tokenManager');
const twitchApi = require('../services/twitchApi');
const userStore = require('../store/userStore');
const accountService = require('../services/accountService');
const { SESSION_COOKIE } = require('../middleware/session');

// only what the dashboard needs, never tokens
const publicProfile = (user) => ({
  broadcasterId: user.broadcasterId,
  login: user.profile.login,
  displayName: user.profile.displayName,
  profileImageUrl: user.profile.profileImageUrl,
  broadcasterType: user.profile.broadcasterType
});

// GET /api/me: fresh channel info from twitch (srs 3.2.1, 3.5.1)
exports.getMe = async (req, res) => {
  const id = req.user.broadcasterId;
  let profile;
  try {
    profile = await twitchApi.getUser(await tokenManager.getValidAccessToken(id));
  } catch (err) {
    if (!err.response || err.response.status !== 401) throw err;
    // token was revoked before it expired, try one forced refresh (sdd 5.1)
    profile = await twitchApi.getUser(await tokenManager.refreshAccessToken(id));
  }

  const { id: _ignored, ...fields } = profile;
  res.json(publicProfile(userStore.upsert(id, { profile: fields })));
};

// GET /api/overlay: the frontend builds the obs url from this (srs 3.3.2)
exports.getOverlay = (req, res) => {
  res.json({ overlayToken: req.user.overlayToken });
};

// POST /api/overlay/regenerate: the old url stops working right away (srs 3.5.2, 3.5.4)
exports.regenerateOverlay = (req, res) => {
  res.json({ overlayToken: userStore.regenerateOverlayToken(req.user.broadcasterId) });
};

// POST /api/account/disconnect (srs 3.5.1, 3.5.5)
exports.disconnect = async (req, res) => {
  await accountService.disconnect(req.user.broadcasterId);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ message: 'Your Twitch account was disconnected.' });
};

// DELETE /api/account (srs 3.5.6)
exports.deleteAccount = async (req, res) => {
  await accountService.deleteAccount(req.user.broadcasterId);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ message: 'All your StreamPulse data was deleted.' });
};