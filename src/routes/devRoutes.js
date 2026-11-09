const express = require('express');
const router = express.Router();

// TEMPORARY (NOTE THIS) pages so login can be tested before the react frontend is connected
// set FRONTEND_URL=http://localhost:3000 in .env to use them, DELETE THIS FILE once react is in

const page = (title, body) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0e0e10;color:#efeff1;max-width:560px;margin:48px auto;padding:0 16px}
  .card{background:#18181b;border:1px solid #2f2f35;border-radius:10px;padding:20px;margin-top:16px}
  a.btn,button{display:inline-block;background:#9147ff;color:#fff;border:0;border-radius:6px;padding:10px 16px;font:inherit;text-decoration:none;cursor:pointer;margin-right:8px}
  button.ghost{background:#2f2f35}
  .muted{color:#adadb8;font-size:14px}
  img{width:56px;height:56px;border-radius:50%;vertical-align:middle;margin-right:12px}
  code{background:#26262c;padding:2px 6px;border-radius:4px}
</style></head><body>${body}</body></html>`;

router.get('/login', (req, res) => {
  res.type('html').send(page('StreamPulse login', `
<h1>StreamPulse</h1>
<p class="muted">Dev login page (temporary)</p>
<div class="card">
  <p id="msg" class="muted"></p>
  <a class="btn" href="/auth/login">Login with Twitch</a>
</div>
<script>
  // reason comes from the url, only known values are shown, nothing is inserted as html
  const messages = {
    state: 'That login expired or was started in another tab. Please try again.',
    denied: 'You cancelled the Twitch login.',
    twitch: "Twitch login didn't work. Please try again.",
    expired: 'Your Twitch session ended or access was removed. Please log in again.'
  };
  const reason = new URLSearchParams(location.search).get('reason');
  document.getElementById('msg').textContent = messages[reason] || 'Log in to see your channel.';
</script>`));
});

router.get('/dashboard', (req, res) => {
  res.type('html').send(page('StreamPulse dashboard', `
<h1>StreamPulse</h1>
<p class="muted">Dev dashboard (temporary, until the React app is connected)</p>
<div class="card" id="profile">Loading...</div>
<div class="card">
  <p><b>Overlay URL</b> <span class="muted">(keep it private, it's hidden on purpose)</span></p>
  <p><code id="overlay">hidden</code></p>
  <button class="ghost" id="show">Show</button><button class="ghost" id="regen">Regenerate</button>
</div>
<div class="card"><button id="logout">Log out</button></div>
<script>
  let overlayUrl = '';
  const goLogin = () => { location.href = '/login?reason=expired'; };
  async function api(path, options) {
    const res = await fetch(path, { credentials: 'include', ...options });
    if (res.status === 401) { goLogin(); throw new Error('logged out'); }
    return res.json();
  }
  async function load() {
    const me = await api('/api/me');
    const box = document.getElementById('profile');
    box.textContent = '';
    const img = document.createElement('img');
    img.src = me.profileImageUrl; img.alt = '';
    const name = document.createElement('b');
    name.textContent = me.displayName;
    const info = document.createElement('p');
    info.className = 'muted';
    info.textContent = 'ID ' + me.broadcasterId + ' · ' + (me.broadcasterType || 'not affiliate yet');
    box.append(img, name, info);
    const { overlayToken } = await api('/api/overlay');
    overlayUrl = location.origin + '/overlay/' + overlayToken;
  }
  document.getElementById('show').onclick = (e) => {
    const el = document.getElementById('overlay');
    const hidden = el.textContent === 'hidden';
    el.textContent = hidden ? overlayUrl : 'hidden';
    e.target.textContent = hidden ? 'Hide' : 'Show';
  };
  document.getElementById('regen').onclick = async () => {
    const { overlayToken } = await api('/api/overlay/regenerate', { method: 'POST' });
    overlayUrl = location.origin + '/overlay/' + overlayToken;
    const el = document.getElementById('overlay');
    if (el.textContent !== 'hidden') el.textContent = overlayUrl;
  };
  document.getElementById('logout').onclick = async () => {
    await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
    location.href = '/login';
  };
  load().catch(() => {});
</script>`));
});

module.exports = router;