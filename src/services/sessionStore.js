const crypto = require('crypto');

// a login lasts 7 days from the last request
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

class SessionStore {
  constructor() {
    // sid -> { broadcasterId, expiresAt }
    // kept in memory on purpose: a restart just means logging in again, tokens stay saved
    this.sessions = new Map();
  }

  create(broadcasterId) {
    const sid = crypto.randomBytes(32).toString('hex');
    this.sessions.set(sid, { broadcasterId: String(broadcasterId), expiresAt: Date.now() + SESSION_TTL_MS });
    return sid;
  }

  get(sid) {
    if (typeof sid !== 'string') return null;
    const session = this.sessions.get(sid);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(sid);
      return null;
    }
    session.expiresAt = Date.now() + SESSION_TTL_MS; // sliding expiry
    return session;
  }

  destroy(sid) {
    return this.sessions.delete(sid);
  }

  // log a streamer out everywhere, used when their twitch access is gone
  destroyAllForUser(broadcasterId) {
    const id = String(broadcasterId);
    let removed = 0;
    for (const [sid, session] of this.sessions) {
      if (session.broadcasterId === id) {
        this.sessions.delete(sid);
        removed++;
      }
    }
    return removed;
  }
}

module.exports = new SessionStore();
module.exports.SESSION_TTL_MS = SESSION_TTL_MS;