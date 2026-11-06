// Integration-style tests: real Express app + real routes, Twitch calls mocked.
jest.mock('axios');
jest.mock('../config/twitch', () => ({
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  redirectUri: 'http://localhost:3000/auth/callback',
  scopes: 'user:read:email'
}));

const express = require('express');
const request = require('supertest');
const axios = require('axios');
const authRoutes = require('../routes/authRoutes');

const app = express();
app.use(express.json());
app.use('/', authRoutes);

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test('GET /auth/login redirects (302) to Twitch', async () => {
  const res = await request(app).get('/auth/login');
  expect(res.status).toBe(302);
  expect(res.headers.location).toMatch(/^https:\/\/id\.twitch\.tv\/oauth2\/authorize\?/);
});

test('GET /auth/callback without a code returns 400', async () => {
  const res = await request(app).get('/auth/callback');
  expect(res.status).toBe(400);
});

test('full flow: callback -> profile -> regenerate -> logout -> profile fails', async () => {
  axios.post.mockResolvedValue({ data: { access_token: 'a', refresh_token: 'r', expires_in: 14400 } });
  axios.get.mockResolvedValue({ data: { data: [{ id: '7', display_name: 'Flow' }] } });

  const cb = await request(app).get('/auth/callback?code=xyz');
  expect(cb.status).toBe(200);
  expect(cb.text).toContain('Authentication Successful');

  const profile = await request(app).get('/api/user/profile');
  expect(profile.status).toBe(200);
  expect(profile.body.display_name).toBe('Flow');

  const regen = await request(app).post('/api/settings/overlay/regenerate');
  expect(regen.status).toBe(200);
  expect(regen.body.overlayToken).toMatch(/^[0-9a-f]{32}$/);

  const out = await request(app).post('/auth/logout');
  expect(out.status).toBe(200);

  const after = await request(app).get('/api/user/profile');
  expect(after.status).toBe(401);
});

// Known gaps from the Development Document - flip these to real tests as they get built
test.todo('protected routes return 401 without a session cookie (SRS 4.1)');
test.todo('POST /api/settings/disconnect revokes tokens with Twitch (SRS 3.5.5)');
