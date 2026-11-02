const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// file layout: [12-byte iv][16-byte auth tag][ciphertext]
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const EMPTY_STORE = () => ({ version: 1, users: {} });

class Vault {
constructor(filePath, key) {
if (!Buffer.isBuffer(key) || key.length !== 32) {
throw new Error('Vault key must be a 32-byte Buffer.');
}
this.filePath = path.resolve(filePath);
this.key = key;
}

encrypt(obj) {
const iv = crypto.randomBytes(IV_LENGTH); // fresh iv every save, never reuse with gcm
const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
const ciphertext = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
}

decrypt(buf) {
const iv = buf.subarray(0, IV_LENGTH);
const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);
const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
decipher.setAuthTag(tag); // throws on final() if the file was edited or the key is wrong
const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
return JSON.parse(plain.toString('utf8'));
}

load() {
if (!fs.existsSync(this.filePath)) return EMPTY_STORE();
try {
const data = this.decrypt(fs.readFileSync(this.filePath));
return { ...EMPTY_STORE(), ...data };
} catch (err) {
// wrong DATA_KEY or a corrupted file: keep the bad file aside instead of deleting it
const backup = `${this.filePath}.unreadable-${Date.now()}`;
fs.renameSync(this.filePath, backup);
console.error(`[Vault] Could not decrypt store, moved it to ${path.basename(backup)} and started fresh.`);
return EMPTY_STORE();
}
}

save(obj) {
fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
const tmp = `${this.filePath}.tmp`;
// write to a temp file then rename so a crash never leaves half a file behind
fs.writeFileSync(tmp, this.encrypt(obj), { mode: 0o600 });
fs.renameSync(tmp, this.filePath);
}
}

module.exports = Vault;