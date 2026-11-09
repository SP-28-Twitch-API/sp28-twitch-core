const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { ERRORS } = require('../utils/errors');

const MINUTE = 60 * 1000;

const tooMany = (res) =>
  res.status(429).json({ error: 'RATE_LIMITED', message: ERRORS.RATE_LIMITED.message });

// login and callback: 10 per minute per ip by default (srs 4.1)
function createAuthLimiter({ limit = env.authRateLimit, windowMs = MINUTE } = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
      // a browser clicking login gets the login page with a message, anything else gets json
      if (req.method === 'GET') return res.redirect(`${env.frontendUrl}/login?reason=busy`);
      tooMany(res);
    }
  });
}

// every /api call: 120 per minute per ip by default, enough time for one dashboard
function createApiLimiter({ limit = env.apiRateLimit, windowMs = MINUTE } = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => tooMany(res)
  });
}

module.exports = { createAuthLimiter, createApiLimiter };