const tokenManager = require('./tokenManager');
const sessionStore = require('./sessionStore');
const accountEvents = require('./accountEvents');
const userStore = require('../store/userStore');

// srs 3.5.5: revoke with twitch, stop listening, delete the stored tokens
// settings and overlay url are kept so logging in again restores everything (srs 3.5.3)
async function disconnect(broadcasterId) {
  const id = String(broadcasterId);
  await tokenManager.waitForRefresh(id);
  await tokenManager.revokeTokens(id);
  tokenManager.endSession(id); // clears tokens + logs out every browser
  userStore.flush(); // write the change now instead of in 250ms
  accountEvents.emit('disconnected', id);
}

// srs 3.5.6: same as disconnect, then remove settings, overlay url and profile too
async function deleteAccount(broadcasterId) {
  const id = String(broadcasterId);
  await tokenManager.waitForRefresh(id);
  await tokenManager.revokeTokens(id);
  sessionStore.destroyAllForUser(id);
  userStore.delete(id); // also kills the overlay url right away
  userStore.flush();
  accountEvents.emit('disconnected', id);
  accountEvents.emit('deleted', id);
}

module.exports = { disconnect, deleteAccount };