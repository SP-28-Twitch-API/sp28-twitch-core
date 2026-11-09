// Disconnect and delete (SRS 3.5.1, 3.5.5, 3.5.6), real Express app, Twitch calls mocked.
jest.mock('axios');

const request = require('supertest');
const axios = require('axios');
const app = require('../app');
const userStore = require('../store/userStore');
const accountEvents = require('../services/accountEvents');

const REVOKE_URL = 'https://id.twitch.tv/oauth2/revoke';

// log a streamer in on an agent (a browser with a cookie jar)
const loginAs = async (id) => {
  axios.post.mockResolvedValue({ data: { access_token: `a${id}`, refresh_token: `r${id}`, expires_in: 14400, scope: [] } });
  axios.get.mockResolvedValue({
    data: { data: [{ id, login: `s${id}`, display_name: `S${id}`, profile_image_url: 'https://img/p.png', broadcaster_type: '' }] }
  });
  const agent = request.agent(app);
  const start = await agent.get('/auth/login');
  const state = new URL(start.headers.location).searchParams.get('state');
  await agent.get(`/auth/callback?code=xyz&state=${state}`);
  axios.post.mockReset();
  return agent;
};

const revokeCalls = () => axios.post.mock.calls.filter(([url]) => url === REVOKE_URL);

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
  accountEvents.removeAllListeners();
});

describe('POST /api/account/disconnect', () => {
  test('revokes both tokens with Twitch, deletes them and logs out', async () => {
    const agent = await loginAs('100');
    const overlay = userStore.get('100').overlayToken;
    axios.post.mockResolvedValue({ data: {} });

    const res = await agent.post('/api/account/disconnect');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Your Twitch account was disconnected.');
    const revoked = revokeCalls().map(([, body]) => Object.fromEntries(body));
    expect(revoked).toEqual([
      { client_id: 'test-client-id', token: 'a100' },
      { client_id: 'test-client-id', token: 'r100' }
    ]);
    expect(userStore.get('100').tokens).toBeNull();
    expect(userStore.get('100').overlayToken).toBe(overlay); // settings + overlay url kept for next login
    expect((await agent.get('/api/me')).status).toBe(401);
  });

  test('still disconnects when Twitch rejects the revoke (token already dead)', async () => {
    const agent = await loginAs('101');
    axios.post.mockRejectedValue({ response: { status: 400, data: { message: 'Invalid token' } } });

    const res = await agent.post('/api/account/disconnect');

    expect(res.status).toBe(200);
    expect(userStore.get('101').tokens).toBeNull();
  });

  test('tells the rest of the backend to stop listening for that channel', async () => {
    const agent = await loginAs('102');
    axios.post.mockResolvedValue({ data: {} });
    const heard = jest.fn();
    accountEvents.on('disconnected', heard);

    await agent.post('/api/account/disconnect');
    expect(heard).toHaveBeenCalledWith('102');
  });

  test('logs the streamer out of every browser', async () => {
    const first = await loginAs('103');
    const second = await loginAs('103');
    axios.post.mockResolvedValue({ data: {} });

    await first.post('/api/account/disconnect');
    expect((await second.get('/api/overlay')).status).toBe(401);
  });

  test('the SDD path /api/settings/disconnect works too', async () => {
    const agent = await loginAs('104');
    axios.post.mockResolvedValue({ data: {} });
    expect((await agent.post('/api/settings/disconnect')).status).toBe(200);
  });

  test('needs a login', async () => {
    expect((await request(app).post('/api/account/disconnect')).status).toBe(401);
  });
});

describe('DELETE /api/account', () => {
  test('revokes tokens and removes every stored record, old overlay url stops working', async () => {
    const agent = await loginAs('200');
    const overlay = userStore.get('200').overlayToken;
    axios.post.mockResolvedValue({ data: {} });
    const deleted = jest.fn();
    accountEvents.on('deleted', deleted);

    const res = await agent.delete('/api/account');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('All your StreamPulse data was deleted.');
    expect(revokeCalls()).toHaveLength(2);
    expect(userStore.get('200')).toBeNull();
    expect(userStore.findByOverlayToken(overlay)).toBeNull();
    expect(deleted).toHaveBeenCalledWith('200');
    expect((await agent.get('/api/me')).status).toBe(401);
  });

  test('needs a login', async () => {
    expect((await request(app).delete('/api/account')).status).toBe(401);
  });
});