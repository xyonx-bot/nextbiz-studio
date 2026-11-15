import type { ResourceEntry } from "@/components/sections/types";

/**
 * Resource library rules — pure, so the page, the detail route and the
 * unlock API agree on what is public and what sits behind an email.
 */

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Visible on the site: not a draft and has a slug + title. */
export function isPublished(e: ResourceEntry): boolean {
  return !e?.draft && str(e?.slug).trim().length > 0 && str(e?.title).trim().length > 0;
}

export const resourceHref = (e: ResourceEntry) =>
  `/resources/${encodeURIComponent(str(e.slug).trim())}`;

export function accessMode(e: ResourceEntry): "open" | "email" | "dm" {
  const m = e.access?.mode;
  return m === "email" || m === "dm" ? m : "open";
}

/** How many prompts/blocks are public before the gate. */
function freeCount(e: ResourceEntry): number {
  const n = Number(e.access?.freeCount);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 1;
}

export interface PublicResource {
  entry: ResourceEntry;        // gated fields stripped
  lockedPrompts: number;
  lockedBlocks: number;
  hasFile: boolean;            // a file/link waits behind the gate
}

/** What the server may render for anyone. Never leaks gated text or fileUrl. */
export function publicView(e: ResourceEntry): PublicResource {
  const mode = accessMode(e);
  const prompts = Array.isArray(e.prompts) ? e.prompts : [];
  const blocks = Array.isArray(e.blocks) ? e.blocks : [];
  const fileUrl = str(e.access?.fileUrl);
  if (mode === "open") {
    return { entry: e, lockedPrompts: 0, lockedBlocks: 0, hasFile: !!fileUrl };
  }
  // dm: everything is delivered in the Instagram chat, nothing renders here
  const n = mode === "email" ? freeCount(e) : 0;
  const nb = mode === "email" ? Math.max(freeCount(e), 1) : 0;
  return {
    entry: {
      ...e,
      prompts: prompts.slice(0, n),
      blocks: blocks.slice(0, nb),
      access: { ...e.access!, fileUrl: "" },
    },
    lockedPrompts: Math.max(prompts.length - n, 0),
    lockedBlocks: Math.max(blocks.length - nb, 0),
    hasFile: !!fileUrl,
  };
}

/** What the unlock API hands back after an email (email-mode items only). */
export function gatedPayload(e: ResourceEntry) {
  const v = publicView(e);
  const prompts = Array.isArray(e.prompts) ? e.prompts : [];
  const blocks = Array.isArray(e.blocks) ? e.blocks : [];
  return {
    prompts: prompts.slice(v.entry.prompts?.length ?? 0),
    blocks: blocks.slice(v.entry.blocks?.length ?? 0),
    fileUrl: str(e.access?.fileUrl),
  };
}

/** Instagram DM deep link (ig.me can't prefill text — the keyword is shown). */
export const igDmUrl = (handle: string) => `https://ig.me/m/${encodeURIComponent(handle.replace(/^@/, ""))}`;

/** Card badge: every item is free; this says how you get it. */
export function accessLabel(e: ResourceEntry): string {
  const m = accessMode(e);
  if (m === "email") return "Free · email unlock";
  if (m === "dm") return `Free · DM ${e.access?.keyword || "START"}`;
  return "Free · open";
}

/** One-line teaser for a card face: first prompt line, else first block, else first "inside" item. */
export function snippetOf(e: ResourceEntry): string {
  const first = e.prompts?.[0]?.text ?? e.blocks?.[0]?.p ?? e.inside?.join(" · ") ?? e.summary;
  const clean = str(first).replace(/\[paste [^\]]+\]\s*/gi, "").replace(/\s+/g, " ").trim();
  return clean.length > 150 ? `${clean.slice(0, 147).trimEnd()}…` : clean;
}
