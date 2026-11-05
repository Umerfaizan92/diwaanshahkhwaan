import { defineConfig } from "@playwright/test";
import "dotenv/config";

/**
 * End-to-end tests run against a running server (npm run build && npm start) using the
 * demo payment provider and a seeded database. BASE_URL defaults to http://localhost:3000.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:3000", trace: "retain-on-failure" },
});
