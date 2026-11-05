import { test, expect } from "@playwright/test";
import { staffLogin } from "./helpers";

test("signed-out visitors can't reach the dashboard or exports", async ({ page, request }) => {
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/admin\/login/);
  const csv = await request.get("/admin/export/orders?from=2026-01-01&to=2026-12-31", { maxRedirects: 0 });
  expect([307, 401]).toContain(csv.status());
});

test("kitchen staff are limited to the kitchen workflow", async ({ page, browser }) => {
  const email = `kitchen+${Date.now()}@dsk.test`;
  await staffLogin(page);
  await page.goto("/admin/staff");
  await page.fill("#s-name", "E2E Cook");
  await page.fill("#s-email", email);
  await page.selectOption("#s-role", "KITCHEN");
  await page.fill("#s-pw", "kitchen-password-123");
  await page.getByRole("button", { name: "Add staff member" }).click();
  await expect(page.getByText("E2E Cook can now sign in")).toBeVisible();

  const k = await (await browser.newContext()).newPage();
  await staffLogin(k, email, "kitchen-password-123");
  for (const path of ["/admin/settings", "/admin/staff", "/admin/payments", "/admin/reports", "/admin/audit", "/admin/notifications", "/admin/customers", "/admin/menu/new"]) {
    await k.goto(path);
    await expect(k).toHaveURL(/denied=1/);
  }
  expect((await k.request.get("/admin/export/orders?from=2026-01-01&to=2026-12-31")).status()).toBe(403);

  // Deactivating signs them out immediately
  await page.reload();
  const row = page.locator("li", { hasText: email });
  await row.getByRole("button", { name: "Deactivate" }).click();
  await expect(row.getByText("Deactivated")).toBeVisible();
  await k.goto("/admin");
  await expect(k).toHaveURL(/\/admin\/login/);
});

test("staff login is rate limited", async ({ page }) => {
  const email = `nobody+${Date.now()}@dsk.test`;
  for (let i = 0; i < 9; i++) {
    await page.goto("/admin/login");
    await page.fill("#email", email);
    await page.fill("#password", "wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("form [role=alert]")).toBeVisible();
  }
  await expect(page.locator("form [role=alert]")).toContainText("Too many sign-in attempts");
});
