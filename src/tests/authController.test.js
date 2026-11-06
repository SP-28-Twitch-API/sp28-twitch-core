// Unit tests for controllers/authController.js (SRS 3.1.1-3.1.5, 3.5.2)
jest.mock('axios');
jest.mock('../config/twitch', () => ({
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  redirectUri: 'http://localhost:3000/auth/callback',
  scopes: 'user:read:email moderator:read:followers'
}));
jest.mock('../services/tokenManager', () => ({
  setSession: jest.fn(),
  getSession: jest.fn(),
  getValidAccessToken: jest.fn(),
  regenerateOverlayToken: jest.fn(),
  clearSession: jest.fn()
}));

const axios = require('axios');
const tokenManager = require('../services/tokenManager');
const controller = require('../controllers/authController');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  return res;
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

    expect(res.redirect).toHaveBeenCalledTimes(1);
    const url = new URL(res.redirect.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://id.twitch.tv/oauth2/authorize');
    expect(url.searchParams.get('client_id')).toBe('test-client-id');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/auth/callback');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('user:read:email moderator:read:followers');
    expect(url.searchParams.get('force_verify')).toBe('true');
  });

  // SRS 3.1.6 - not built yet
  test.todo('includes a unique "state" value on every login attempt (SRS 3.1.6)');
});

describe('callback', () => {
  test('returns 400 when Twitch sends an error', async () => {
    const res = mockRes();
    await controller.callback({ query: { error: 'access_denied', error_description: 'denied' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('returns 400 when the authorization code is missing', async () => {
    const res = mockRes();
    await controller.callback({ query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Authorization code missing.');
  });

  test('exchanges the code, loads the profile and initializes the session', async () => {
    const tokenData = { access_token: 'a', refresh_token: 'r', expires_in: 14400 };
    axios.post.mockResolvedValue({ data: tokenData });
    axios.get.mockResolvedValue({ data: { data: [{ id: '42', display_name: 'Streamer' }] } });
    tokenManager.getSession.mockReturnValue({ overlayToken: 'overlay123' });
    const res = mockRes();

    await controller.callback({ query: { code: 'abc' } }, res);

    const [url, , opts] = axios.post.mock.calls[0];
    expect(url).toBe('https://id.twitch.tv/oauth2/token');
    expect(opts.params).toMatchObject({ code: 'abc', grant_type: 'authorization_code' });

    const [helixUrl, helixOpts] = axios.get.mock.calls[0];
    expect(helixUrl).toBe('https://api.twitch.tv/helix/users');
    expect(helixOpts.headers.Authorization).toBe('Bearer a');
    expect(helixOpts.headers['Client-ID']).toBe('test-client-id');

    expect(tokenManager.setSession).toHaveBeenCalledWith(tokenData, { id: '42', display_name: 'Streamer' });
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Authentication Successful'));
  });

  test('returns 500 and does not create a session when the token exchange fails', async () => {
    axios.post.mockRejectedValue(new Error('twitch down'));
    const res = mockRes();
    await controller.callback({ query: { code: 'abc' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(tokenManager.setSession).not.toHaveBeenCalled();
  });

  // Documented limitations in the Development Document
  test.todo('escapes broadcaster name / error text in HTML output (XSS)');
  test.todo('does not leak raw error details in the 500 response');
});

describe('getProfile', () => {
  test('returns the first Helix user using a valid token', async () => {
    tokenManager.getValidAccessToken.mockResolvedValue('tok');
    axios.get.mockResolvedValue({ data: { data: [{ id: '1', display_name: 'A' }] } });
    const res = mockRes();

    await controller.getProfile({}, res);

    expect(axios.get.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
    expect(res.json).toHaveBeenCalledWith({ id: '1', display_name: 'A' });
  });

  test('returns 401 when there is no valid session', async () => {
    tokenManager.getValidAccessToken.mockRejectedValue(new Error('No active session found.'));
    const res = mockRes();
    await controller.getProfile({}, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No active session found.' });
  });
});

describe('regenerateOverlayKey', () => {
  test('returns the new token and an overlay URL containing it', () => {
    tokenManager.regenerateOverlayToken.mockReturnValue('newtoken');
    const res = mockRes();
    controller.regenerateOverlayKey({}, res);
    const body = res.json.mock.calls[0][0];
    expect(body.overlayToken).toBe('newtoken');
    expect(body.overlayUrl).toContain('/overlay/newtoken');
  });

  test('returns 500 if regeneration throws', () => {
    tokenManager.regenerateOverlayToken.mockImplementation(() => { throw new Error('boom'); });
    const res = mockRes();
    controller.regenerateOverlayKey({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('logout', () => {
  test('clears the session', () => {
    const res = mockRes();
    controller.logout({}, res);
    expect(tokenManager.clearSession).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ message: 'Logged out. Session cleared.' });
  });
});
