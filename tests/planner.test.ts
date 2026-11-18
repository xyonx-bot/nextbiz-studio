import { describe, expect, it } from "vitest";
import { PRICING_DEFAULTS, buildPlan, type Answers } from "@/lib/planner-core";

const all = (t: string) => PRICING_DEFAULTS.types.find((x) => x.id === t)!.features.map((f) => f.id);
const plan = (a: Partial<Answers>) => buildPlan(PRICING_DEFAULTS, { type: "website", industry: "", size: "small", features: [], when: "normal", budget: "", ...a });

describe("project planner budget", () => {
  it("never recommends an option over a small budget when the core fits — extras move to phase 2", () => {
    const p = plan({ type: "website", features: all("website"), budget: "u25", when: "asap" });
    const best = p.options.find((o) => o.tier === p.recommended)!;
    expect(best.price).toBeLessThanOrEqual(25000);
    expect(p.phased).toBe(true);
    expect(p.options[0].later.length).toBeGreaterThan(0);
    expect(p.tight).toBe(false);
  });
  it("is honest when even the smallest version is over budget, and suggests something that fits", () => {
    const p = plan({ type: "custom", budget: "u25" });
    expect(p.tight).toBe(true);
    expect(p.alt).not.toBeNull();
    expect(p.alt!.price).toBeLessThanOrEqual(25000);
  });
  it("recommends the biggest option that fits a larger budget", () => {
    const p = plan({ type: "store", budget: "2l+" });
    expect(p.recommended).toBe("premium");
  });
  it("adds the rush fee for ASAP", () => {
    expect(plan({ when: "asap" }).options[1].price).toBeGreaterThan(plan({ when: "normal" }).options[1].price);
  });
  it("sizing answers add to every option and to the core price", () => {
    const small = plan({ type: "store" }), big = plan({ type: "store", scope: { products: "n4", upload: "u3" } });
    big.options.forEach((o, i) => expect(o.price).toBeGreaterThan(small.options[i].price));
    expect(big.core).toBeGreaterThan(small.core);
    expect(big.options[0].weeks).toBeGreaterThan(small.options[0].weeks);
  });
  it("ignores unknown sizing answers", () => {
    expect(plan({ scope: { pages: "nope" } }).options[1].price).toBe(plan({}).options[1].price);
  });
});
