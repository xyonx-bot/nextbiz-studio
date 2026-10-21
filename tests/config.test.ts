import { describe, expect, it } from "vitest";
import { PAGES, PAGE_BY_KEY, deepMerge, sectionsFromSeed } from "@/lib/config";
import homeSeed from "@/lib/seed/home.json";
import aboutSeed from "@/lib/seed/about.json";
import servicesSeed from "@/lib/seed/services.json";
import projectsSeed from "@/lib/seed/projects.json";
import contactSeed from "@/lib/seed/contact.json";

/** S5 configurator core — pure parts (DB paths are covered by e2e). */

describe("deepMerge (seed ⊕ content override)", () => {
  it("overrides scalars, keeps the rest", () => {
    expect(deepMerge({ a: 1, b: "x" }, { b: "y" })).toEqual({ a: 1, b: "y" });
  });

  it("merges nested plain objects recursively", () => {
    expect(deepMerge({ o: { x: 1, y: 2 } }, { o: { y: 9 } })).toEqual({ o: { x: 1, y: 9 } });
  });

  it("replaces arrays wholesale (a list is one value)", () => {
    expect(deepMerge({ items: [1, 2, 3] }, { items: [9] })).toEqual({ items: [9] });
  });

  it("undefined override keeps the seed value; null wins (renders empty, page stays up)", () => {
    expect(deepMerge({ a: 1 }, {})).toEqual({ a: 1 });
    expect(deepMerge({ a: 1 }, { a: null })).toEqual({ a: null });
  });

  it("non-object override replaces the branch entirely", () => {
    expect(deepMerge({ a: { x: 1 } }, { a: "flat" })).toEqual({ a: "flat" });
  });
});

describe("page inventory ↔ seed consistency (every section resolvable)", () => {
  const seeds: Record<string, unknown> = {
    home: homeSeed,
    about: aboutSeed,
    services: servicesSeed,
    projects: projectsSeed,
    contact: contactSeed,
  };

  it("9 pages in the inventory", () => {
    expect(PAGES).toHaveLength(9);
    expect(PAGES.map((p) => p.key)).toEqual([
      "home", "about", "services", "projects", "contact",
      "legal/privacy", "legal/terms", "legal/refund", "legal/cookie",
    ]);
  });

  it("every inventory section key exists in its page seed", () => {
    for (const p of PAGES) {
      if (!(p.key in seeds)) continue; // legal pages resolve via "doc"
      const seed = seeds[p.key] as Record<string, unknown>;
      for (const s of p.sections) {
        expect(seed[s.key], `${p.key}.${s.key}`).toBeTruthy();
      }
    }
  });

  it("every seed sectionOrder key is in the inventory (nothing unmanageable)", () => {
    for (const p of PAGES) {
      if (!(p.key in seeds)) continue;
      const order = (seeds[p.key] as Record<string, unknown>).sectionOrder as string[];
      for (const k of order) {
        expect(p.sections.some((s) => s.key === k), `${p.key}.${k}`).toBe(true);
      }
    }
  });
});

describe("sectionsFromSeed (fallback render — page never breaks)", () => {
  it("composed pages resolve via sectionOrder with content", () => {
    const sections = sectionsFromSeed("contact");
    expect(sections.map((s) => s.key)).toEqual(contactSeed.sectionOrder);
    expect(sections[0].content).toEqual(contactSeed.desk);
  });

  it("legal pages resolve as a single doc section", () => {
    const sections = sectionsFromSeed("legal/privacy");
    expect(sections).toEqual([{ key: "doc", content: expect.objectContaining({ page: "privacy" }) }]);
  });

  it("unknown page → empty list (route 404s upstream, never crashes)", () => {
    expect(sectionsFromSeed("nope")).toEqual([]);
  });
});
