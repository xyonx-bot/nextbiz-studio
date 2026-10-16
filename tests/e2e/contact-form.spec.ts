import { expect, test } from "@playwright/test";

/**
 * S3 — contact form end-to-end (P1.3 + P1.4 checklist lines).
 * Runs against a live DB (docker compose up nextbiz-db) — leads really save.
 * Slack: SLACK_WEBHOOK_URL decides real ping vs logged skip; the response
 * contract is identical either way (fire-and-forget).
 */

const form = (page: import("@playwright/test").Page) => ({
  name: page.locator('.form-sheet input[name="name"]'),
  phone: page.locator('.form-sheet input[name="phone"]'),
  email: page.locator('.form-sheet input[name="email"]'),
  service: page.locator('.form-sheet select[name="service"]'),
  budget: page.locator('.form-sheet select[name="budget"]'),
  brief: page.locator('.form-sheet textarea[name="brief"]'),
  submit: page.locator(".f-submit"),
});

test.describe("contact form (P1.3)", () => {
  // success-panel tests submit real leads; parallel contexts share one IP and
  // trip the 5/hour rate limit (desktop test eats the slots). Serial keeps
  // them deterministic; RATE_LIMIT_DISABLED is NOT set in CI/e2e — the app
  // under test stays production-config, serial order keeps submissions ≤ 5.
  test.describe.configure({ mode: "serial" });
  test.beforeEach(async ({ page }) => {
    await page.goto("/contact");
  });

  test("empty submit is blocked with visible validation", async ({ page }) => {
    const f = form(page);
    await f.name.fill("");
    await f.brief.fill("");
    await f.submit.click();
    await expect(page.locator(".f-error").first()).toBeVisible();
    await expect(page.locator(".f-error").first()).not.toHaveText("");
  });

  test("invalid email is blocked", async ({ page }) => {
    const f = form(page);
    await f.name.fill("E2E Tester");
    await f.email.fill("not-an-email");
    await f.brief.fill("This is a long enough brief for validation to pass otherwise.");
    await f.submit.click();
    await expect(page.locator(".f-error").first()).toBeVisible();
  });

  test("valid submit → success panel (real API, mobile-375 project only)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-375", "real submission runs once — see rate-limit note");
    const f = form(page);
    await f.name.fill("E2E Mobile");
    await f.phone.fill("+91 98765 43210");
    await f.brief.fill("E2E test lead from mobile — safe to delete.");
    await f.submit.click();
    await expect(page.getByText("Brief received.")).toBeVisible({ timeout: 15000 });
  });

  test("valid submit → success panel (mocked response, all projects)", async ({ page }) => {
    // UI path is exercised without hitting the real rate-limited API:
    // intercept POST /api/leads and reply like the route does. The real API
    // (validation, DB, Slack) is proven by unit tests + live smoke + the
    // one real submission test above.
    await page.route("**/api/leads", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, lead: { id: "test-id", createdAt: new Date().toISOString() } }),
      });
    });
    const f = form(page);
    await f.name.fill("E2E Mocked");
    await f.email.fill("e2e-mocked@test.nextbizstudio.com");
    await f.service.selectOption("A new website");
    await f.budget.selectOption("₹25k – ₹75k");
    await f.brief.fill("Mocked submit — UI path only, no API hit.");
    await f.submit.click();
    await expect(page.getByText("Brief received.")).toBeVisible({ timeout: 15000 });
  });

  test("honeypot filled → fake-ok, no success panel change demanded", async ({ request }) => {
    // API-level: bots hitting the endpoint directly get ok without a save
    const res = await request.post("/api/leads", {
      data: {
        name: "Bot Bot",
        email: "bot@spam.example",
        message: "buy my thing now please",
        website: "http://spam.example",
      },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });
});

test.describe("WhatsApp deep-link (P1.4)", () => {
  test("visible next to the form, wa.me with prefilled text", async ({ page }) => {
    await page.goto("/contact");
    const wa = page.locator(".wa-link");
    await expect(wa).toBeVisible();
    const href = await wa.getAttribute("href");
    expect(href).toContain("wa.me/");
    expect(href).toContain("text=");
    const decoded = decodeURIComponent(href!);
    expect(decoded).toContain("Hi NextBiz Studio");
  });

  test("no-overflow regression on contact with new form states", async ({ page }) => {
    for (const w of [375, 768, 1440]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto("/contact");
      await page.waitForLoadState("networkidle");
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(over).toBeLessThanOrEqual(0);
    }
  });
});
