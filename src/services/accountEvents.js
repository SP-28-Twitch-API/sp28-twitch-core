const { EventEmitter } = require('events');

// other parts of the backend listen here instead of being called directly
// 'disconnected' (broadcasterId): twitch access removed, stop listening for that channel
// 'deleted' (broadcasterId): every stored record is gone
// the eventsub listener will subscribe to these in a later step
module.exports = new EventEmitter();