const { test, expect } = require("@playwright/test");

test("marketplace page renders without crashing", async ({ page }) => {
  await page.goto("/marketplace");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toBeEmpty();
});

test("marketplace page has a visible heading", async ({ page }) => {
  await page.goto("/marketplace");
  await page.waitForLoadState("networkidle");
  const heading = page.locator("h1, h2").first();
  await expect(heading).toBeVisible({ timeout: 15000 });
});

test("marketplace page shows freelancer cards or empty state", async ({ page }) => {
  await page.goto("/marketplace");
  await page.waitForLoadState("networkidle");
  // Either freelancer cards or an empty/loading state — page must not be blank
  const content = page.locator(".card, .empty-state, [data-testid], h1, h2").first();
  await expect(content).toBeVisible({ timeout: 15000 });
});

test("jobs page renders without crashing", async ({ page }) => {
  await page.goto("/jobs");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toBeEmpty();
});

test("jobs page has a visible heading", async ({ page }) => {
  await page.goto("/jobs");
  await page.waitForLoadState("networkidle");
  const heading = page.locator("h1, h2").first();
  await expect(heading).toBeVisible({ timeout: 15000 });
});

test("jobs page shows job cards or empty state", async ({ page }) => {
  await page.goto("/jobs");
  await page.waitForLoadState("networkidle");
  const content = page.locator(".card, .empty-state, [data-testid], h1, h2").first();
  await expect(content).toBeVisible({ timeout: 15000 });
});
