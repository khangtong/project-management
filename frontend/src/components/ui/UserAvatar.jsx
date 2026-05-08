/**
 * UserAvatar — renders either an <img> (when avatar_url is set) or
 * a coloured initial-letter fallback.
 *
 * Props:
 *   user        — object with { name, avatar_url }
 *   size        — Tailwind size class pair, e.g. "w-8 h-8" (default)
 *   textSize    — Tailwind text size, e.g. "text-xs"
 *   rounded     — Tailwind rounded class, e.g. "rounded-full" (default) or "rounded-2xl"
 *   className   — extra classes
 */

import { getAvatarBg } from "./avatar";

export default function UserAvatar({
  user,
  size = "w-8 h-8",
  textSize = "text-sm",
  rounded = "rounded-full",
  className = "",
}) {
  const name    = user?.name || "";
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  const bg = getAvatarBg(name);

  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={name}
        title={name}
        className={`${size} ${rounded} object-cover shrink-0 ${className}`}
        onError={(e) => {
          // Fall back to initials if image fails to load
          e.currentTarget.style.display = "none";
          e.currentTarget.nextSibling && (e.currentTarget.nextSibling.style.display = "flex");
        }}
      />
    );
  }

  return (
    <div
      title={name}
      className={`${size} ${rounded} flex items-center justify-center font-semibold text-white shrink-0 ${textSize} ${className}`}
      style={{ backgroundColor: bg }}
    >
      {initials}
    </div>
  );
}
