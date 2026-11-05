import { test, expect } from "@playwright/test";
import { staffLogin } from "./helpers";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

test("signed-out visitors can't reach the dashboard or exports", async ({ page, request }) => {
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/admin\/login/);
  const csv = await request.get("/admin/export/orders?from=2026-01-01&to=2026-12-31", { maxRedirects: 0 });
  expect([307, 401]).toContain(csv.status());
});

test("only the business owner can sign in; customer accounts are gone", async ({ page }) => {
  // A non-owner login (e.g. left over from earlier staff accounts) is refused
  const email = `kitchen+${Date.now()}@dsk.test`;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query("insert into staff_users (id, email, name, password_hash, role) values (gen_random_uuid()::text, $1, 'Cook', $2, 'KITCHEN')", [email, await bcrypt.hash("kitchen-password-123", 4)]);
  await pool.end();
  await page.goto("/admin/login");
  await page.fill("#email", email);
  await page.fill("#password", "kitchen-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("don't match the owner account")).toBeVisible();

  // "My account" now leads to the owner sign-in
  await page.goto("/account");
  await expect(page).toHaveURL(/\/admin\/login/);

  // The owner can only create owner logins
  await staffLogin(page);
  await page.goto("/admin/staff");
  await expect(page.getByRole("heading", { name: "Owner login", exact: true })).toBeVisible();
  expect(await page.locator("#s-role option").allTextContents()).toHaveLength(1);
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
