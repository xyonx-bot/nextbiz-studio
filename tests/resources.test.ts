import { describe, it, expect } from "vitest";
import { publicView, gatedPayload, isPublished, accessLabel, snippetOf, igDmUrl } from "@/lib/resources";
import type { ResourceEntry } from "@/components/sections/types";
import resourcesSeed from "@/lib/seed/resources.json";

const base: ResourceEntry = {
  id: "x", slug: "x", type: "prompt", title: "X", summary: "s",
  prompts: [1, 2, 3, 4].map((n) => ({ title: `P${n}`, text: `text ${n}` })),
  access: { mode: "email", freeCount: 1, fileUrl: "https://secret.example/file" },
};

describe("resource gating", () => {
  it("email mode shows only freeCount prompts and never the file URL", () => {
    const v = publicView(base);
    expect(v.entry.prompts).toHaveLength(1);
    expect(v.lockedPrompts).toBe(3);
    expect(v.hasFile).toBe(true);
    expect(JSON.stringify(v.entry)).not.toContain("secret.example");
    expect(JSON.stringify(v.entry)).not.toContain("text 2");
  });

  it("gated payload returns exactly the hidden part", () => {
    const g = gatedPayload(base);
    expect(g.prompts.map((p) => p.title)).toEqual(["P2", "P3", "P4"]);
    expect(g.fileUrl).toBe("https://secret.example/file");
  });

  it("open mode shows everything", () => {
    const v = publicView({ ...base, access: { mode: "open" } });
    expect(v.entry.prompts).toHaveLength(4);
    expect(v.lockedPrompts).toBe(0);
  });

  it("dm mode shows no prompts and no file", () => {
    const v = publicView({ ...base, access: { mode: "dm", keyword: "N8N", fileUrl: "https://secret.example/f" } });
    expect(v.entry.prompts).toHaveLength(0);
    expect(JSON.stringify(v.entry)).not.toContain("secret.example");
    expect(accessLabel(base)).toBe("Free · email unlock");
  });

  it("drafts and slugless entries are not published", () => {
    expect(isPublished({ ...base, draft: true })).toBe(false);
    expect(isPublished({ ...base, slug: " " })).toBe(false);
    expect(isPublished(base)).toBe(true);
  });

  it("snippet strips [paste …] placeholders and clamps length", () => {
    expect(snippetOf({ ...base, prompts: [{ title: "a", text: "[paste CHARACTER DNA]\n\nDraw it" }] })).toBe("Draw it");
    expect(snippetOf({ ...base, prompts: [{ title: "a", text: "y".repeat(400) }] }).length).toBeLessThanOrEqual(150);
  });

  it("ig.me link drops a leading @", () => {
    expect(igDmUrl("@nextbizstudio")).toBe("https://ig.me/m/nextbizstudio");
  });
});

describe("resources seed", () => {
  const entries = (resourcesSeed as unknown as { entries: ResourceEntry[] }).entries;
  it("slugs and ids are unique", () => {
    expect(new Set(entries.map((e) => e.slug)).size).toBe(entries.length);
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
  });
  it("every entry type has a label", () => {
    const keys = resourcesSeed.library.types.map((t) => t.key);
    for (const e of entries) expect(keys).toContain(e.type);
  });
  it("ships at least 6 published resources", () => {
    expect(entries.filter(isPublished).length).toBeGreaterThanOrEqual(6);
  });
});
