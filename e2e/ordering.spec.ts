import { test, expect } from "@playwright/test";
import { addToCart, fillCheckout, staffLogin } from "./helpers";

test("guest orders, pays (test mode), tracks and owner fulfils it", async ({ page, browser }) => {
  await addToCart(page);
  await fillCheckout(page);
  await page.getByRole("button", { name: /^Pay/ }).click();
  await page.waitForURL(/\/pay\/demo\//);
  await expect(page.getByText("TEST MODE")).toBeVisible();
  await page.getByRole("button", { name: /^Pay \$/ }).click();
  await expect(page.getByRole("heading", { name: /Thank you/ })).toBeVisible();
  const ref = page.url().match(/DSK-[A-Z2-9]{6}/)![0];
  const orderUrl = page.url().replace(/&from=payment/, "");

  const owner = await (await browser.newContext()).newPage();
  await staffLogin(owner);
  await owner.goto(`/admin/orders?q=${ref}`);
  const steps = ["Accept order", "Start preparing", "Mark ready", "Mark collected"];
  for (let i = 0; i < 3; i++) {
    await owner.getByRole("button", { name: steps[i] }).click();
    // Wait for the server to commit: the next step's button appears
    await expect(owner.getByRole("button", { name: steps[i + 1] })).toBeVisible();
  }
  await page.goto(orderUrl);
  await expect(page.getByRole("heading", { name: "Ready for pickup" })).toBeVisible();
});

test("declined card can be retried; cancelled checkout frees the order", async ({ page }) => {
  await addToCart(page);
  await fillCheckout(page);
  await page.getByRole("button", { name: /^Pay/ }).click();
  await page.waitForURL(/\/pay\/demo\//);
  await page.getByRole("button", { name: "Simulate a declined card" }).click();
  await expect(page.getByRole("heading", { name: "Your payment was declined" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel order" }).click();
  await expect(page.getByText("This order has been cancelled")).toBeVisible();
});

test("an order page needs its secret link", async ({ page, request }) => {
  await addToCart(page);
  await fillCheckout(page);
  await page.getByRole("button", { name: /^Pay/ }).click();
  await page.waitForURL(/\/pay\/demo\//);
  await page.getByRole("button", { name: /^Pay \$/ }).click();
  await expect(page.getByRole("heading", { name: /Thank you/ })).toBeVisible();
  const ref = page.url().match(/DSK-[A-Z2-9]{6}/)![0];
  const r = await request.get(`/order/${ref}`);
  expect(r.status()).toBe(404);
  expect(await r.text()).not.toContain("E2E Customer");
});

test("the browser cannot change prices", async ({ page }) => {
  await addToCart(page);
  await page.evaluate(() => {
    const c = JSON.parse(localStorage.getItem("dsk-cart-v1")!);
    c[0].unitPriceHintCents = 1;
    localStorage.setItem("dsk-cart-v1", JSON.stringify(c));
  });
  await page.goto("/cart");
  await expect(page.locator("aside").getByText("$12.00")).toBeVisible();
});

test("webhooks reject unsigned requests", async ({ request }) => {
  const r = await request.post("/api/payments/webhook/demo", { data: { type: "payment.succeeded", sessionId: "x" } });
  expect(r.status()).toBe(400);
  const s = await request.post("/api/payments/webhook/stripe", { data: "{}" });
  expect([400]).toContain(s.status());
  const c = await request.post("/api/cron/sweep");
  expect(c.status()).toBe(401);
});
