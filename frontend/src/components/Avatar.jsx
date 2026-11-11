// twitch profile picture/channel's initials when there isn't one (demo mode)
export default function Avatar({ me, size = 40 }) {
  const initials = (me?.displayName || '?').slice(0, 2).toUpperCase();
  return me?.profileImageUrl ? (
    <img className="avatar" src={me.profileImageUrl} alt="" width={size} height={size} />
  ) : (
    <span className="avatar avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">{initials}</span>
  );
}