/**
 * Site design settings — pure part (safe on server and client).
 * Everything is chosen from safe options; colours are validated hex. The CSS that uses these lives in
 * styles/design.css and reads the variables + data-attributes built by designVars()/designAttrs().
 */

export const ACCENTS = [
  { id: "volt", name: "Volt Lime", hex: "#C6F23A", note: "Links the studio to NextBiz One's green. Fresh and techy." },
  { id: "signal", name: "Signal Orange", hex: "#FF5B14", note: "Energetic and impossible to miss." },
  { id: "cobalt", name: "Cobalt", hex: "#2F4BFF", note: "Trustworthy and digital." },
  { id: "violet", name: "Ultraviolet", hex: "#6B3BFF", note: "Creative, a little bold." },
  { id: "marigold", name: "Marigold", hex: "#FFB21A", note: "Warm and welcoming." },
  { id: "jade", name: "Jade", hex: "#0FA36E", note: "Growth. Close to WhatsApp green." },
] as const;

export type Design = {
  accent: string;                       // hex
  badge: string | null;                 // hex, or null = same as accent
  show: { buttons: boolean; badges: boolean; highlight: boolean; nav: boolean; details: boolean; dark: boolean };
  glow: boolean;
  motion: "full" | "subtle" | "off";
  /** The site's style. Each style brings its own header, cards, buttons and photo shapes (locked together). */
  style: "soft" | "editorial";
  /** Options that only exist in the Soft style. */
  soft: { blur: boolean; lift: boolean; round: "soft" | "round" };
  /** Options that only exist in the Editorial style. Every default matches the live site's original look. */
  editorial: {
    numbers: boolean; inkRule: boolean;
    corners: "signature" | "soft" | "sharp";      // photo corners
    labels: "pill" | "square";                    // the small section labels
    cards: "separate" | "joined";                 // resource cards: separate, or joined ruled cells
    button: "sharp" | "rounded" | "pill";
    headerCta: boolean;                           // header right side: call text (off) or call + main button (on)
    footer: "light" | "dark";
    planner: "sentence" | "route";                // homepage planner section
    industries: "list" | "moving";                // homepage industries section
  };

  /** Background tone, both styles. */
  tone: "warm" | "white" | "cool";
  header: { cta: string; phone: boolean };
  footer: { line1: string; line2: string };
  highlight: { style: "marker" | "underline" | "color"; phrase: string };
  bar: { on: boolean; text: string; linkLabel: string; href: string; tone: "accent" | "dark" };
  soon: { text: string; pulse: boolean };
};

export const DESIGN_DEFAULTS: Design = {
  accent: "#C6F23A",
  badge: null,
  show: { buttons: true, badges: true, highlight: true, nav: true, details: true, dark: true },
  glow: true,
  motion: "full",
  style: "editorial",
  soft: { blur: true, lift: true, round: "soft" },
  editorial: { numbers: false, inkRule: false, corners: "signature", labels: "pill", cards: "separate", button: "sharp", headerCta: false, footer: "light", planner: "sentence", industries: "list" },
  tone: "warm",
  header: { cta: "Plan a project", phone: true },
  footer: { line1: "Got an idea?", line2: "Let's make it work." },
  highlight: { style: "marker", phrase: "Need It" },
  bar: { on: false, text: "NextBiz One is coming soon — WhatsApp, Instagram and ads in one place.", linkLabel: "Join the waitlist", href: "/nextbiz-one", tone: "dark" },
  soon: { text: "Soon", pulse: true },
};

const HEX = /^#[0-9a-f]{6}$/i;
const pick = <T extends string>(v: unknown, opts: readonly T[], d: T): T => (opts.includes(v as T) ? (v as T) : d);
const str = (v: unknown, d: string, max: number) => (typeof v === "string" ? v.slice(0, max) : d);
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
/** Links: same-site paths, or https URLs. Anything else falls back. */
const href = (v: unknown, d: string) => (typeof v === "string" && (/^\/[\w\-/#?=&.]*$/.test(v) || /^https:\/\/[^\s"'<>]+$/i.test(v)) ? v.slice(0, 300) : d);

/** Any stored/posted value → a complete, safe Design. */
export function normalizeDesign(raw: unknown): Design {
  // eslint-ignore: values are validated field by field below
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  const d = DESIGN_DEFAULTS;
  return {
    accent: typeof r.accent === "string" && HEX.test(r.accent) ? r.accent.toUpperCase() : d.accent,
    badge: typeof r.badge === "string" && HEX.test(r.badge) ? r.badge.toUpperCase() : null,
    show: {
      buttons: bool(r.show?.buttons, d.show.buttons), badges: bool(r.show?.badges, d.show.badges), highlight: bool(r.show?.highlight, d.show.highlight),
      nav: bool(r.show?.nav, d.show.nav), details: bool(r.show?.details, d.show.details), dark: bool(r.show?.dark, d.show.dark),
    },
    glow: bool(r.glow, d.glow),
    motion: pick(r.motion, ["full", "subtle", "off"] as const, d.motion),
    style: pick(r.style, ["soft", "editorial"] as const, d.style),
    soft: { blur: bool(r.soft?.blur, d.soft.blur), lift: bool(r.soft?.lift, d.soft.lift), round: pick(r.soft?.round, ["soft", "round"] as const, d.soft.round) },
    editorial: {
      numbers: bool(r.editorial?.numbers, d.editorial.numbers), inkRule: bool(r.editorial?.inkRule, d.editorial.inkRule),
      corners: pick(r.editorial?.corners, ["signature", "soft", "sharp"] as const, d.editorial.corners),
      labels: pick(r.editorial?.labels, ["pill", "square"] as const, d.editorial.labels),
      cards: pick(r.editorial?.cards, ["separate", "joined"] as const, d.editorial.cards),
      button: pick(r.editorial?.button, ["sharp", "rounded", "pill"] as const, d.editorial.button),
      headerCta: bool(r.editorial?.headerCta, d.editorial.headerCta),
      footer: pick(r.editorial?.footer, ["light", "dark"] as const, d.editorial.footer),
      planner: pick(r.editorial?.planner, ["sentence", "route"] as const, d.editorial.planner),
      industries: pick(r.editorial?.industries, ["list", "moving"] as const, d.editorial.industries),
    },
    tone: pick(r.tone, ["warm", "white", "cool"] as const, d.tone),
    header: { cta: str(r.header?.cta, d.header.cta, 28), phone: bool(r.header?.phone, d.header.phone) },
    footer: { line1: str(r.footer?.line1, d.footer.line1, 40), line2: str(r.footer?.line2, d.footer.line2, 40) },
    highlight: { style: pick(r.highlight?.style, ["marker", "underline", "color"] as const, d.highlight.style), phrase: str(r.highlight?.phrase, d.highlight.phrase, 60) },
    bar: {
      on: bool(r.bar?.on, d.bar.on), text: str(r.bar?.text, d.bar.text, 140), linkLabel: str(r.bar?.linkLabel, d.bar.linkLabel, 40),
      href: href(r.bar?.href, d.bar.href), tone: pick(r.bar?.tone, ["accent", "dark"] as const, d.bar.tone),
    },
    soon: { text: str(r.soon?.text, d.soon.text, 14) || d.soon.text, pulse: bool(r.soon?.pulse, d.soon.pulse) },
  };
}

/* ── colour maths (WCAG) ── */
const rgb = (hex: string) => (hex.match(/\w\w/g) ?? ["0", "0", "0"]).map((x) => parseInt(x, 16));
function lum(hex: string) {
  const c = rgb(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a: string, b: string) { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }
const INK = "#090B0F", PAPER = "#F9F6F2";
/** Text/icon colour that sits ON the accent fill. */
export const onColor = (hex: string) => (contrast(hex, INK) >= contrast(hex, "#FFFFFF") ? INK : "#FFFFFF");
/** A darker shade of the accent that's readable as text on the off-white page (≥ 4.5:1). */
export function textShade(hex: string) {
  let [r, g, b] = rgb(hex);
  for (let i = 0; i < 40 && contrast(`#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`, PAPER) < 4.5; i++) { r = Math.round(r * 0.92); g = Math.round(g * 0.92); b = Math.round(b * 0.92); }
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

/** CSS variables for :root. */
export function designVars(d: Design): string {
  const badge = d.badge ?? d.accent;
  const tones = { warm: ["#F9F6F2", "#F2EEE4", "#FDFCF9"], white: ["#FFFFFF", "#F4F4F2", "#FFFFFF"], cool: ["#F5F6F8", "#ECEEF2", "#FBFCFD"] }[d.tone];
  return [
    `--paper:${tones[0]}`, `--soft:${tones[1]}`, `--card:${tones[2]}`,
    `--acc:${d.accent}`, `--acc-on:${onColor(d.accent)}`, `--acc-text:${textShade(d.accent)}`,
    `--sig:${badge}`, `--sig-on:${onColor(badge)}`,
  ].join(";");
}
/** data-* attributes for <html> that switch the design rules on. */
export function designAttrs(d: Design): Record<string, string> {
  // Soft fixes its shapes (pill buttons, leaf photos); Editorial lets each be chosen, defaulting to the live look
  const a: Record<string, string> = {
    "data-style": d.style, "data-motion": d.motion, "data-tone": d.tone,
    "data-btn": d.style === "soft" ? "pill" : d.editorial.button,
    "data-corners": d.style === "soft" ? "signature" : d.editorial.corners,
    "data-footer": d.style === "soft" ? "dark" : d.editorial.footer,
    "data-hl": d.show.highlight ? d.highlight.style : "none",
  };
  if (d.style === "soft") { if (d.soft.blur) a["data-soft-blur"] = ""; if (d.soft.lift) a["data-soft-lift"] = ""; a["data-round"] = d.soft.round; }
  else {
    if (d.editorial.numbers) a["data-ed-num"] = ""; if (d.editorial.inkRule) a["data-ed-rule"] = "";
    if (d.editorial.labels === "square") a["data-ed-labels"] = "square";
    if (d.editorial.cards === "joined") a["data-ed-cards"] = "joined";
  }
  for (const k of Object.keys(d.show) as (keyof Design["show"])[]) if (d.show[k]) a[`data-acc-${k}`] = "";
  if (d.soon.pulse) a["data-soon-pulse"] = "";
  if (d.glow) a["data-glow"] = "";
  return a;
}
