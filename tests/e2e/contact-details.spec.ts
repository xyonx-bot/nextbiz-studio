import { expect, test } from "@playwright/test";

/**
 * S6 (r-nbs-s6) — real contact details, live-surface regression.
 * Asserts ONLY code-driven surfaces (lib/content.ts consts: topbar call cell,
 * home inline calls, contact qclose tel link, wa.me deep link) so the checks
 * stay deterministic while the parallel configurator specs mutate DB content.
 * DB-driven text (desk channels) is pinned in tests/content.test.ts instead.
 * Viewport is set INSIDE the tests: every project (375/768/1440) runs them,
 * but the call cell only renders ≥1050px, so the assertions pin one width.
 */

test.describe("contact details (real business number, chrome + deep links)", () => {
  test("topbar call cell + home inline calls dial the real number", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    // topbar call cell (hidden ≤1050 — desktop width pinned above)
    const call = page.locator(".callcell");
    await expect(call).toBeVisible();
    await expect(call).toHaveAttribute("href", "tel:+919088727191");
    await expect(call).toContainText("+91 90887 27191");

    // home inline calls (hero + contact band)
    const inline = page.locator(".inline-call");
    await expect(inline).toHaveCount(2);
    const hrefs = await inline.evaluateAll((els) =>
      els.map((e) => (e as HTMLAnchorElement).getAttribute("href")),
    );
    expect(hrefs).toEqual(["tel:+919088727191", "tel:+919088727191"]);
  });

  test("contact page: wa.me deep link + qclose tel link use the real number", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/contact");

    // WhatsApp click-to-chat (S3 P1.4) — env-driven with the real fallback
    const wa = page.locator(".wa-link");
    await expect(wa).toBeVisible();
    await expect(wa).toHaveAttribute(
      "href",
      new RegExp("^https://wa\\.me/919088727191\\?text="),
    );

    // qclose CTA action dials the real number (label text is DB-driven — href pinned)
    const qcloseAction = page.locator(".qclose a.action");
    await expect(qcloseAction).toHaveCount(1);
    await expect(qcloseAction).toHaveAttribute("href", "tel:+919088727191");
  });
});
