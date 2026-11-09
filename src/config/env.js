require('dotenv').config();

// keys the server cannot run without
const REQUIRED = [
  'TWITCH_CLIENT_ID',
  'TWITCH_CLIENT_SECRET',
  'TWITCH_REDIRECT_URI',
  'SESSION_SECRET',
  'DATA_KEY'
];

const missing = REQUIRED.filter((key) => !process.env[key] || !process.env[key].trim());
if (missing.length) {
  console.error('\n[env] Missing required values in .env:');
  missing.forEach((key) => console.error(`  - ${key}`));
  console.error('Copy .env.example to .env and fill these in, then restart.\n');
  process.exit(1);
}

// data key has to be exactly 32 bytes (64 hex chars) for aes-256
if (!/^[0-9a-fA-F]{64}$/.test(process.env.DATA_KEY)) {
  console.error('[env] DATA_KEY must be 64 hex characters (32 bytes).');
  console.error("Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
  process.exit(1);
}

const port = Number(process.env.PORT) || 3000;

module.exports = {
  port,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  twitch: {
    clientId: process.env.TWITCH_CLIENT_ID,
    clientSecret: process.env.TWITCH_CLIENT_SECRET,
    redirectUri: process.env.TWITCH_REDIRECT_URI
  },
  sessionSecret: process.env.SESSION_SECRET,
  dataKey: Buffer.from(process.env.DATA_KEY, 'hex'),
  dataFile: process.env.DATA_FILE || 'data/store.enc',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${port}`
};