import { expect, test } from "@playwright/test";

/**
 * S5 e2e — page configurator (P1.8 + P1.9) driven through the /api/config
 * routes (the admin UI consumes the same routes once Mira's wireframe lands;
 * the checklist behaviors are the API's contract, so they're provable now).
 *
 * Mutations target the PROJECTS page — no other spec asserts its internals.
 * Every test restores state (content={} renders pure seed; sort/enabled
 * restored from captured values) so downstream specs and reruns are clean.
 * Serial + runs once (desktop): shared config state, order is the test.
 */
test.describe("page configurator (S5)", () => {
  test.describe.configure({ mode: "serial" });

  const USER = process.env.ADMIN_USER ?? "e2e-admin";
  const PASS = process.env.ADMIN_PASS ?? "e2e-test-pass-2026";

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-1440", "config suite runs once — shared state");
  });

  async function login(page: import("@playwright/test").Page) {
    await page.goto("/admin/login");
    await page.fill("#user", USER);
    await page.fill("#pass", PASS);
    await page.click("button[type=submit]");
    await expect(page.locator(".topline h1")).toHaveText("Leads inbox");
  }

  test("unauthenticated /api/config → 401 JSON, never a redirect", async ({ request }) => {
    const res = await request.get("/api/config/pages");
    expect(res.status()).toBe(401);
    expect(res.headers()["content-type"]).toContain("application/json");
  });

  test("GET pages inventory: 9 pages; projects materializes on first touch", async ({ page }) => {
    await login(page);
    const res = await page.request.get("/api/config/pages");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.pages).toHaveLength(9);
    const projects = data.pages.find((p: { key: string }) => p.key === "projects");
    expect(projects.sections.map((s: { key: string }) => s.key)).toEqual([
      "register", "entries", "process", "compass",
    ]);
    expect(projects.sections.every((s: { id: unknown }) => s.id)).toBe(true); // materialized
  });

  test("P1.8: edit a section's content → public page reflects without redeploy", async ({ page }) => {
    await login(page);
    const rows = (await (await page.request.get("/api/config/pages/projects/sections")).json()).sections;
    const register = rows.find((r: { section_key: string }) => r.section_key === "register");

    const marker = `S5 config e2e ${Date.now()}`;
    const patch = await page.request.patch(`/api/config/pages/projects/sections/${register.id}`, {
      data: { content: { lede: marker } },
    });
    expect(patch.status()).toBe(200);

    await page.goto("/projects");
    await expect(page.locator(".lede").first()).toContainText(marker); // override won
    expect(await page.locator("h1").first().textContent()).toContain("Work in"); // seed keys kept

    // restore: empty object override == pure seed render
    const undo = await page.request.patch(`/api/config/pages/projects/sections/${register.id}`, {
      data: { content: {} },
    });
    expect(undo.status()).toBe(200);
    await page.goto("/projects");
    await expect(page.locator(".lede").first()).not.toContainText(marker);
  });

  test("P1.9 disable: hidden publicly, still listed in admin", async ({ page }) => {
    await login(page);
    const rows = (await (await page.request.get("/api/config/pages/projects/sections")).json()).sections;
    const process = rows.find((r: { section_key: string }) => r.section_key === "process");

    const off = await page.request.patch(`/api/config/pages/projects/sections/${process.id}`, {
      data: { enabled: false },
    });
    expect(off.status()).toBe(200);

    await page.goto("/projects");
    await expect(page.locator("main section.process")).toHaveCount(0); // gone publicly

    const after = (await (await page.request.get("/api/config/pages/projects/sections")).json()).sections;
    const stillListed = after.find((r: { section_key: string }) => r.section_key === "process");
    expect(stillListed.enabled).toBe(false); // still listed in admin

    // restore
    await page.request.patch(`/api/config/pages/projects/sections/${process.id}`, {
      data: { enabled: true },
    });
  });

  test("P1.9 reorder: sort change flips public order", async ({ page }) => {
    await login(page);
    const rows = (await (await page.request.get("/api/config/pages/projects/sections")).json()).sections;
    const compass = rows.find((r: { section_key: string }) => r.section_key === "compass");
    const entries = rows.find((r: { section_key: string }) => r.section_key === "entries");

    // compass jumps above entries (default: entries 20, compass 40)
    const move = await page.request.patch(`/api/config/pages/projects/sections/${compass.id}`, {
      data: { sortOrder: 15 },
    });
    expect(move.status()).toBe(200);

    await page.goto("/projects");
    const order = await page.evaluate(() =>
      [...document.querySelectorAll("main > section")].map((el) => el.className.split(" ")[0]),
    );
    // entries render as per-case `.entry` sections — compass must precede them
    expect(order.indexOf("compass")).toBeLessThan(order.indexOf("entry")); // flipped

    // restore original sort
    await page.request.patch(`/api/config/pages/projects/sections/${compass.id}`, {
      data: { sortOrder: compass.sort_order },
    });
    await page.goto("/projects");
    const restored = await page.evaluate(() =>
      [...document.querySelectorAll("main > section")].map((el) => el.className.split(" ")[0]),
    );
    expect(restored.indexOf("entry")).toBeLessThan(restored.indexOf("compass"));
  });

  test("P1.9 remove + add: DELETE hides, POST restores with seed content; 409 on duplicate", async ({ page }) => {
    await login(page);
    const rows = (await (await page.request.get("/api/config/pages/projects/sections")).json()).sections;
    const compass = rows.find((r: { section_key: string }) => r.section_key === "compass");
    const originalSort = compass.sort_order;

    const del = await page.request.delete(`/api/config/pages/projects/sections/${compass.id}`);
    expect(del.status()).toBe(200);
    await page.goto("/projects");
    await expect(page.locator("main section.compass")).toHaveCount(0); // removed publicly

    const dupe = await page.request.post("/api/config/pages/projects/sections", {
      data: { sectionKey: "entries" }, // still on page → 409
    });
    expect(dupe.status()).toBe(409);

    const back = await page.request.post("/api/config/pages/projects/sections", {
      data: { sectionKey: "compass" },
    });
    expect(back.status()).toBe(201);
    await page.goto("/projects");
    await expect(page.locator("main section.compass")).toBeVisible(); // seed content back

    // restore original position (re-add appended it to the end)
    const readded = (await back.json()).section;
    await page.request.patch(`/api/config/pages/projects/sections/${readded.id}`, {
      data: { sortOrder: originalSort },
    });
  });

  test("invalid config never breaks the page (validation + junk-tolerant merge)", async ({ page }) => {
    await login(page);
    const rows = (await (await page.request.get("/api/config/pages/projects/sections")).json()).sections;
    const register = rows.find((r: { section_key: string }) => r.section_key === "register");

    // non-object content → 400, stored value untouched
    const bad = await page.request.patch(`/api/config/pages/projects/sections/${register.id}`, {
      data: { content: "just a string" },
    });
    expect(bad.status()).toBe(400);

    // junk-but-valid override on an unknown key: merges to nothing → page renders
    const junk = await page.request.patch(`/api/config/pages/projects/sections/${register.id}`, {
      data: { content: { zzzBogusKey: { deep: [1, 2] } } },
    });
    expect(junk.status()).toBe(200);
    await page.goto("/projects");
    await expect(page.locator("h1").first()).toContainText("Work in"); // page fine

    // restore
    await page.request.patch(`/api/config/pages/projects/sections/${register.id}`, {
      data: { content: {} },
    });
  });

  test("unknown page/section → 404/400, unknown-route stays 404 publicly", async ({ page }) => {
    await login(page);
    expect((await page.request.get("/api/config/pages/nope/sections")).status()).toBe(404);
    expect((await page.request.post("/api/config/pages/projects/sections", {
      data: { sectionKey: "not-a-section" },
    })).status()).toBe(400);
  });
});
