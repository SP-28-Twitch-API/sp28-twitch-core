// unit tests for services/tokenManager.js (SRS 3.1.3, 3.1.4, 3.1.7, SDD 5.1)
jest.mock('axios');

const fs = require('fs');
const os = require('os');
const path = require('path');

let axios;
let tokenManager;
let userStore;
let sessionStore;

const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const HOUR = 60 * 60 * 1000;

// twitch-style token response
const twitchTokens = (overrides = {}) => ({
  data: { access_token: 'access-new', refresh_token: 'refresh-new', expires_in: 14400, scope: ['user:read:email'], ...overrides }
});

// a stored streamer whose access token expires in `msLeft`
const addUser = (id, msLeft) =>
  userStore.upsert(id, {
    profile: { displayName: `Streamer${id}` },
    tokens: { accessToken: `access-${id}`, refreshToken: `refresh-${id}`, expiresAt: Date.now() + msLeft, scopes: [] }
  });

const formBody = (call) => Object.fromEntries(call[1]); // URLSearchParams -> plain object

beforeEach(() => {
  jest.resetModules(); // fresh store, sessions and token manager for every test
  process.env.DATA_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sp28-tm-')), 'store.enc');
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  axios = require('axios');
  userStore = require('../store/userStore');
  sessionStore = require('../services/sessionStore');
  tokenManager = require('../services/tokenManager');
});

afterEach(() => jest.restoreAllMocks());

describe('exchangeCode', () => {
  test('sends the code and secret in the form body, not the url', async () => {
    axios.post.mockResolvedValue(twitchTokens());
    const tokens = await tokenManager.exchangeCode('abc');

    const call = axios.post.mock.calls[0];
    expect(call[0]).toBe(TOKEN_URL); // no query string with the secret
    expect(call[1]).toBeInstanceOf(URLSearchParams);
    expect(formBody(call)).toMatchObject({
      code: 'abc',
      grant_type: 'authorization_code',
      client_id: 'test-client-id',
      client_secret: 'test-client-secret',
      redirect_uri: 'http://localhost:3000/auth/callback'
    });
    expect(tokens.accessToken).toBe('access-new');
    expect(tokens.refreshToken).toBe('refresh-new');
    expect(tokens.expiresAt).toBeGreaterThan(Date.now() + 14000 * 1000);
    expect(tokens.scopes).toEqual(['user:read:email']);
  });
});

describe('getValidAccessToken', () => {
  test('throws REAUTH_REQUIRED for an unknown streamer', async () => {
    await expect(tokenManager.getValidAccessToken('nobody')).rejects.toMatchObject({ code: 'REAUTH_REQUIRED' });
  });

  test('returns the stored token when more than 5 minutes remain', async () => {
    addUser('1', HOUR);
    await expect(tokenManager.getValidAccessToken('1')).resolves.toBe('access-1');
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('refreshes first when less than 5 minutes remain', async () => {
    addUser('1', 2 * 60 * 1000);
    axios.post.mockResolvedValue(twitchTokens());

    await expect(tokenManager.getValidAccessToken('1')).resolves.toBe('access-new');
    expect(formBody(axios.post.mock.calls[0])).toMatchObject({
      grant_type: 'refresh_token',
      refresh_token: 'refresh-1',
      client_secret: 'test-client-secret'
    });
  });

  test('refreshes when the token is already expired', async () => {
    addUser('1', -1000);
    axios.post.mockResolvedValue(twitchTokens({ access_token: 'a2' }));
    await expect(tokenManager.getValidAccessToken('1')).resolves.toBe('a2');
  });
});

describe('refreshAccessToken', () => {
  test('saves BOTH new tokens and the new expiry in the store', async () => {
    addUser('1', 60 * 1000);
    axios.post.mockResolvedValue(twitchTokens({ access_token: 'a2', refresh_token: 'r2' }));

    await tokenManager.refreshAccessToken('1');
    const { tokens } = userStore.get('1');
    expect(tokens.accessToken).toBe('a2');
    expect(tokens.refreshToken).toBe('r2');
    expect(tokens.expiresAt).toBeGreaterThan(Date.now() + 14000 * 1000);
  });

  test('concurrent callers for one streamer share a single request (mutex)', async () => {
    addUser('1', 60 * 1000);
    let resolvePost;
    axios.post.mockReturnValue(new Promise((r) => { resolvePost = r; }));

    const calls = [
      tokenManager.refreshAccessToken('1'),
      tokenManager.refreshAccessToken('1'),
      tokenManager.getValidAccessToken('1')
    ];
    resolvePost(twitchTokens({ access_token: 'a2' }));

    await expect(Promise.all(calls)).resolves.toEqual(['a2', 'a2', 'a2']);
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  test('different streamers refresh independently', async () => {
    addUser('1', 60 * 1000);
    addUser('2', 60 * 1000);
    axios.post.mockResolvedValue(twitchTokens());

    await Promise.all([tokenManager.refreshAccessToken('1'), tokenManager.refreshAccessToken('2')]);
    expect(axios.post).toHaveBeenCalledTimes(2);
  });

  test('rejected refresh ends the session everywhere (SRS 3.1.7)', async () => {
    addUser('1', 60 * 1000);
    const sidA = sessionStore.create('1');
    const sidB = sessionStore.create('1');
    const overlayBefore = userStore.get('1').overlayToken;
    axios.post.mockRejectedValue({ response: { status: 400, data: { message: 'Invalid refresh token' } } });

    await expect(tokenManager.refreshAccessToken('1')).rejects.toMatchObject({ code: 'REAUTH_REQUIRED', status: 401 });
    expect(userStore.get('1').tokens).toBeNull();
    expect(sessionStore.get(sidA)).toBeNull();
    expect(sessionStore.get(sidB)).toBeNull();
    expect(userStore.get('1').overlayToken).toBe(overlayBefore); // obs url survives a re-login
  });

  test('network failure keeps the tokens and releases the lock', async () => {
    addUser('1', 60 * 1000);
    axios.post.mockRejectedValueOnce(new Error('ECONNRESET'));

    await expect(tokenManager.refreshAccessToken('1')).rejects.toMatchObject({ code: 'TWITCH_UNAVAILABLE' });
    expect(userStore.get('1').tokens.refreshToken).toBe('refresh-1');
    expect(tokenManager.refreshing.size).toBe(0);

    axios.post.mockResolvedValueOnce(twitchTokens({ access_token: 'a3' }));
    await expect(tokenManager.refreshAccessToken('1')).resolves.toBe('a3');
  });

  test('error messages are plain language, not raw twitch errors (SRS 4.3)', async () => {
    addUser('1', 60 * 1000);
    axios.post.mockRejectedValue({ response: { status: 400, data: { message: 'Invalid refresh token' } } });
    const err = await tokenManager.refreshAccessToken('1').catch((e) => e);
    expect(err.message).toBe('Your Twitch session ended or access was removed. Please log in again.');
  });
});