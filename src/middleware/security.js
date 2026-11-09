const crypto = require('crypto');
const helmet = require('helmet');
const env = require('../config/env');

// a fresh random value per page, only <script nonce="..."> tags with it may run
function cspNonce(req, res, next) {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
}

// security headers: no sniffing, no framing by other sites, a content security policy, ...
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      'script-src': ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
      'img-src': ["'self'", 'data:', 'https://static-cdn.jtvnw.net'], // twitch profile pictures
      // only force https once deployed, on http://localhost it would break every request
      'upgrade-insecure-requests': env.isProd ? [] : null
    }
  }
});

module.exports = { cspNonce, securityHeaders };