const express = require('express');
const router = express.Router();

// temporary pages so login can be tested before the react frontend is connected
// set FRONTEND_URL=http://localhost:3000 in .env to use them, delete this file once react is in

// nonce: only scripts carrying this page's random value are allowed to run (see middleware/security.js)
const page = (title, nonce, body, script) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0e0e10;color:#efeff1;max-width:560px;margin:48px auto;padding:0 16px}
  .card{background:#18181b;border:1px solid #2f2f35;border-radius:10px;padding:20px;margin-top:16px}
  a.btn,button{display:inline-block;background:#9147ff;color:#fff;border:0;border-radius:6px;padding:10px 16px;font:inherit;text-decoration:none;cursor:pointer;margin:0 8px 8px 0}
  button.ghost{background:#2f2f35}
  button.danger{background:#7a1e2c}
  .muted{color:#adadb8;font-size:14px}
  img{width:56px;height:56px;border-radius:50%;vertical-align:middle;margin-right:12px}
  code{background:#26262c;padding:2px 6px;border-radius:4px;word-break:break-all}
</style></head><body>${body}<script nonce="${nonce}">${script}</script></body></html>`;

router.get('/login', (req, res) => {
  res.type('html').send(page('StreamPulse login', res.locals.cspNonce, `
<h1>StreamPulse</h1>
<p class="muted">Dev login page (temporary)</p>
<div class="card">
  <p id="msg" class="muted"></p>
  <a class="btn" href="/auth/login">Login with Twitch</a>
</div>`, `
  // reason comes from the url, only known values are shown, nothing is inserted as html
  const messages = {
    state: 'That login expired or was started in another tab. Please try again.',
    denied: 'You cancelled the Twitch login.',
    twitch: "Twitch login didn't work. Please try again.",
    expired: 'Your Twitch session ended or access was removed. Please log in again.',
    busy: 'Too many login attempts. Please wait a minute and try again.',
    disconnected: 'Your Twitch account was disconnected. Log in again any time to reconnect.',
    deleted: 'All your StreamPulse data was deleted.'
  };
  const reason = new URLSearchParams(location.search).get('reason');
  document.getElementById('msg').textContent = messages[reason] || 'Log in to see your channel.';`));
});

router.get('/dashboard', (req, res) => {
  res.type('html').send(page('StreamPulse dashboard', res.locals.cspNonce, `
<h1>StreamPulse</h1>
<p class="muted">Dev dashboard (temporary, until the React app is connected)</p>
<div class="card" id="profile">Loading...</div>
<div class="card">
  <p><b>Overlay URL</b> <span class="muted">(keep it private, it's hidden on purpose)</span></p>
  <p><code id="overlay">hidden</code></p>
  <button class="ghost" id="show">Show</button><button class="ghost" id="regen">Regenerate</button>
</div>
<div class="card">
  <button id="logout">Log out</button>
  <button class="ghost" id="disconnect">Disconnect Twitch</button>
  <button class="danger" id="delete">Delete all my data</button>
  <p class="muted">Disconnect and Delete ask you to click twice.</p>
</div>`, `
  let overlayUrl = '';
  const goLogin = (reason) => { location.href = '/login?reason=' + reason; };
  async function api(path, options) {
    const res = await fetch(path, { credentials: 'include', ...options });
    if (res.status === 401) { goLogin('expired'); throw new Error('logged out'); }
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
  // destructive buttons need a second click within 4 seconds
  function confirmTwice(button, label, action) {
    let armed = false;
    button.onclick = async () => {
      if (!armed) {
        armed = true;
        button.textContent = 'Click again to confirm';
        setTimeout(() => { armed = false; button.textContent = label; }, 4000);
        return;
      }
      await action();
    };
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
  confirmTwice(document.getElementById('disconnect'), 'Disconnect Twitch', async () => {
    await api('/api/account/disconnect', { method: 'POST' });
    goLogin('disconnected');
  });
  confirmTwice(document.getElementById('delete'), 'Delete all my data', async () => {
    await api('/api/account', { method: 'DELETE' });
    goLogin('deleted');
  });
  load().catch(() => {});`));
});

module.exports = router;