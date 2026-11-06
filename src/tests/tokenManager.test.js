// Unit tests for services/tokenManager.js (SRS 3.1.4, SDD 5.1)
jest.mock('axios');
jest.mock('../config/twitch', () => ({
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  redirectUri: 'http://localhost:3000/auth/callback',
  scopes: 'user:read:email'
}));

let axios;
let tokenManager;

const tokenData = (overrides = {}) => ({
  access_token: 'access-1',
  refresh_token: 'refresh-1',
  expires_in: 14400, // ~4 hours, like Twitch
  ...overrides
});

beforeEach(() => {
  jest.resetModules();            // fresh singleton for every test
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  axios = require('axios');
  tokenManager = require('../services/tokenManager');
});

afterEach(() => jest.restoreAllMocks());

describe('setSession', () => {
  test('stores tokens, broadcaster info and an absolute expiry time', () => {
    const before = Date.now();
    tokenManager.setSession(tokenData(), { id: '123', display_name: 'Streamer' });
    const s = tokenManager.getSession();

    expect(s.accessToken).toBe('access-1');
    expect(s.refreshToken).toBe('refresh-1');
    expect(s.broadcasterId).toBe('123');
    expect(s.displayName).toBe('Streamer');
    expect(s.expiresAt).toBeGreaterThanOrEqual(before + 14400 * 1000);
    expect(s.expiresAt).toBeLessThanOrEqual(Date.now() + 14400 * 1000);
  });

  test('creates a 32-char hex overlay token on first login', () => {
    tokenManager.setSession(tokenData(), { id: '1', display_name: 'A' });
    expect(tokenManager.getSession().overlayToken).toMatch(/^[0-9a-f]{32}$/);
  });

  test('keeps the existing overlay token when logging in again', () => {
    tokenManager.setSession(tokenData(), { id: '1', display_name: 'A' });
    const first = tokenManager.getSession().overlayToken;
    tokenManager.setSession(tokenData({ access_token: 'access-2' }), { id: '1', display_name: 'A' });
    expect(tokenManager.getSession().overlayToken).toBe(first);
  });

  test('works without broadcaster data (leaves old profile untouched)', () => {
    tokenManager.setSession(tokenData());
    expect(tokenManager.getSession().broadcasterId).toBeNull();
  });
});

describe('regenerateOverlayToken', () => {
  test('returns a new 32-char hex token and stores it', () => {
    tokenManager.setSession(tokenData(), { id: '1', display_name: 'A' });
    const old = tokenManager.getSession().overlayToken;
    const fresh = tokenManager.regenerateOverlayToken();

    expect(fresh).toMatch(/^[0-9a-f]{32}$/);
    expect(fresh).not.toBe(old);
    expect(tokenManager.getSession().overlayToken).toBe(fresh);
  });

  test('tokens are unique across many generations', () => {
    const set = new Set();
    for (let i = 0; i < 200; i++) set.add(tokenManager.regenerateOverlayToken());
    expect(set.size).toBe(200);
  });
});

describe('getValidAccessToken', () => {
  test('throws a clear error when nobody is logged in', async () => {
    await expect(tokenManager.getValidAccessToken()).rejects.toThrow(/No active session/);
  });

  test('returns the current token when more than 5 minutes remain', async () => {
    tokenManager.setSession(tokenData(), { id: '1', display_name: 'A' });
    await expect(tokenManager.getValidAccessToken()).resolves.toBe('access-1');
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('refreshes first when less than 5 minutes remain', async () => {
    tokenManager.setSession(tokenData({ expires_in: 120 }), { id: '1', display_name: 'A' });
    axios.post.mockResolvedValue({
      data: { access_token: 'access-new', refresh_token: 'refresh-new', expires_in: 14400 }
    });

    const token = await tokenManager.getValidAccessToken();

    expect(token).toBe('access-new');
    expect(axios.post).toHaveBeenCalledTimes(1);
    const [url, , options] = axios.post.mock.calls[0];
    expect(url).toBe('https://id.twitch.tv/oauth2/token');
    expect(options.params).toMatchObject({
      grant_type: 'refresh_token',
      refresh_token: 'refresh-1',
      client_id: 'test-client-id',
      client_secret: 'test-client-secret'
    });
  });

  test('refreshes when the token is already expired', async () => {
    tokenManager.setSession(tokenData({ expires_in: -10 }), { id: '1', display_name: 'A' });
    axios.post.mockResolvedValue({
      data: { access_token: 'a2', refresh_token: 'r2', expires_in: 14400 }
    });
    await expect(tokenManager.getValidAccessToken()).resolves.toBe('a2');
  });
});

describe('refreshAccessToken', () => {
  beforeEach(() => {
    tokenManager.setSession(tokenData({ expires_in: 60 }), { id: '1', display_name: 'A' });
  });

  test('replaces BOTH access and refresh tokens and the expiry', async () => {
    axios.post.mockResolvedValue({
      data: { access_token: 'a2', refresh_token: 'r2', expires_in: 14400 }
    });
    await tokenManager.refreshAccessToken();
    const s = tokenManager.getSession();
    expect(s.accessToken).toBe('a2');
    expect(s.refreshToken).toBe('r2');
    expect(s.expiresAt).toBeGreaterThan(Date.now() + 14000 * 1000);
  });

  test('concurrent callers share a single refresh request (mutex)', async () => {
    let resolvePost;
    axios.post.mockReturnValue(new Promise(r => { resolvePost = r; }));

    const calls = [
      tokenManager.refreshAccessToken(),
      tokenManager.refreshAccessToken(),
      tokenManager.getValidAccessToken()
    ];
    resolvePost({ data: { access_token: 'a2', refresh_token: 'r2', expires_in: 14400 } });
    const results = await Promise.all(calls);

    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(results).toEqual(['a2', 'a2', 'a2']);
  });

  test('throws a re-authentication error when Twitch rejects the refresh', async () => {
    axios.post.mockRejectedValue({ response: { data: { message: 'Invalid refresh token' } } });
    await expect(tokenManager.refreshAccessToken()).rejects.toThrow(/Re-authentication required/);
  });

  test('releases the lock after a failure so a later refresh can run', async () => {
    axios.post.mockRejectedValueOnce(new Error('network'));
    await expect(tokenManager.refreshAccessToken()).rejects.toThrow();
    expect(tokenManager.isRefreshing).toBe(false);

    axios.post.mockResolvedValueOnce({
      data: { access_token: 'a3', refresh_token: 'r3', expires_in: 14400 }
    });
    await expect(tokenManager.refreshAccessToken()).resolves.toBe('a3');
  });

  // SRS 3.1.7 - currently only PARTIAL in the build (error raised, session not cleared)
  test.todo('clears the session when a refresh is rejected (SRS 3.1.7)');
});

describe('clearSession', () => {
  test('wipes every field', () => {
    tokenManager.setSession(tokenData(), { id: '1', display_name: 'A' });
    tokenManager.clearSession();
    const s = tokenManager.getSession();
    Object.values(s).forEach(v => expect(v).toBeNull());
  });

  test('getValidAccessToken fails after logout', async () => {
    tokenManager.setSession(tokenData(), { id: '1', display_name: 'A' });
    tokenManager.clearSession();
    await expect(tokenManager.getValidAccessToken()).rejects.toThrow(/No active session/);
  });
});
