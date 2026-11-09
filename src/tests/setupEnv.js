// fake .env values for jest so tests never depend on real .env and data
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.TWITCH_CLIENT_ID = 'test-client-id';
process.env.TWITCH_CLIENT_SECRET = 'test-client-secret';
process.env.TWITCH_REDIRECT_URI = 'http://localhost:3000/auth/callback';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.DATA_KEY = crypto.randomBytes(32).toString('hex');
process.env.DATA_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sp28-jest-')), 'store.enc');
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'test';