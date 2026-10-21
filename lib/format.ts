/**
 * Admin display formatting (IST — the studio is in Kolkata). Wireframe:
 * ts cell = relative bold ("2h ago") over absolute ("Today, 18:22"),
 * notes time = "Oct 13\n18:40", meta = "Oct 13 · 18:22 IST".
 */
const IST = "Asia/Kolkata";

function parts(d: Date): { day: string; time: string; full: string } {
  const day = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: IST });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: IST });
  return { day, time, full: `${day}, ${time}` };
}

/** "2h ago" / "Yesterday" / "3d ago" (admin-view relative) */
export function fmtRel(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return parts(date).day;
}

/** "Today, 18:22" / "Oct 12, 11:05" (inbox ts second line) */
export function fmtAbs(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const now = new Date();
  const sameDay = date.toLocaleDateString("en-IN", { timeZone: IST }) ===
    now.toLocaleDateString("en-IN", { timeZone: IST });
  const p = parts(date);
  return sameDay ? `Today, ${p.time}` : p.full;
}

/** "Oct 13 · 18:22" (panel heads, meta card) */
export function fmtStamp(d: Date | string): string {
  const p = parts(typeof d === "string" ? new Date(d) : d);
  return `${p.day} · ${p.time}`;
}
