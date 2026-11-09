const env = require('../config/env');
const sessionStore = require('../services/sessionStore');
const userStore = require('../store/userStore');
const { AppError } = require('../utils/errors');

const SESSION_COOKIE = 'sid';

// httpOnly: page scripts can't read it, sameSite lax: other sites can't send it with a POST,
// secure: https only once deployed (srs 4.1)
const sessionCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: env.isProd,
  signed: true,
  path: '/',
  maxAge: sessionStore.SESSION_TTL_MS
});

// guards every /api route: puts the stored streamer on req.user or answers 401
function requireSession(req, res, next) {
  const sid = req.signedCookies && req.signedCookies[SESSION_COOKIE];
  const session = sid ? sessionStore.get(sid) : null;
  const user = session ? userStore.get(session.broadcasterId) : null;

  if (!user || !user.tokens) {
    if (sid) sessionStore.destroy(sid);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return next(new AppError(session ? 'REAUTH_REQUIRED' : 'SESSION_EXPIRED'));
  }

  // push the cookie expiry forward along with the server-side session
  res.cookie(SESSION_COOKIE, sid, sessionCookieOptions());
  req.sessionId = sid;
  req.user = user;
  next();
}

module.exports = { SESSION_COOKIE, sessionCookieOptions, requireSession };