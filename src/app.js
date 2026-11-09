// load and check .env before anything else
const env = require('./config/env');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');
const devRoutes = require('./routes/devRoutes');
const errorHandler = require('./middleware/errorHandler');
const { cspNonce, securityHeaders } = require('./middleware/security');
const { createAuthLimiter, createApiLimiter } = require('./middleware/rateLimits');
const userStore = require('./store/userStore');

// the express app without listen(), so tests can use it directly
const app = express();
app.disable('x-powered-by');

// security headers on every response (srs 4.1)
app.use(cspNonce);
app.use(securityHeaders);

// only our own frontend may call the api with cookies
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser(env.sessionSecret)); // the secret signs the login cookies

app.use('/auth', createAuthLimiter());
app.use(authRoutes);
app.use('/api', createApiLimiter(), apiRoutes);

// sanity check route
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), streamers: userStore.list().length });
});

if (!env.isProd) app.use(devRoutes);

app.use(errorHandler);

module.exports = app;