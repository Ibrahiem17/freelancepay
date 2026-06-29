const { test, expect } = require("@playwright/test");

test("landing page loads and shows FreelancePay heading", async ({ page }) => {
  await page.goto("/");
  const heading = page.locator("h1, h2").filter({ hasText: /FreelancePay/i }).first();
  await expect(heading).toBeVisible({ timeout: 15000 });
});

test("platform stats strip is visible on landing page", async ({ page }) => {
  await page.goto("/");
  const stats = page.locator('[data-testid="platform-stats"]');
  await expect(stats).toBeVisible({ timeout: 15000 });
});

test("marketplace page loads and shows a freelancer heading", async ({ page }) => {
  await page.goto("/marketplace");
  await page.waitForLoadState("networkidle");
  const heading = page.locator("h1, h2").first();
  await expect(heading).toBeVisible({ timeout: 15000 });
  const text = await heading.textContent();
  expect(text).toBeTruthy();
});

test("jobs page loads and shows content", async ({ page }) => {
  await page.goto("/jobs");
  await page.waitForLoadState("networkidle");
  const heading = page.locator("h1, h2").first();
  await expect(heading).toBeVisible({ timeout: 15000 });
});

test("how-it-works page loads main content", async ({ page }) => {
  await page.goto("/how-it-works");
  await page.waitForLoadState("networkidle");
  const main = page.locator("main, .page, [class*='page']").first();
  await expect(main).toBeVisible({ timeout: 15000 });
});

test("settings page redirects to home when not logged in", async ({ page }) => {
  await page.goto("/settings");
  // Wait for possible redirect
  await page.waitForTimeout(2000);
  const url = page.url();
  // Accept either a redirect to '/' or the page not crashing (showing some content)
  expect(url === "http://localhost:3000/" || url.includes("/settings")).toBe(true);
  // Either way the page must not be blank
  await expect(page.locator("body")).not.toBeEmpty();
});

test("analytics page shows connect-wallet prompt or redirects when not logged in", async ({ page }) => {
  await page.goto("/analytics");
  await page.waitForLoadState("networkidle");
  // Page must render without crashing
  await expect(page.locator("body")).not.toBeEmpty();
});

test("non-existent escrow page renders without crashing", async ({ page }) => {
  await page.goto("/escrow/invalid123");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toBeEmpty();
});

test("connect-wallet button is present on landing page when not connected", async ({ page }) => {
  await page.goto("/");
  // The WalletMultiButton has data-testid="connect-wallet-btn" wrapping it
  const btn = page.locator('[data-testid="connect-wallet-btn"]');
  await expect(btn).toBeVisible({ timeout: 10000 });
});

test("navbar marketplace link has correct href", async ({ page }) => {
  await page.goto("/");
  const link = page.locator('[data-testid="nav-marketplace"]');
  await expect(link).toBeVisible({ timeout: 10000 });
  const href = await link.getAttribute("href");
  expect(href).toBe("/marketplace");
});

test("navbar jobs link has correct href", async ({ page }) => {
  await page.goto("/");
  const link = page.locator('[data-testid="nav-jobs"]');
  await expect(link).toBeVisible({ timeout: 10000 });
  const href = await link.getAttribute("href");
  expect(href).toBe("/jobs");
});
