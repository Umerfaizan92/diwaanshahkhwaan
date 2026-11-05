import { expect, type Page } from "@playwright/test";

export const PUBLIC_PAGES = ["/", "/menu", "/menu/shahi-chicken-biryani", "/menu/shahi-chicken-korma", "/specials", "/weekly-menu", "/order-ahead", "/about", "/contact", "/faq", "/allergens", "/refunds", "/terms", "/privacy", "/cart", "/checkout", "/account"];

export async function staffLogin(page: Page, email = process.env.SEED_OWNER_EMAIL!, password = process.env.SEED_OWNER_PASSWORD!) {
  await page.goto("/admin/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: /Hello/ })).toBeVisible();
}

export async function addToCart(page: Page, slug = "shahi-chicken-biryani") {
  await page.goto(`/menu/${slug}`);
  await page.getByRole("button", { name: /Add to order/ }).click();
  await expect(page.getByText(/Added \d+ ×/)).toBeVisible();
}

export async function fillCheckout(page: Page, email = `e2e+${Date.now()}@example.com`) {
  await page.goto("/checkout");
  await page.locator('label:has(input[type=radio][name$="-slot"]:not([disabled]))').first().click();
  await page.fill("#name", "E2E Customer");
  await page.fill("#phone", "0412 345 678");
  await page.fill("#email", email);
  await page.locator("input[name=acceptTerms]").check();
}
