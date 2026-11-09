// integration tests: the real Express app with cookies, Twitch calls mocked.
jest.mock('axios');

const request = require('supertest');
const axios = require('axios');
const app = require('../app');
const userStore = require('../store/userStore');

const FRONTEND = 'http://localhost:5173';

const mockTwitch = (id = '7', name = 'Flow') => {
  axios.post.mockResolvedValue({ data: { access_token: 'a', refresh_token: 'r', expires_in: 14400, scope: [] } });
  axios.get.mockResolvedValue({
    data: { data: [{ id, login: name.toLowerCase(), display_name: name, profile_image_url: 'https://img/p.png', broadcaster_type: '' }] }
  });
};

// runs the whole login flow on an agent 
const loginAs = async (agent) => {
  const start = await agent.get('/auth/login');
  const state = new URL(start.headers.location).searchParams.get('state');
  return agent.get(`/auth/callback?code=xyz&state=${state}`);
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test('GET /auth/login redirects (302) to Twitch and sets the state cookie', async () => {
  const res = await request(app).get('/auth/login');
  expect(res.status).toBe(302);
  expect(res.headers.location).toMatch(/^https:\/\/id\.twitch\.tv\/oauth2\/authorize\?/);
  expect(res.headers['set-cookie'].join(';')).toMatch(/oauth_state=.*HttpOnly/);
});

test('callback with a forged state goes back to login', async () => {
  const res = await request(app).get('/auth/callback?code=xyz&state=forged');
  expect(res.status).toBe(302);
  expect(res.headers.location).toBe(`${FRONTEND}/login?reason=state`);
});

test('protected routes return 401 without a session cookie (SRS 4.1)', async () => {
  for (const [method, path] of [['get', '/api/me'], ['get', '/api/overlay'], ['post', '/api/overlay/regenerate']]) {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'SESSION_EXPIRED', message: 'Please log in with Twitch to continue.' });
  }
});

test('a made-up or tampered cookie is rejected', async () => {
  const res = await request(app).get('/api/me').set('Cookie', 'sid=s%3Afake.signature');
  expect(res.status).toBe(401);
});

test('full flow: login -> me -> overlay -> regenerate -> logout -> 401', async () => {
  mockTwitch();
  const agent = request.agent(app);

  const cb = await loginAs(agent);
  expect(cb.status).toBe(302);
  expect(cb.headers.location).toBe(`${FRONTEND}/dashboard`);
  expect(cb.headers['set-cookie'].join(';')).toMatch(/sid=.*HttpOnly/);

  const me = await agent.get('/api/me');
  expect(me.status).toBe(200);
  expect(me.body).toEqual({ broadcasterId: '7', login: 'flow', displayName: 'Flow', profileImageUrl: 'https://img/p.png', broadcasterType: '' });
  expect(JSON.stringify(me.body)).not.toMatch(/"a"|"r"|token/i); // no tokens reach the browser

  const old = await agent.get('/api/overlay');
  expect(old.body.overlayToken).toMatch(/^[0-9a-f]{32}$/);

  const regen = await agent.post('/api/overlay/regenerate');
  expect(regen.body.overlayToken).toMatch(/^[0-9a-f]{32}$/);
  expect(regen.body.overlayToken).not.toBe(old.body.overlayToken);
  expect(userStore.findByOverlayToken(old.body.overlayToken)).toBeNull(); // old url is dead (SRS 3.5.4)

  expect((await agent.post('/auth/logout')).status).toBe(200);
  expect((await agent.get('/api/me')).status).toBe(401);
});

test('revoked Twitch access ends the session with a plain message (SRS 3.1.7)', async () => {
  mockTwitch('8', 'Revoked');
  const agent = request.agent(app);
  await loginAs(agent);

  // token is about to expire and twitch refuses the refresh
  userStore.get('8').tokens.expiresAt = Date.now() - 1000;
  axios.post.mockRejectedValue({ response: { status: 400, data: { message: 'Invalid refresh token' } } });

  const res = await agent.get('/api/me');
  expect(res.status).toBe(401);
  expect(res.body.error).toBe('REAUTH_REQUIRED');
  expect(res.body.message).toBe('Your Twitch session ended or access was removed. Please log in again.');

  const after = await agent.get('/api/me');
  expect(after.body.error).toBe('SESSION_EXPIRED');
});

test('Twitch being down returns 503 with a friendly message', async () => {
  mockTwitch('9', 'Down');
  const agent = request.agent(app);
  await loginAs(agent);
  axios.get.mockRejectedValue({ isAxiosError: true, message: 'timeout' });

  const res = await agent.get('/api/me');
  expect(res.status).toBe(503);
  expect(res.body.message).toBe("Twitch isn't responding right now. Try again in a minute.");
});

test('old /api/user/profile path still works', async () => {
  mockTwitch('10', 'Alias');
  const agent = request.agent(app);
  await loginAs(agent);
  expect((await agent.get('/api/user/profile')).body.displayName).toBe('Alias');
});

test('unknown /api route returns a JSON 404', async () => {
  mockTwitch('11', 'Nf');
  const agent = request.agent(app);
  await loginAs(agent);
  const res = await agent.get('/api/nope');
  expect(res.status).toBe(404);
  expect(res.body.error).toBe('NOT_FOUND');
});

test('/health still answers without logging in', async () => {
  const res = await request(app).get('/health');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('healthy');
});

