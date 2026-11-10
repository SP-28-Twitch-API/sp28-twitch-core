// sends alerts to overlay tabs open in the same browser (demo mode and "send test")
// obs runs its own browser --> real backend websocket takes over this job in later pushes
const CHANNEL = 'sp28-overlay';
let channel;
const getChannel = () => {
  if (!('BroadcastChannel' in window)) return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL);
  return channel;
};

export const sendToOverlay = (message) => getChannel()?.postMessage(message);

export function onOverlayMessage(handler) {
  const ch = getChannel();
  if (!ch) return () => {};
  const listener = (e) => handler(e.data);
  ch.addEventListener('message', listener);
  return () => ch.removeEventListener('message', listener);
}