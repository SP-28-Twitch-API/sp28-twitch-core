// unit tests for controllers/authController.js (SRS 3.1.1-3.1.6)
jest.mock('axios');

const axios = require('axios');
const controller = require('../controllers/authController');
const userStore = require('../store/userStore');
const sessionStore = require('../services/sessionStore');

const FRONTEND = 'http://localhost:5173';

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

// start a login and return the state it put in the cookie
const startLogin = () => {
  const res = mockRes();
  controller.login({}, res);
  return res.cookie.mock.calls[0][1];
};

const mockTwitchSuccess = () => {
  axios.post.mockResolvedValue({ data: { access_token: 'a', refresh_token: 'r', expires_in: 14400, scope: [] } });
  axios.get.mockResolvedValue({
    data: { data: [{ id: '42', login: 'streamer', display_name: 'Streamer', profile_image_url: 'https://img/x.png', broadcaster_type: 'affiliate' }] }
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('login', () => {
  test('redirects to the Twitch authorize endpoint with the right params', () => {
    const res = mockRes();
    controller.login({}, res);

    const url = new URL(res.redirect.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://id.twitch.tv/oauth2/authorize');
    expect(url.searchParams.get('client_id')).toBe('test-client-id');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/auth/callback');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toContain('moderator:read:followers');
    expect(url.searchParams.get('force_verify')).toBe('true');
  });

  test('puts the same random state in the url and a signed httpOnly cookie (SRS 3.1.6)', () => {
    const res = mockRes();
    controller.login({}, res);

    const [name, value, options] = res.cookie.mock.calls[0];
    const url = new URL(res.redirect.mock.calls[0][0]);
    expect(name).toBe('oauth_state');
    expect(value).toMatch(/^[0-9a-f]{32}$/);
    expect(url.searchParams.get('state')).toBe(value);
    expect(options).toMatchObject({ httpOnly: true, signed: true, sameSite: 'lax', path: '/auth' });
  });

  test('every login gets a different state', () => {
    expect(startLogin()).not.toBe(startLogin());
  });
});

describe('callback', () => {
  test('rejects a missing or wrong state without calling Twitch', async () => {
    const state = startLogin();
    for (const query of [{ code: 'abc' }, { code: 'abc', state: 'wrong' }, { code: 'abc', state }]) {
      const res = mockRes();
      const cookies = query.state === state ? {} : { oauth_state: state }; // last case: cookie missing
      await controller.callback({ query, signedCookies: cookies }, res);
      expect(res.redirect).toHaveBeenCalledWith(`${FRONTEND}/login?reason=state`);
    }
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('clears the state cookie so it can only be used once', async () => {
    const res = mockRes();
    await controller.callback({ query: {}, signedCookies: {} }, res);
    expect(res.clearCookie).toHaveBeenCalledWith('oauth_state', { path: '/auth' });
  });

  test('streamer pressing Cancel goes back to login with reason=denied', async () => {
    const state = startLogin();
    const res = mockRes();
    await controller.callback({ query: { error: 'access_denied', state }, signedCookies: { oauth_state: state } }, res);
    expect(res.redirect).toHaveBeenCalledWith(`${FRONTEND}/login?reason=denied`);
  });

  test('success: saves the streamer, sets a session cookie and redirects to the dashboard', async () => {
    mockTwitchSuccess();
    const state = startLogin();
    const res = mockRes();

    await controller.callback({ query: { code: 'abc', state }, signedCookies: { oauth_state: state } }, res);

    // helix call uses the new token
    const [helixUrl, helixOpts] = axios.get.mock.calls[0];
    expect(helixUrl).toBe('https://api.twitch.tv/helix/users');
    expect(helixOpts.headers.Authorization).toBe('Bearer a');

    const user = userStore.get('42');
    expect(user.profile.displayName).toBe('Streamer');
    expect(user.tokens.refreshToken).toBe('r');
    expect(user.overlayToken).toMatch(/^[0-9a-f]{32}$/);

    const [name, sid, options] = res.cookie.mock.calls[0];
    expect(name).toBe('sid');
    expect(options).toMatchObject({ httpOnly: true, signed: true, sameSite: 'lax' });
    expect(sessionStore.get(sid).broadcasterId).toBe('42');
    expect(res.redirect).toHaveBeenCalledWith(`${FRONTEND}/dashboard`);
  });

  test('never sends HTML or tokens back to the browser (XSS fix)', async () => {
    mockTwitchSuccess();
    const state = startLogin();
    const res = mockRes();
    await controller.callback({ query: { code: 'abc', state }, signedCookies: { oauth_state: state } }, res);
    expect(res.send).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test('failed token exchange: no session, friendly redirect, no raw error details', async () => {
    axios.post.mockRejectedValue({ response: { status: 400, data: { message: 'Invalid authorization code' } } });
    const state = startLogin();
    const res = mockRes();

    await controller.callback({ query: { code: 'bad', state }, signedCookies: { oauth_state: state } }, res);

    expect(res.redirect).toHaveBeenCalledWith(`${FRONTEND}/login?reason=twitch`);
    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('logout', () => {
  test('ends this browser session and clears the cookie but keeps stored tokens', () => {
    userStore.upsert('7', { profile: { displayName: 'A' }, tokens: { accessToken: 'x', refreshToken: 'y', expiresAt: Date.now() + 1e6 } });
    const sid = sessionStore.create('7');
    const res = mockRes();

    controller.logout({ signedCookies: { sid } }, res);

    expect(sessionStore.get(sid)).toBeNull();
    expect(res.clearCookie).toHaveBeenCalledWith('sid', { path: '/' });
    expect(userStore.get('7').tokens).not.toBeNull(); // overlay keeps working after logout
    expect(res.json).toHaveBeenCalledWith({ message: 'Logged out.' });
  });

  test('works even when nobody is logged in', () => {
    const res = mockRes();
    controller.logout({ signedCookies: {} }, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Logged out.' });
  });
});