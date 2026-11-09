// Rate limits and security headers (srs 4.1)
const express = require('express');
const request = require('supertest');
const app = require('../app');
const { createAuthLimiter, createApiLimiter } = require('../middleware/rateLimits');

describe('rate limits', () => {
  // small test apps with low limits, the real app uses AUTH_RATE_LIMIT / API_RATE_LIMIT
  const authApp = express();
  authApp.use('/auth', createAuthLimiter({ limit: 2 }));
  authApp.get('/auth/login', (req, res) => res.send('ok'));
  authApp.post('/auth/logout', (req, res) => res.send('ok'));

  test('login is blocked after the limit and the browser gets a friendly login page', async () => {
    const agent = request(authApp);
    expect((await agent.get('/auth/login')).status).toBe(200);
    expect((await agent.get('/auth/login')).status).toBe(200);
    const blocked = await agent.get('/auth/login');
    expect(blocked.status).toBe(302);
    expect(blocked.headers.location).toBe('http://localhost:5173/login?reason=busy');
  });

  test('non-GET requests get a JSON 429', async () => {
    const apiApp = express();
    apiApp.use('/api', createApiLimiter({ limit: 1 }));
    apiApp.post('/api/x', (req, res) => res.json({ ok: true }));

    await request(apiApp).post('/api/x');
    const res = await request(apiApp).post('/api/x');
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: 'RATE_LIMITED', message: 'Too many attempts. Please wait a minute and try again.' });
  });

  test('responses carry the standard RateLimit headers', async () => {
    const res = await request(app).get('/auth/login');
    expect(res.headers.ratelimit).toBeDefined();
  });
});

describe('security headers', () => {
  test('helmet headers are on every response', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['content-security-policy']).toMatch(/default-src 'self'/);
  });

  test('pages only run scripts carrying this response\'s nonce', async () => {
    const res = await request(app).get('/login');
    const nonce = res.headers['content-security-policy'].match(/'nonce-([^']+)'/)[1];
    expect(res.text).toContain(`<script nonce="${nonce}">`);

    const again = await request(app).get('/login');
    expect(again.headers['content-security-policy']).not.toContain(nonce); // new nonce every time
  });

  test('twitch profile pictures are allowed, https upgrade is off on localhost', async () => {
    const csp = (await request(app).get('/health')).headers['content-security-policy'];
    expect(csp).toContain('https://static-cdn.jtvnw.net');
    expect(csp).not.toContain('upgrade-insecure-requests');
  });
});