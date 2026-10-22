import { expect, test } from "@playwright/test";

/**
 * S4 e2e — admin auth + leads inbox + pipeline (P1.5 + P1.6 + P1.7, every
 * sprint-plan checklist line) against Mira's redesigned admin surfaces
 * (login card, sidebar shell, filter pills, 6-col ledger, status chips,
 * lead detail with stepper + quick actions + notes ledger).
 *
 * Serial mode: auth state and the lead under test are shared; order is
 * the test. Runs once (desktop project) — auth behavior is
 * viewport-independent. Creds from env like production.
 */

test.describe("admin auth + inbox + pipeline (S4, Mira redesign)", () => {
  test.describe.configure({ mode: "serial" });

  const USER = process.env.ADMIN_USER ?? "e2e-admin";
  const PASS = process.env.ADMIN_PASS ?? "e2e-test-pass-2026";

  // Runs ONCE (desktop project): the suite mutates shared lead state in
  // serial order — a second project would hit disabled quick-actions from
  // the first project's moves. Responsive coverage is inside (explicit
  // setViewportSize sweeps), auth behavior is viewport-independent.
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-1440",
      "admin suite runs once — viewport-independent",
    );
  });

  async function login(page: import("@playwright/test").Page) {
    await page.goto("/admin/login");
    await page.fill("#user", USER);
    await page.fill("#pass", PASS);
    await page.click("button[type=submit]");
    await expect(page.locator(".topline h1")).toHaveText("Leads inbox");
  }

  // ── P1.5 auth gate ────────────────────────────────────────────────

  test("unauthenticated /admin redirects to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("unauthenticated /admin/* sub-route redirects to login (?next kept)", async ({ page }) => {
    await page.goto("/admin/lead/00000000-0000-0000-0000-000000000000");
    await expect(page).toHaveURL(/\/admin\/login\?next=/);
  });

  test("wrong credentials rejected inline, no login", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("#user", USER);
    await page.fill("#pass", "definitely-not-it");
    await page.click("button[type=submit]");
    await expect(page.locator(".errmsg")).toBeVisible();
    await expect(page.locator(".lrow.err")).toHaveCount(1); // password row flagged
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("correct credentials log in and land on the inbox", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("#user", USER);
    await page.fill("#pass", PASS);
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator(".topline h1")).toHaveText("Leads inbox");
  });

  test("refresh keeps the session alive", async ({ page }) => {
    await login(page);
    await page.reload();
    await expect(page.locator(".topline h1")).toHaveText("Leads inbox"); // still in
  });

  test("logout works — /admin gated again after", async ({ page }) => {
    await login(page);
    await page.click(".sfoot .logout");
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/); // bounced again
  });

  // ── P1.6 inbox content ─────────────────────────────────────────────

  // CI runs this file FIRST on a fresh postgres — the inbox assertions
  // need at least one persisted lead, so capture one through the real API
  // (also proves the capture SYS entry in the notes ledger downstream).
  // Rate-limit budget: 1 insert here + 1 in contact-form.spec = 2 ≤ 5/IP/hr.
  test("seed: a lead captured through the real API (CI DB starts empty)", async ({ request }) => {
    const res = await request.post("/api/leads", {
      data: {
        name: "Admin Suite Seed",
        email: "seed@admin-e2e.nextbizstudio.com",
        message: "Seed lead for inbox assertions — safe to delete.",
      },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  test("inbox lists every captured lead, newest first, with key fields", async ({ page }) => {
    await login(page);

    const rows = page.locator(".ledger .lrow");
    const count = Number(
      (await page.locator("[data-testid=lead-count]").textContent())?.match(/\d+/)?.[0] ?? "0",
    );
    await expect(rows).toHaveCount(count);
    expect(count).toBeGreaterThan(0); // leads exist from contact-form e2e

    // every row shows name, contact, preview, timestamp, chip
    const first = rows.first();
    await expect(first.locator(".nm")).not.toHaveText("");
    await expect(first.locator(".ct")).not.toHaveText("");
    await expect(first.locator(".msg")).not.toHaveText("");
    await expect(first.locator(".ts")).not.toHaveText("");
    await expect(first.locator(".st")).not.toHaveText("");

    // newest first: ISO created-at attributes descending
    const times = await rows.evaluateAll((els) =>
      els.map((el) => el.getAttribute("data-created-at") ?? ""),
    );
    const parsed = times.map((t) => new Date(t).getTime()).filter((t) => !Number.isNaN(t));
    const sorted = [...parsed].sort((a, b) => b - a);
    expect(parsed).toEqual(sorted);
  });

  test("filter pills filter the ledger with live counts", async ({ page }) => {
    await login(page);
    const all = await page.locator(".ledger .lrow").count();
    await page.click(".fpill:not(.on) >> text=/New · /");
    await expect(page.locator(".fbar .fpill.on")).toHaveText(/^New · \d+$/);
    const shown = await page.locator(".ledger .lrow").count();
    expect(shown).toBeLessThanOrEqual(all);
    for (let i = 0; i < shown; i++) {
      await expect(page.locator(".ledger .lrow").nth(i).locator(".st")).toHaveText(/new/i);
    }
  });

  // ── P1.7 pipeline + notes (persisted through real DB) ────────────────

  test("row click opens the lead detail; brief + notes + rail render", async ({ page }) => {
    await login(page);
    await page.locator(".ledger .lrow").first().click();
    await expect(page).toHaveURL(/\/admin\/lead\//);
    await expect(page.locator(".brow")).toHaveCount(6); // name/phone/email/service/budget/message
    await expect(page.locator(".steps .step")).toHaveCount(4); // new/replied/quoted/terminal
    await expect(page.locator(".mrow2")).toHaveCount(5); // meta card
    await expect(page.locator(".ncomposer textarea")).toBeVisible();
  });

  test("status move persists across reload and logs a ledger entry", async ({ page }) => {
    await login(page);
    // rerun-safe: pick a row not already replied (persistent local test DB)
    const row = page.locator('.ledger .lrow:not([data-status="replied"])').first();
    await Promise.all([row.click(), page.waitForURL(/\/admin\/lead\//)]);
    const url = page.url();

    await page.getByTestId("mark-replied").click();
    await expect(page.locator(".topline h1 .st")).toHaveText(/replied/i);

    // reload — status persisted
    await page.reload();
    await expect(page.locator(".topline h1 .st")).toHaveText(/replied/i);

    // status move logged as an inline chip entry in the notes ledger
    await expect(page.locator(".note .st-inline", { hasText: "→ replied" })).toBeVisible();
    expect(page.url()).toBe(url);
  });

  test("desk note persists across reload", async ({ page }) => {
    await login(page);
    await page.locator(".ledger .lrow").first().click();

    const noteText = `S4 redesign note ${Date.now()}`;
    await page.locator(".ncomposer textarea").fill(noteText);
    await page.getByTestId("save-note").click();
    await expect(page.locator(".note .nbody", { hasText: noteText })).toBeVisible();

    await page.reload();
    await expect(page.locator(".note .nbody", { hasText: noteText })).toBeVisible();
  });

  test("full pipeline forward path: quoted → won (terminal)", async ({ page }) => {
    await login(page);
    // rerun-safe: row must not already be quoted or won
    await page.locator('.ledger .lrow:not([data-status="quoted"]):not([data-status="won"])').first().click();

    await page.getByTestId("mark-quoted").click();
    await expect(page.locator(".topline h1 .st")).toHaveText(/quoted/i);
    await page.getByTestId("mark-won").click();
    await expect(page.locator(".topline h1 .st")).toHaveText(/won/i);

    await page.reload();
    await expect(page.locator(".topline h1 .st")).toHaveText(/won/i); // terminal persists
  });

  test("lost path on a lead that isn't lost yet", async ({ page }) => {
    await login(page);
    // rerun-safe: pick any row not already lost (fresh CI DB: all new)
    await page.locator('.ledger .lrow:not([data-status="lost"])').first().click();
    await page.getByTestId("mark-lost").click();
    await expect(page.locator(".topline h1 .st")).toHaveText(/lost/i);
    await page.reload();
    await expect(page.locator(".topline h1 .st")).toHaveText(/lost/i);
  });

  // ── topline actions (wireframe: Export CSV + Open lead) ─────────────

  test("Export CSV downloads the ledger as CSV (auth-gated)", async ({ page }) => {
    await login(page);
    const res = await page.request.get("/admin/export");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");
    const body = await res.text();
    const lines = body.trim().split(/\r?\n/);
    const rowCount = await page.locator(".ledger .lrow").count();
    expect(lines.length).toBe(rowCount + 1); // header + rows
    expect(body.startsWith("id,created_at,name,phone,email,service,budget,status,message")).toBe(true);
  });

  test("Open lead jumps to the newest lead's detail", async ({ page }) => {
    await login(page);
    const firstHref = await page.locator(".ledger .lrow").first().getAttribute("href");
    await page.click(".topline .action");
    await expect(page).toHaveURL(new RegExp(firstHref!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });

  // ── design fidelity (wireframe match — sprint-plan rule Oct 21) ─────

  test("login surface matches the wireframe structure", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.locator(".topstrip")).toBeVisible();
    await expect(page.locator(".logincard")).toBeVisible();
    await expect(page.locator(".lrow")).toHaveCount(2);
    await expect(page.locator(".footstrip")).toBeVisible();
    await expect(page.locator(".lc-head .micro .dot")).toBeVisible(); // live-dot

    // autofill override shipped (login item 4): the -webkit-autofill rule
    // must exist in the live stylesheet with the inset-paper box-shadow
    const hasAutofillOverride = await page.evaluate(() => {
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) {
            const sel = (rule as CSSStyleRule).selectorText ?? "";
            if (sel.includes("-webkit-autofill")) {
              const s = (rule as CSSStyleRule).style;
              const shadow = s.getPropertyValue("-webkit-box-shadow") || s.boxShadow;
              if (shadow.includes("inset")) return true;
            }
          }
        } catch { /* cross-origin sheets */ }
      }
      return false;
    });
    expect(hasAutofillOverride).toBe(true);
  });

  test("inbox shell: sidebar nav + pills + 6-col ledger + chip colors", async ({ page }) => {
    await login(page);
    await expect(page.locator(".side .sbrand")).toHaveText(/Studio Desk/);
    await expect(page.locator(".side nav a.on")).toContainText("Leads");
    // Pages is a real nav target since S5-8 (configurator live); Settings stays a placeholder
    await expect(page.locator(".side nav a[href='/admin/pages']")).toContainText("Pages");
    await expect(page.locator(".side nav .nnav")).toHaveCount(1);
    await expect(page.locator(".fbar .fpill")).toHaveCount(6); // All + 5 statuses
    await expect(page.locator(".lhead span")).toHaveCount(6); // ledger columns

    // chip palette exactly per wireframe (Replied #0B5FA5 on #EAF3FB).
    // State-independent: probe the CSS rule on a detached chip — a fresh
    // CI DB may hold no 'replied' lead when this runs.
    const chip = await page.evaluate(() => {
      // append INSIDE .adminui — the status color vars are scoped there
      const host = document.querySelector(".adminui") ?? document.body;
      const el = document.createElement("span");
      el.className = "st st-replied";
      host.appendChild(el);
      const cs = getComputedStyle(el);
      const out = { color: cs.color, bg: cs.backgroundColor };
      el.remove();
      return out;
    });
    expect(chip.color).toBe("rgb(11, 95, 165)");
    expect(chip.bg).toBe("rgb(234, 243, 251)");
  });

  test("admin pages: no overflow at 375 / 768 / 1280", async ({ page }) => {
    await login(page);
    const detail = await page.locator(".ledger .lrow").first().getAttribute("href");
    for (const w of [375, 768, 1280]) {
      await page.setViewportSize({ width: w, height: w === 375 ? 812 : 900 });
      await page.goto("/admin");
      const over1 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(over1).toBeLessThanOrEqual(0);
      await page.goto(detail!);
      const over2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(over2).toBeLessThanOrEqual(0);
    }
  });

  test("mobile ≤900: burger opens the off-canvas drawer, scrim closes it", async ({ page }) => {
    await login(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator(".mtoggle")).toBeVisible();
    // off-canvas: Playwright calls a translateX'd element "visible" (it has
    // a bounding box), so poll until the .25s slide transition settles and
    // the drawer sits fully left of the viewport
    await expect
      .poll(async () =>
        page.locator(".side").evaluate((el) => Math.round(el.getBoundingClientRect().right)),
      )
      .toBeLessThanOrEqual(0);
    await page.locator(".mtoggle").click();
    await expect(page.locator(".side.open")).toBeVisible();
    await expect(page.locator(".scrim.open")).toBeVisible();
    await page.locator(".scrim").click();
    await expect(page.locator(".side.open")).toHaveCount(0);
  });
});
