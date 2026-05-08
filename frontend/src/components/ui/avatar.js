const AVATAR_COLORS = [
  "#4CACBC", "#6CC4A1", "#A0D995", "#818cf8",
  "#fb923c", "#f472b6", "#a78bfa", "#34d399",
];

export function getAvatarBg(str = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
