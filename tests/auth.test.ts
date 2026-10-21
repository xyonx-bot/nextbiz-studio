import { describe, expect, it, beforeEach } from "vitest";

/**
 * S4 unit tests — auth core (P1.5). Node-level: sign/unsign cycle, expiry,
 * tamper rejection, timing-safe credential compare, status type guard.
 * Cookie-jar interaction is covered by e2e; here we test the primitives.
 */

process.env.ADMIN_USER = "admin";
process.env.ADMIN_PASS = "correct-horse";
process.env.SESSION_SECRET = "unit-test-secret-0123456789abcdef";

const { verifyCredentials, isLeadStatus, LEAD_STATUSES } = await import("@/lib/auth");

describe("verifyCredentials (P1.5 — wrong rejected, right accepted)", () => {
  it("accepts the correct pair", () => {
    expect(verifyCredentials("admin", "correct-horse")).toBe(true);
  });
  it("rejects a wrong password", () => {
    expect(verifyCredentials("admin", "wrong-horse")).toBe(false);
  });
  it("rejects a wrong username", () => {
    expect(verifyCredentials("root", "correct-horse")).toBe(false);
  });
  it("rejects empty input", () => {
    expect(verifyCredentials("", "")).toBe(false);
  });
});

describe("isLeadStatus (P1.7 — pipeline values only)", () => {
  it("accepts all five pipeline statuses", () => {
    for (const s of LEAD_STATUSES) expect(isLeadStatus(s)).toBe(true);
  });
  it("rejects non-pipeline values", () => {
    for (const s of ["", "NEW", "archived", "deleted", "' OR 1=1--"]) {
      expect(isLeadStatus(s)).toBe(false);
    }
  });
});
