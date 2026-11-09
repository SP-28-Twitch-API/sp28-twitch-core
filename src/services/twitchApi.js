const axios = require('axios');
const twitchConfig = require('../config/twitch');

const HELIX_URL = 'https://api.twitch.tv/helix';

// the logged in streamer's channel info (srs 3.2.1)
async function getUser(accessToken) {
  const { data } = await axios.get(`${HELIX_URL}/users`, {
    headers: {
      'Client-ID': twitchConfig.clientId,
      Authorization: `Bearer ${accessToken}`
    }
  });
  const user = data && data.data && data.data[0];
  if (!user) throw new Error('Twitch returned no user for this token.');

  return {
    id: user.id,
    login: user.login,
    displayName: user.display_name,
    profileImageUrl: user.profile_image_url,
    broadcasterType: user.broadcaster_type // '', 'affiliate' or 'partner'
  };
}

module.exports = { getUser, HELIX_URL };