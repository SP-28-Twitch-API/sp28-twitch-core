require('dotenv').config();

// scopes approved in srs
const SCOPES = [
'user:read:email',
'moderator:read:followers',
'channel:read:subscriptions',
'bits:read',
'channel:read:redemptions',
'user:read:chat'
];

// export config pulled from .env
module.exports = {
clientId: process.env.TWITCH_CLIENT_ID,
clientSecret: process.env.TWITCH_CLIENT_SECRET,
redirectUri: process.env.TWITCH_REDIRECT_URI,
scopes: SCOPES.join(' ')
};