jest.mock('dotenv', () => ({ config: jest.fn() })); // silence dotenv logging in tests
// Unit tests for config/twitch.js
describe('config/twitch', () => {
  const OLD = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD, TWITCH_CLIENT_ID: 'cid', TWITCH_CLIENT_SECRET: 'sec', TWITCH_REDIRECT_URI: 'http://x/cb' };
  });
  afterAll(() => { process.env = OLD; });

  test('reads credentials from environment variables', () => {
    const cfg = require('../config/twitch');
    expect(cfg.clientId).toBe('cid');
    expect(cfg.clientSecret).toBe('sec');
    expect(cfg.redirectUri).toBe('http://x/cb');
  });

  test('requests exactly the SRS Appendix A scopes (space separated)', () => {
    const scopes = require('../config/twitch').scopes.split(' ');
    expect(scopes.sort()).toEqual([
      'bits:read',
      'channel:read:redemptions',
      'channel:read:subscriptions',
      'moderator:read:followers',
      'user:read:chat',
      'user:read:email'
    ]);
  });

  test('does not request the legacy chat:read scope', () => {
    expect(require('../config/twitch').scopes.split(' ')).not.toContain('chat:read');
  });
});
