import { test, expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import type { Page } from "@playwright/test";

// @axe-core/playwright bundles a newer playwright-core type; the runtime API is identical
const axe = (page: Page) => new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] });
import { PUBLIC_PAGES, staffLogin, addToCart } from "./helpers";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

for (const theme of ["dark", "light"] as const) {
  test(`public pages pass axe WCAG 2.2 AA (${theme})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    if (theme === "light") await page.addInitScript(() => localStorage.setItem("dsk-theme", "light"));
    await addToCart(page);
    const failures: string[] = [];
    for (const path of PUBLIC_PAGES) {
      await page.goto(path, { waitUntil: "networkidle" });
      const r = await axe(page).withTags(WCAG).analyze();
      for (const v of r.violations) failures.push(`${path}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target.join(" ")}`);
    }
    expect(failures).toEqual([]);
  });
}

test("admin pages pass axe WCAG 2.2 AA", async ({ page }) => {
  await staffLogin(page);
  const failures: string[] = [];
  for (const path of ["/admin", "/admin/orders", "/admin/production", "/admin/menu", "/admin/categories", "/admin/media", "/admin/schedule", "/admin/payments", "/admin/customers", "/admin/reports", "/admin/messages", "/admin/notifications", "/admin/settings", "/admin/staff", "/admin/audit", "/admin/menu/new"]) {
    await page.goto(path, { waitUntil: "networkidle" });
    const r = await axe(page).withTags(WCAG).analyze();
    for (const v of r.violations) failures.push(`${path}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target.join(" ")}`);
  }
  expect(failures).toEqual([]);
});

for (const width of [320, 375, 768, 1024, 1440]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await addToCart(page);
    const overflow: string[] = [];
    for (const path of PUBLIC_PAGES) {
      await page.goto(path, { waitUntil: "networkidle" });
      const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (o > 0) overflow.push(`${path} +${o}px`);
    }
    expect(overflow).toEqual([]);
  });
}

test("reduced motion: hero content is visible without animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const opacity = await page.getByRole("heading", { level: 1 }).evaluate((el) => getComputedStyle(el).opacity);
  expect(opacity).toBe("1");
});

test("keyboard: skip link and menu tabs", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  const tab = page.getByRole("tab").first();
  await tab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab").nth(1)).toBeFocused();
  await expect(page.getByRole("tab").nth(1)).toHaveAttribute("aria-selected", "true");
});
