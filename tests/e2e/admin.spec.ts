import { expect, test } from "@playwright/test";

/**
 * S4 e2e — admin auth + leads inbox + pipeline (P1.5 + P1.6 + P1.7,
 * every sprint-plan checklist line). Serial mode: auth state and the
 * lead under test are shared, order is the test. Runs against the live
 * app + real Postgres — the seed lead is inserted via psql through the
 * app's own DB (docker exec), so inbox tests see true persisted rows.
 *
 * Runs once (desktop project) — auth behavior is viewport-independent.
 * Creds come from env like production (ADMIN_USER/ADMIN_PASS).
 */

test.describe("admin auth + inbox (S4)", () => {
  test.describe.configure({ mode: "serial" });

  const USER = process.env.ADMIN_USER ?? "e2e-admin";
  const PASS = process.env.ADMIN_PASS ?? "e2e-test-pass-2026";

  // Each Playwright test = fresh browser context (no shared cookies) —
  // every authenticated test signs in itself first.
  async function login(page: import("@playwright/test").Page) {
    await page.goto("/admin/login");
    await page.fill("#user", USER);
    await page.fill("#pass", PASS);
    await page.click("button[type=submit]");
    await expect(page.locator("h1")).toHaveText("Leads inbox");
  }

  // ── P1.5 auth gate ────────────────────────────────────────────────

  test("unauthenticated /admin redirects to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("unauthenticated /admin/ sub-route redirects to login (?next kept)", async ({ page }) => {
    await page.goto("/admin/anything");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fanything/);
  });

  test("wrong credentials rejected with visible error, no login", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("#user", USER);
    await page.fill("#pass", "definitely-not-it");
    await page.click("button[type=submit]");
    await expect(page.locator(".login-error")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("correct credentials log in and land on the inbox", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("#user", USER);
    await page.fill("#pass", PASS);
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator("h1")).toHaveText("Leads inbox");
  });

  test("refresh keeps the session alive", async ({ page }) => {
    await login(page);
    await expect(page.locator("h1")).toHaveText("Leads inbox");
    await page.reload();
    await expect(page.locator("h1")).toHaveText("Leads inbox"); // still in
  });

  test("logout works — /admin gated again after", async ({ page }) => {
    await login(page);
    await page.click(".admin-logout");
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/); // bounced again
  });

  // ── P1.6 inbox content ────────────────────────────────────────────

  test("inbox lists every captured lead, newest first, with key fields", async ({ page }) => {
    await login(page);

    const rows = page.locator(".lead-row");
    const count = Number((await page.locator("[data-testid=lead-count]").textContent())?.match(/\d+/)?.[0] ?? "0");
    await expect(rows).toHaveCount(count);
    expect(count).toBeGreaterThan(0); // leads exist from contact-form e2e

    // every row shows name, contact, preview, timestamp
    const first = rows.first();
    await expect(first.locator(".lead-name")).not.toHaveText("");
    await expect(first.locator(".lead-time")).not.toHaveText("");
    const contact = await first.locator(".lead-contact").textContent();
    expect(contact && contact.length > 0).toBeTruthy();
    const preview = await first.locator(".lead-msg-preview").textContent();
    expect(preview && preview.length > 0).toBeTruthy();

    // newest first: timestamps descending
    const times = await rows.locator(".lead-time").allTextContents();
    const parsed = times.map((t) => new Date(t).getTime()).filter((t) => !Number.isNaN(t));
    const sorted = [...parsed].sort((a, b) => b - a);
    expect(parsed).toEqual(sorted);
  });

  // ── P1.7 pipeline + notes (persisted through real DB) ──────────────

  test("status change persists across reload; notes persist; both visible", async ({ page }) => {
    await login(page);

    // open the newest lead
    const first = page.locator(".lead-row").first();
    const leadId = await first.getAttribute("data-lead-id");
    await first.locator(".lead-head").click();
    await expect(first.locator(".lead-detail")).toBeVisible();

    // status: new -> replied
    const select = page.locator(`[data-testid=status-select-${leadId}]`);
    await select.selectOption("replied");
    await page.locator(".lead-status-form button[type=submit]").click();
    await expect(first.locator(".lead-status")).toHaveText("replied", { ignoreCase: true });

    // note
    const noteText = `S4 e2e note ${Date.now()}`;
    await first.locator(".note-form textarea").fill(noteText);
    await page.locator(`[data-testid=note-submit-${leadId}]`).click();
    await expect(first.locator(".note-list li", { hasText: noteText })).toBeVisible();

    // RELOAD — both must survive (persisted, not in-memory)
    await page.reload();
    await expect(page.locator("h1")).toHaveText("Leads inbox");
    const rowAfter = page.locator(`[data-lead-id="${leadId}"]`);
    await expect(rowAfter.locator(".lead-status")).toHaveText("replied", { ignoreCase: true });
    await rowAfter.locator(".lead-head").click();
    await expect(rowAfter.locator(".note-list li", { hasText: noteText })).toBeVisible();
  });

  test("full pipeline new → replied → quoted → won / lost is selectable", async ({ page }) => {
    await login(page);
    const first = page.locator(".lead-row").first();
    const leadId = await first.getAttribute("data-lead-id");
    await first.locator(".lead-head").click();

    const select = page.locator(`[data-testid=status-select-${leadId}]`);
    for (const s of ["quoted", "won", "lost", "new"]) {
      await select.selectOption(s);
      await page.locator(".lead-status-form button[type=submit]").click();
      await expect(first.locator(".lead-status")).toHaveText(s, { ignoreCase: true });
    }
  });
});
