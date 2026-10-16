import { describe, expect, it } from "vitest";
import { leadSchema, hashIp, clientIp, SERVICE_OPTIONS, BUDGET_OPTIONS } from "@/lib/leads";

const validLead = {
  name: "Test User",
  email: "test@example.com",
  message: "We need a new website for our bakery business.",
};

describe("leadSchema (S3 — zod validation per technical-plan §5)", () => {
  it("accepts a valid lead with email", () => {
    expect(leadSchema.safeParse(validLead).success).toBe(true);
  });
  it("accepts phone instead of email", () => {
    expect(leadSchema.safeParse({ ...validLead, email: "", phone: "+91 98765 43210" }).success).toBe(true);
  });
  it("rejects when both phone and email are missing", () => {
    const r = leadSchema.safeParse({ ...validLead, email: "", phone: "" });
    expect(r.success).toBe(false);
  });
  it("rejects an invalid email", () => {
    const r = leadSchema.safeParse({ ...validLead, email: "not-an-email" });
    expect(r.success).toBe(false);
  });
  it("rejects a too-short name", () => {
    const r = leadSchema.safeParse({ ...validLead, name: "A" });
    expect(r.success).toBe(false);
  });
  it("rejects a too-short message", () => {
    const r = leadSchema.safeParse({ ...validLead, message: "hi" });
    expect(r.success).toBe(false);
  });
  it("rejects service outside the enum (wireframe option set)", () => {
    const r = leadSchema.safeParse({ ...validLead, service: "Something else" });
    expect(r.success).toBe(false);
  });
  it("accepts every wireframe service option", () => {
    for (const s of SERVICE_OPTIONS) {
      expect(leadSchema.safeParse({ ...validLead, service: s }).success).toBe(true);
    }
  });
  it("accepts every wireframe budget option", () => {
    for (const b of BUDGET_OPTIONS) {
      expect(leadSchema.safeParse({ ...validLead, budget: b }).success).toBe(true);
    }
  });
  it("honeypot: schema ignores the field; the route fake-oks bots (no save)", () => {
    const r = leadSchema.safeParse({ ...validLead, website: "http://spam.example" });
    // schema-level: honeypot is IGNORED (zod strips unknown-ish optional) so a
    // bot passes validation — the ROUTE sees website filled and silently
    // returns ok:true while saving nothing.
    expect(r.success).toBe(true);
    expect(r.data?.website).toBe("http://spam.example");
  });
});

describe("rate-limit plumbing", () => {
  it("hashIp is deterministic and salted", () => {
    process.env.IP_HASH_SALT = "test-salt";
    const a = hashIp("1.2.3.4");
    expect(a).toBe(hashIp("1.2.3.4"));
    expect(a).not.toBe(hashIp("1.2.3.5"));
    expect(a).not.toContain("1.2.3.4");
  });
  it("clientIp reads x-forwarded-for first hop (nginx)", () => {
    const h = new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" });
    expect(clientIp(h)).toBe("1.2.3.4");
  });
  it("clientIp falls back to x-real-ip then unknown", () => {
    expect(clientIp(new Headers({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
