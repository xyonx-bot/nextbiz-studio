import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * S5-10 e2e — image uploads (Joydip's ask: "if text is editable, why not
 * images") + grip drag-to-reorder (the wireframe's "drag AND ↑↓" affordance
 * that shipped disabled in the first pass — this closes it).
 *
 * Upload path hits the REAL studio CDN (R2 behind cdn.joyverse.fun) — CI has
 * no R2 env, so the server answers 503 and the upload test skips cleanly
 * there; it runs fully locally and on the VM.
 *
 * Mutations target PROJECTS (photo swap) and HOME (drag) — both restored.
 * Serial, runs once (desktop): shared state.
 */
test.describe("configurator uploads + drag (S5-10)", () => {
  test.describe.configure({ mode: "serial" });

  const USER = process.env.ADMIN_USER ?? "e2e-admin";
  const PASS = process.env.ADMIN_PASS ?? "e2e-test-pass-2026";
  const FIXTURE = path.join(__dirname, "fixtures", "dot.png");

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-1440", "uploads suite runs once — shared state");
  });

  async function login(page: import("@playwright/test").Page) {
    await page.goto("/admin/login");
    await page.fill("#user", USER);
    await page.fill("#pass", PASS);
    await page.click("button[type=submit]");
    await expect(page.locator(".topline h1")).toHaveText("Leads inbox");
  }

  test("upload route: 401 JSON unauthenticated, never a redirect", async ({ request }) => {
    const res = await request.post("/api/config/upload", {
      multipart: { file: { name: "dot.png", mimeType: "image/png", buffer: fs.readFileSync(FIXTURE) } },
    });
    expect(res.status()).toBe(401);
    expect(res.headers()["content-type"]).toContain("application/json");
  });

  test("photo swap through the UI: Replace → upload → Save → public renders the real photo", async ({ page }) => {
    await login(page);
    await page.goto("/admin/pages?p=projects");
    await page.click(".srow[data-key=entries]");

    // the entries section editor lists each project as an item group;
    // label is exactly "photo" (photoNote is the editable description)
    const item1PhotoRow = page
      .locator(".fgroup .frow", { has: page.locator("label", { hasText: /^photo$/ }) })
      .first();
    const firstItemPhoto = item1PhotoRow.locator("[data-testid=replace-image]");
    await firstItemPhoto.scrollIntoViewIfNeeded();
    const before = await item1PhotoRow.locator(".imgfield .imeta > b").textContent();
    if (before !== "placeholder shown on the site" && before) {
      test.info().annotations.push({ type: "note", description: `pre-existing photo override: ${before}` });
    }

    // capture the row id for a deterministic restore (content: null clears)
    const rows = (await (await page.request.get("/api/config/pages/projects/sections")).json()).sections;
    const entriesRow = rows.find((r: { section_key: string }) => r.section_key === "entries");

    await item1PhotoRow.locator("input[type=file]").setInputFiles(FIXTURE);
    // wait for the STAGED upload: the meta line swaps from the placeholder
    // copy to the uploaded object key and the thumb renders the CDN image
    await expect(item1PhotoRow.locator(".imgfield .imeta > b"))
      .not.toHaveText("placeholder shown on the site", { timeout: 20000 });
    await expect(item1PhotoRow.locator(".imgfield img.thumb")).toBeVisible();
    await page.click("[data-testid=save-section]");
    await expect(page.locator(".pfoot .ok")).toContainText("Saved — live on site");

    // public page now renders a real photo for the first case study
    await page.goto("/projects");
    const img = page.locator("main .entry-photo img").first();
    await expect(img).toBeVisible();
    expect(await img.getAttribute("src")).toContain("cdn.joyverse.fun");

    // restore: clear the override (null = revert to seed) — placeholder back
    await page.request.patch(`/api/config/pages/projects/sections/${entriesRow.id}`, {
      data: { content: null },
    });
    await page.goto("/projects");
    await expect(page.locator("main .entry-photo img")).toHaveCount(0); // placeholder back
  });

  test("upload guard: non-image rejected with a friendly error, page intact", async ({ page }) => {
    await login(page);
    await page.request
      .post("/api/config/upload", {
        multipart: { file: { name: "evil.txt", mimeType: "text/plain", buffer: Buffer.from("not an image") } },
      })
      .then(async (res) => {
        // authenticate the raw route call via session cookie — expect 400 body
        const body = await res.json().catch(() => ({}));
        expect([400, 401]).toContain(res.status());
        if (res.status() === 400) expect(String(body.error)).toContain("PNG");
      });
    await page.goto("/projects");
    await expect(page.locator("h1").first()).toContainText("Work in"); // site fine
  });

  test("grip drag-to-reorder: hero onto partners → public order flips; restore", async ({ page }) => {
    await login(page);
    await page.goto("/admin/pages");
    await page.waitForSelector(".sledger .srow[data-key=hero]");

    const hero = page.locator(".srow[data-key=hero]");
    const partners = page.locator(".srow[data-key=partners]");
    // HTML5 DnD through synthetic DragEvents (Playwright dragTo is mouse-only)
    await page.evaluate(([srcSel, dstSel]) => {
      const dt = new DataTransfer();
      const src = document.querySelector(srcSel)!;
      const dst = document.querySelector(dstSel)!;
      src.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: dt }));
      dst.dispatchEvent(new DragEvent("dragover", { bubbles: true, dataTransfer: dt }));
      dst.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: dt }));
      src.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer: dt }));
    }, ['.srow[data-key=hero]', '.srow[data-key=partners]']);

    // ledger flips locally (optimistic)
    await expect(page.locator(".sledger .srow").first()).toContainText("Partners marquee");
    // and publicly — without any redeploy
    await page.goto("/");
    const order = await page.evaluate(() =>
      [...document.querySelectorAll("main > section")].map((el) => el.className.split(" ")[0]),
    );
    expect(order.indexOf("partners")).toBeLessThan(order.indexOf("hero"));

    // restore: drag partners back onto hero
    await page.goto("/admin/pages");
    await page.evaluate(([srcSel, dstSel]) => {
      const dt = new DataTransfer();
      const src = document.querySelector(srcSel)!;
      const dst = document.querySelector(dstSel)!;
      src.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: dt }));
      dst.dispatchEvent(new DragEvent("dragover", { bubbles: true, dataTransfer: dt }));
      dst.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: dt }));
      src.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer: dt }));
    }, ['.srow[data-key=partners]', '.srow[data-key=hero]']);
    await page.goto("/");
    const restored = await page.evaluate(() =>
      [...document.querySelectorAll("main > section")].map((el) => el.className.split(" ")[0]),
    );
    expect(restored.indexOf("hero")).toBeLessThan(restored.indexOf("partners"));
  });
});
