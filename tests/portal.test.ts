import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => { process.env.SESSION_SECRET = "test-secret-for-portal-0123456789"; });

describe("client portal login helpers", async () => {
  const m = await import("@/lib/portal");
  it("passwords hash with a salt and verify only the right password", async () => {
    const a = await m.hashPassword("candles-2026"), b = await m.hashPassword("candles-2026");
    expect(a).not.toBe(b);
    expect(await m.checkPassword("candles-2026", a)).toBe(true);
    expect(await m.checkPassword("candles-2027", a)).toBe(false);
    expect(await m.checkPassword("x", "garbage")).toBe(false);
  });
  it("token hashes are stable, secret-dependent and never the token itself", () => {
    const h = m.hashToken("abc");
    expect(h).toBe(m.hashToken("abc"));
    expect(h).not.toContain("abc");
    expect(m.hashToken("abd")).not.toBe(h);
  });
  it("knows the five stages", () => {
    expect(m.STAGES.map((s) => s.id)).toEqual(["plan", "design", "build", "launch", "care"]);
    expect(m.isStage("build")).toBe(true);
    expect(m.isStage("ship")).toBe(false);
  });
  it("formats sizes", () => {
    expect(m.fmtSize(2048)).toBe("2 KB");
    expect(m.fmtSize(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
