const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const Vault = require('../src/store/vault');

const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sp28-')), 'store.enc');

test('vault round trip keeps the data', () => {
const vault = new Vault(tmpFile(), crypto.randomBytes(32));
const data = { version: 1, users: { 123: { tokens: { access: 'abc' } } } };
vault.save(data);
assert.deepStrictEqual(vault.load(), data);
});

test('file on disk is not readable as plain text', () => {
const file = tmpFile();
new Vault(file, crypto.randomBytes(32)).save({ users: { 1: { tokens: { access: 'super-secret-token' } } } });
const raw = fs.readFileSync(file).toString('latin1');
assert.ok(!raw.includes('super-secret-token'));
assert.ok(!raw.includes('access'));
});

test('wrong key starts fresh and keeps the old file aside', () => {
const file = tmpFile();
new Vault(file, crypto.randomBytes(32)).save({ users: { 1: {} } });
const data = new Vault(file, crypto.randomBytes(32)).load();
assert.deepStrictEqual(data.users, {});
assert.ok(fs.readdirSync(path.dirname(file)).some((f) => f.includes('unreadable')));
});

test('userStore: overlay token, regenerate, delete', () => {
process.env.DATA_FILE = tmpFile();
delete require.cache[require.resolve('../src/config/env')];
delete require.cache[require.resolve('../src/store/userStore')];
const store = require('../src/store/userStore');

const user = store.upsert('42', { profile: { displayName: 'Tester' }, tokens: { accessToken: 'a' } });
const first = user.overlayToken;
assert.match(first, /^[a-f0-9]{32}$/);
assert.strictEqual(store.findByOverlayToken(first).broadcasterId, '42');

store.upsert('42', { profile: { displayName: 'Tester2' } });
assert.strictEqual(store.get('42').overlayToken, first, 'logging in again keeps the overlay url');

const second = store.regenerateOverlayToken('42');
assert.notStrictEqual(second, first);
assert.strictEqual(store.findByOverlayToken(first), null, 'old url stops working');

store.flush();
assert.ok(fs.existsSync(process.env.DATA_FILE));
store.delete('42');
assert.strictEqual(store.get('42'), null);
assert.strictEqual(store.findByOverlayToken(second), null);
});