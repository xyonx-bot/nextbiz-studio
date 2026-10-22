import { expect, test } from "@playwright/test";

/**
 * S5-8 e2e — the Pages configurator UI (Mira's admin/pages wireframe) drives
 * the SAME /api/config routes, but this suite proves the checklist behaviors
 * THROUGH THE SURFACE Joydip will use: pick page → edit → save → public
 * reflects (P1.8); hide / reorder / remove / re-add with content preserved
 * (P1.9); legal structure-lock; registry + add-sheet flows.
 *
 * Mutations target the PROJECTS page (no other spec asserts its internals).
 * Every test restores state so downstream specs and reruns stay clean.
 * Serial + runs once (desktop): shared config state, order is the test.
 */
test.describe("admin pages configurator (S5-8)", () => {
  test.describe.configure({ mode: "serial" });

  const USER = process.env.ADMIN_USER ?? "e2e-admin";
  const PASS = process.env.ADMIN_PASS ?? "e2e-test-pass-2026";

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-1440", "configurator suite runs once — shared state");
  });

  async function login(page: import("@playwright/test").Page) {
    await page.goto("/admin/login");
    await page.fill("#user", USER);
    await page.fill("#pass", PASS);
    await page.click("button[type=submit]");
    await expect(page.locator(".topline h1")).toHaveText("Leads inbox");
  }

  async function publicOrder(page: import("@playwright/test").Page) {
    await page.goto("/projects");
    return page.evaluate(() =>
      [...document.querySelectorAll("main > section")].map((el) => el.className.split(" ")[0]),
    );
  }

  test("surface renders: pills, ledger, rules, registry empty state, sidebar active", async ({ page }) => {
    await login(page);
    await page.goto("/admin/pages");
    await expect(page.locator(".topline h1")).toHaveText("Site pages");
    await expect(page.locator(".pbar .ppill")).toHaveCount(9);
    await expect(page.locator(".pbar .count")).toHaveText("9 sections · drag rows to reorder");
    await expect(page.locator(".sledger .srow")).toHaveCount(9);
    await expect(page.locator(".srow[data-key=hero] .sn")).toContainText("Hero");
    await expect(page.locator(".srow[data-key=hero] .sn small")).toHaveText("home.hero");
    // sidebar: Pages row active with count badge
    await expect(page.locator(".side nav a.on")).toContainText("Pages");
    await expect(page.locator(".side nav a.on .cnt")).toHaveText("9");
    // rules callout + empty registry
    await expect(page.locator(".rule .rl")).toHaveText("Reorder rules");
    await expect(page.locator("[data-testid=registry-card]")).toContainText(
      "All 9 registry sections are on this page.",
    );
    // no section selected → dashed empty editor
    await expect(page.locator("[data-testid=section-editor]")).toContainText(
      "Pick a section to edit its content.",
    );
  });

  test("P1.8 via UI: edit content → Save section → public reflects without redeploy", async ({ page }) => {
    await login(page);
    await page.goto("/admin/pages?p=projects");
    await page.click(".srow[data-key=register]");
    await expect(page.locator("[data-testid=editor-subline]")).toContainText(
      "projects.register · changes reflect on the public page immediately — no redeploy",
    );

    const lede = page.locator(".frow", { has: page.locator("label", { hasText: "lede" }) }).locator("input, textarea");
    const original = await lede.inputValue();
    const marker = `UI edit ${Date.now()}`;
    await lede.fill(marker);
    await page.click("[data-testid=save-section]");
    await expect(page.locator(".pfoot .ok")).toContainText("Saved — live on site");

    await page.goto("/projects");
    await expect(page.locator(".register .lede")).toContainText(marker); // live, no redeploy

    // restore
    await page.goto("/admin/pages?p=projects");
    await page.click(".srow[data-key=register]");
    const lede2 = page.locator(".frow", { has: page.locator("label", { hasText: "lede" }) }).locator("input, textarea");
    await lede2.fill(original);
    await page.click("[data-testid=save-section]");
    await expect(page.locator(".pfoot .ok")).toBeVisible();
  });

  test("P1.9 via UI: hide section → public gone; toggle back → restored", async ({ page }) => {
    await login(page);
    await page.goto("/admin/pages?p=projects");
    await page.click(".srow[data-key=process]");
    await page.click(".struct .tog"); // Enabled on page → off
    await expect(page.locator(".srow[data-key=process]")).toHaveClass(/off/);
    await expect(page.locator(".srow[data-key=process] .pst")).toContainText("Hidden");

    await page.goto("/projects");
    await expect(page.locator("main section.process")).toHaveCount(0); // gone publicly
    await expect(page.locator("main section.compass")).toBeVisible(); // page never breaks

    await page.goto("/admin/pages?p=projects");
    await page.click(".srow[data-key=process]");
    await page.click(".struct .tog"); // back on
    await page.goto("/projects");
    await expect(page.locator("main section.process")).toBeVisible();
  });

  test("P1.9 via UI: reorder (row ↑) → public order flips; restore", async ({ page }) => {
    await login(page);
    await page.goto("/admin/pages?p=projects");
    const before = await publicOrder(page);

    await page.goto("/admin/pages?p=projects");
    await page.click(".srow[data-key=compass] .acts button[title='Move up']"); // compass: entries → register
    await expect(page.locator(".srow[data-key=compass] .sn small")).toHaveText("projects.compass");
    const after = await publicOrder(page);
    expect(after.indexOf("compass")).toBeLessThan(before.indexOf("compass")); // moved up publicly

    // restore: compass back down
    await page.goto("/admin/pages?p=projects");
    await page.click(".srow[data-key=compass] .acts button[title='Move down']");
    const restored = await publicOrder(page);
    expect(restored).toEqual(before);
  });

  test("P1.9 via UI: remove → registry row + public gone; re-add → public back, content preserved", async ({ page }) => {
    await login(page);
    // seed an override first so "content preserved" is provable
    await page.goto("/admin/pages?p=projects");
    await page.click(".srow[data-key=register]");
    const lede = page.locator(".frow", { has: page.locator("label", { hasText: "lede" }) }).locator("input, textarea");
    const original = await lede.inputValue();
    const keepMarker = `keep me ${Date.now()}`;
    await lede.fill(keepMarker);
    await page.click("[data-testid=save-section]");
    await expect(page.locator(".pfoot .ok")).toBeVisible();

    // remove register from the page
    await page.click(".srow[data-key=register] .acts .edit"); // editor on register
    await page.click(".struct .btn.danger"); // Remove → inline confirm
    await page.click("[data-testid=confirm-remove]");
    await expect(page.locator(".sledger .srow[data-key=register]")).toHaveCount(0);

    // registry shows it; public page lost it
    const regRow = page.locator("[data-testid=registry-card] .regrow[data-key=register]");
    await expect(regRow).toBeVisible();
    await page.goto("/projects");
    await expect(page.locator("main section.register")).toHaveCount(0);

    // re-add from the registry — content override survives
    await page.goto("/admin/pages?p=projects");
    await regRow.locator(".btn").click();
    await expect(page.locator(".sledger .srow[data-key=register]")).toBeVisible();
    await page.goto("/projects");
    await expect(page.locator("main section.register")).toBeVisible();
    await expect(page.locator(".register .lede")).toContainText(keepMarker); // preserved!

    // restore lede + position (re-add appended register at the end)
    await page.goto("/admin/pages?p=projects");
    await page.click(".srow[data-key=register]");
    const lede2 = page.locator(".frow", { has: page.locator("label", { hasText: "lede" }) }).locator("input, textarea");
    await lede2.fill(original);
    await page.click("[data-testid=save-section]");
    for (let i = 0; i < 3; i++) {
      await page.click(".srow[data-key=register] .acts button[title='Move up']");
    }
    const order = await publicOrder(page);
    expect(order[0]).toBe("register");
  });

  test("add flows: topline + ghost row open the sheet; ESC closes; registry list works", async ({ page }) => {
    await login(page);
    await page.goto("/admin/pages?p=projects");
    // (all 4 projects sections are on the page → sheet shows the empty copy)
    await page.click("[data-testid=add-row]");
    await expect(page.locator("[data-testid=add-sheet]")).toBeVisible();
    await expect(page.locator("[data-testid=add-sheet]")).toContainText(
      "All 4 registry sections are on this page.",
    );
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-testid=add-sheet]")).toHaveCount(0);
  });

  test("legal pages structure-locked: single doc section, no add/remove/reorder controls", async ({ page }) => {
    await login(page);
    await page.goto("/admin/pages?p=legal/privacy");
    await expect(page.locator(".pbar .count")).toHaveText("1 section · structure locked");
    await expect(page.locator(".sledger .srow")).toHaveCount(1);
    await expect(page.locator(".srow[data-key=doc]")).toBeVisible();
    await expect(page.locator("[data-testid=add-row]")).toHaveCount(0);
    await expect(page.locator("#pages-add-act")).toHaveCount(0);
    await expect(page.locator(".rule")).toHaveCount(0);
    await expect(page.locator("[data-testid=registry-card]")).toHaveCount(0);

    // content editing still offered
    await page.click(".srow[data-key=doc]");
    await expect(page.locator("[data-testid=editor-subline]")).toContainText("legal/privacy.doc");
    await expect(page.locator("[data-testid=structure-card]")).toHaveCount(0); // no structure ops
  });

  test("page picker: pill navigation switches pages", async ({ page }) => {
    await login(page);
    await page.goto("/admin/pages");
    await page.click(".ppill:has-text('About Us')");
    await expect(page.locator(".srow[data-key=masthead] .sn")).toContainText("Masthead");
    await expect(page.locator(".ppill.on")).toHaveText("About Us");
    await page.click(".ppill:has-text('Contact')");
    await expect(page.locator(".srow[data-key=desk] .sn")).toContainText("Request desk opener");
  });
});
