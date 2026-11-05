const axios = require('axios');
const twitchConfig = require('../config/twitch');
const tokenManager = require('../services/tokenManager');

// redirect streamer to Twitch consent screen
exports.login = (req, res) => {
const params = new URLSearchParams({
client_id: twitchConfig.clientId,
redirect_uri: twitchConfig.redirectUri,
response_type: 'code',
scope: twitchConfig.scopes,
force_verify: 'true'
});
res.redirect(`https://id.twitch.tv/oauth2/authorize?${params.toString()}`);
};

// exchange auth code for user access token and refresh token
exports.callback = async (req, res) => {
const { code, error, error_description } = req.query;

if (error) {
return res.status(400).send(`OAuth Error: ${error_description}`);
}
if (!code) {
return res.status(400).send('Authorization code missing.');
}

try {
// hit Twitch token endpoint
const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, {
params: {
client_id: twitchConfig.clientId,
client_secret: twitchConfig.clientSecret,
code,
grant_type: 'authorization_code',
redirect_uri: twitchConfig.redirectUri
}
});

const tokenData = tokenResponse.data;

// get broadcaaster profile right after getting token
const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
headers: {
'Client-ID': twitchConfig.clientId,
'Authorization': `Bearer ${tokenData.access_token}`
}
});

const broadcaster = userResponse.data.data[0];
tokenManager.setSession(tokenData, broadcaster);

// temporary confirmation page
res.send(`
<div style="font-family: Arial, sans-serif; padding: 2.5rem; text-align: center;">
<h2 style="color: #6441a5;">Authentication Successful!</h2>
<p>Broadcaster: <strong>${broadcaster.display_name}</strong> (ID: ${broadcaster.id})</p>
<p>Active Overlay Token: <code>${tokenManager.getSession().overlayToken}</code></p>
<p>Backend session is now initialized.</p>
</div>
`);
} catch (err) {
console.error('[Auth Callback] Error:', err.response?.data || err.message);
res.status(500).json({ error: 'OAuth handshake failed', details: err.response?.data || err.message });
}
};

// get current user info using active token
exports.getProfile = async (req, res) => {
try {
const token = await tokenManager.getValidAccessToken();
const response = await axios.get('https://api.twitch.tv/helix/users', {
headers: {
'Client-ID': twitchConfig.clientId,
'Authorization': `Bearer ${token}`
}
});
res.json(response.data.data[0]);
} catch (err) {
res.status(401).json({ error: err.message });
}
};

// generate new key if streamer accidentally shows url on stream
exports.regenerateOverlayKey = (req, res) => {
try {
const newToken = tokenManager.regenerateOverlayToken();
res.json({
message: 'Overlay token regenerated.',
overlayToken: newToken,
overlayUrl: `http://localhost:${process.env.PORT || 3000}/overlay/${newToken}?theme=dark`
});
} catch (err) {
res.status(500).json({ error: err.message });
}
};

// clear session data
exports.logout = (req, res) => {
tokenManager.clearSession();
res.json({ message: 'Logged out. Session cleared.' });
};