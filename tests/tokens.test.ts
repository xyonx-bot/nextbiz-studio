import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * S1-3 spot-check: three design-sheet hexes must appear verbatim in
 * styles/tokens.css (sheet is law; guards against typos during port).
 */
describe("tokens.css matches design-sheet.html", () => {
  const tokens = readFileSync(join(process.cwd(), "styles/tokens.css"), "utf8");
  const sheetHexes: Array<[string, string]> = [
    ["--paper", "#F9F6F2"],
    ["--ink", "#090B0F"],
    ["--slab", "#1B1D21"],
  ];
  for (const [name, hex] of sheetHexes) {
    it(`${name} = ${hex}`, () => {
      expect(tokens).toMatch(new RegExp(`${name}:\\s*${hex}\\b`));
    });
  }
  it("closed accent set present", () => {
    expect(tokens).toMatch(/--note-blue:\s*#ABE4FF/);
    expect(tokens).toMatch(/--star-gold:\s*#F5A400/);
    expect(tokens).toMatch(/--live-green:\s*#77D199/);
  });
});

/** Content seed sanity: every home section key exists and is non-empty. */
describe("home content seed", () => {
  it("has all 9 sections the home page renders", async () => {
    const seed = (await import("@/lib/seed/home.json")).default;
    const required = [
      "hero", "partners", "about", "services", "work",
      "industries", "testimonial", "team", "contactBand",
    ];
    for (const key of required) {
      expect(seed.sectionOrder).toContain(key);
      expect((seed as Record<string, unknown>)[key]).toBeTruthy();
    }
  });
  it("no lorem ipsum, no Lovable references (design-sheet hard rules)", async () => {
    const raw = JSON.stringify((await import("@/lib/seed/home.json")).default);
    expect(raw.toLowerCase()).not.toContain("lorem");
    expect(raw.toLowerCase()).not.toContain("lovable");
  });
});
