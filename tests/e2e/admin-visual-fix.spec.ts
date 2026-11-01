import { expect, test } from "@playwright/test";

/**
 * r-nbs-admin-visual-fix — Mira's Oct 24 live visual pass, 6-item fix list
 * (source of truth: ~/workspaces/mira/prototypes/nextbizstudio/admin/).
 * Geometry probes via getComputedStyle, per the fidelity self-check rule:
 *   (1) per-surface tab titles on /admin, /admin/lead/*, /admin/login
 *   (2) lead panel heads = 1px var(--line) hairline (2px ink scoped to pages)
 *   (3) login .lc-head 760 override wins (specificity-tied selector)
 *   (4) move-to rbtns fill the .btnrow grid cells (form display:contents)
 *   (5) .content/.dwrap/.pagescontent x-pad == chrome clamp(14px,2.5vw,28px)
 *   (6) inbox .lhead :nth-child(5) "Received" right-aligned
 *
 * Serial + desktop-1440 only (viewport is set per test). Seeds ONE lead via
 * the real API — rate-limit budget: 1 insert.
 */

// PROD GUARD — this spec mutates the DB (seed lead); never run against prod.
const PROD_DB_URL = process.env.DATABASE_URL ?? "";
if (PROD_DB_URL.includes("nextbiz-db:5432") || PROD_DB_URL.includes("nextbizstudio.com")) {
  console.error("[PROD GUARD] DATABASE_URL points to production. E2E suite aborted.");
  process.exit(0);
}

const USER = process.env.ADMIN_USER ?? "e2e-admin";
const PASS = process.env.ADMIN_PASS ?? "e2e-test-pass-2026";

test.describe("admin visual fix (r-nbs-admin-visual-fix)", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-1440",
      "runs once on desktop — viewport is set per test",
    );
  });

  async function login(page: import("@playwright/test").Page) {
    await page.goto("/admin/login");
    await page.fill("#user", USER);
    await page.fill("#pass", PASS);
    await page.click("button[type=submit]");
    await expect(page.locator(".topline h1")).toHaveText("Leads inbox");
  }

  async function openFirstLead(page: import("@playwright/test").Page) {
    await page.goto("/admin");
    const row = page.locator(".lrow").first();
    await Promise.all([row.click(), page.waitForURL(/\/admin\/lead\//)]);
  }

  const cs = (page: import("@playwright/test").Page, sel: string) =>
    page.locator(sel).first().evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        display: s.display,
        borderBottomWidth: s.borderBottomWidth,
        borderBottomColor: s.borderBottomColor,
        paddingTop: s.paddingTop,
        paddingRight: s.paddingRight,
        paddingBottom: s.paddingBottom,
        paddingLeft: s.paddingLeft,
        textAlign: s.textAlign,
      };
    });

  test("(1) per-surface tab titles — login, inbox, lead detail", async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto("/admin/login");
    await expect(page).toHaveTitle("Sign in — Studio Desk | NextBiz Studio");

    // seed one lead with a known name (newest-first ⇒ first inbox row)
    const res = await request.post("/api/leads", {
      data: {
        name: "Visual Fix Seed",
        email: "vfseed@e2e.nextbizstudio.com",
        message: "Seed for tab-title probe — safe to delete.",
      },
    });
    expect(res.status()).toBe(200);

    await login(page);
    await expect(page).toHaveTitle("Leads inbox — Studio Desk | NextBiz Studio");

    const row = page.locator(".lrow", { hasText: "Visual Fix Seed" }).first();
    await Promise.all([row.click(), page.waitForURL(/\/admin\/lead\//)]);
    await expect(page).toHaveTitle("Visual Fix Seed — Studio Desk | NextBiz Studio");
  });

  test("(2) lead panel heads compute 1px hairline; pages configurator keeps 2px ink", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);
    await openFirstLead(page);

    const leadHead = await cs(page, ".dcol-l .panel .phead");
    expect(leadHead.borderBottomWidth).toBe("1px");
    expect(leadHead.borderBottomColor).toBe("rgb(221, 218, 213)"); // var(--line) #dddad5

    await page.goto("/admin/pages");
    // the editor panel's .phead only renders once a section is selected
    await page.locator(".srow").first().click();
    await expect(page.locator(".pagescontent .panel .phead")).toBeVisible();
    const pagesHead = await cs(page, ".pagescontent .panel .phead");
    expect(pagesHead.borderBottomWidth).toBe("2px");
  });

  test("(4) move-to buttons fill the btnrow grid cells", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);
    await openFirstLead(page);

    const forms = await page.locator(".ract .btnrow form").evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).display),
    );
    expect(forms.length).toBe(4);
    for (const d of forms) expect(d).toBe("contents");

    const rowW = (await page.locator(".ract .btnrow").boundingBox())!.width;
    const btnWs = await page.locator(".ract .btnrow .rbtn").evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().width),
    );
    expect(btnWs.length).toBe(4);
    const expected = (rowW - 7) / 2; // 1fr 1fr grid, 7px gap
    for (const w of btnWs) expect(Math.abs(w - expected)).toBeLessThan(2);
  });

  test("(5) content rails x-align with chrome at 1440 (28px)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);

    await page.goto("/admin");
    const inbox = await cs(page, ".content");
    const topline = await cs(page, ".topline");
    expect(inbox.paddingLeft).toBe("28px");
    expect(inbox.paddingLeft).toBe(topline.paddingLeft);

    await openFirstLead(page);
    const dwrap = await cs(page, ".dwrap");
    expect(dwrap.paddingLeft).toBe("28px");
    expect(dwrap.paddingLeft).toBe(topline.paddingLeft);

    await page.goto("/admin/pages");
    const pages = await cs(page, ".pagescontent");
    expect(pages.paddingLeft).toBe("28px");
  });

  test("(6) inbox Received header right-aligned", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);
    await page.goto("/admin");
    await expect(page.locator(".ledger .lhead")).toBeVisible();
    const head5 = await page
      .locator(".ledger .lhead span:nth-child(5)")
      .evaluate((el) => getComputedStyle(el).textAlign);
    expect(head5).toBe("right");
  });

  test("(3) login card head padding at 375 is 18/18/14", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/admin/login");
    await expect(page.locator(".logincard .lc-head")).toBeVisible();
    const pad = await cs(page, ".logincard .lc-head");
    expect(pad.paddingTop).toBe("18px");
    expect(pad.paddingRight).toBe("18px");
    expect(pad.paddingBottom).toBe("14px");
    expect(pad.paddingLeft).toBe("18px");
  });
});
