export const formatLastSeen = (value, now = Date.now()) => {
  if (!value) return "";

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "";

  const diffMinutes = Math.floor((now - timestamp) / 60000);
  if (diffMinutes < 1) return "1m";
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
};

export const getPresenceBadgeLabel = (user, now = Date.now()) => {
  if (!user || user.isOnline) return "";
  return formatLastSeen(user.lastSeenAt, now);
};

export const getPresenceDotClass = (isOnline) =>
  isOnline ? "bg-green-500" : "bg-gray-400";

export const getPresenceBadgeClass = (isOnline) =>
  isOnline
    ? "bg-green-500 border border-white"
    : "bg-gray-200 text-gray-500 border border-gray-300";