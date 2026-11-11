const { test, expect } = require("@playwright/test");
const { getAdminCredentials, assertNoHorizontalOverflow } = require("./helpers");

test.describe("Phase 6.3 user journeys", () => {
  test("homepage loads featured vehicles and navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Get recommendations").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /explore vehicles/i }).first()).toBeVisible();
    await expect(page.getByLabel(/quick vehicle search/i)).toBeVisible();
    await expect(page.getByText(/loading vehicles|could not load|no vehicles/i).or(page.locator("article").first())).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator("article").first()).toBeVisible({ timeout: 30000 });
    await assertNoHorizontalOverflow(page);
  });

  test("quick search navigates to filtered explore page", async ({ page }) => {
    await page.goto("/");
    await page.locator("#home-brand").fill("Tata");
    await page.locator('form[aria-label="Quick vehicle search"]').getByRole("button", { name: /^search$/i }).click();
    await expect(page).toHaveURL(/\/vehicles/, { timeout: 15000 });
    await expect(page).toHaveURL(/brand=Tata/);
    await expect(page.locator("article").first()).toBeVisible({ timeout: 30000 });
  });

  test("explore vehicles supports filters and pagination", async ({ page }) => {
    await page.goto("/vehicles");
    await expect(page.locator("article").first()).toBeVisible({ timeout: 30000 });

    const fuelPetrol = page.locator(".hidden.lg\\:block").getByRole("button", { name: /^Petrol$/i });
    if (await fuelPetrol.count()) {
      await fuelPetrol.first().click();
      await expect(page).toHaveURL(/fuel_type=Petrol/, { timeout: 15000 });
    }
    await expect(page.locator("article").first()).toBeVisible({ timeout: 20000 });

    const next = page.getByRole("link", { name: /next/i }).or(page.getByRole("button", { name: /next/i })).first();
    if ((await next.count()) && (await next.isEnabled())) {
      await next.click();
      await expect(page).toHaveURL(/page=2/);
    }
  });

  test("vehicle details, invalid slug, and compare action", async ({ page }) => {
    await page.goto("/vehicles");
    await expect(page.locator("article").first()).toBeVisible({ timeout: 20000 });
    await page.locator("article").first().getByRole("link").first().click();
    await expect(page).toHaveURL(/\/vehicles\//);
    await expect(page.getByRole("button", { name: /add to compare/i })).toBeVisible({
      timeout: 20000,
    });
    await page.getByRole("button", { name: /add to compare/i }).click();
    await expect(page.getByRole("button", { name: /added to compare/i })).toBeVisible();

    await page.goto("/vehicles/this-vehicle-does-not-exist-99999999");
    await expect(page.getByText(/not found|unavailable|could not|failed/i).first()).toBeVisible({
      timeout: 20000,
    });
  });

  test("compare page manages selected vehicles", async ({ page }) => {
    await page.goto("/vehicles");
    await expect(page.locator("article").first()).toBeVisible({ timeout: 20000 });

    const cards = page.locator("article");
    const count = Math.min(await cards.count(), 2);
    for (let i = 0; i < count; i += 1) {
      await cards.nth(i).getByRole("link").first().click();
      await page.getByRole("button", { name: /add to compare/i }).click();
      await page.goto("/vehicles");
      await expect(page.locator("article").first()).toBeVisible({ timeout: 20000 });
    }

    await page.goto("/compare");
    await expect(page.getByRole("heading", { name: /compare/i }).first()).toBeVisible();
    await expect(page.locator("article").first()).toBeVisible({ timeout: 20000 });
    await assertNoHorizontalOverflow(page);
  });

  test("AI recommendations NL extract → confirm → ranked results", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/recommendations");
    await expect(page.getByLabel(/describe the car you need/i)).toBeVisible();
    await page
      .getByLabel(/describe the car you need/i)
      .fill("I need an automatic petrol SUV under 15 lakh with good mileage and safety");
    await page.getByRole("button", { name: /extract preferences/i }).click();

    const showBtn = page.getByRole("button", { name: /show recommendations/i });
    const geminiError = page.getByText(/gemini|temporarily unavailable|rate limit|timed out/i);
    await expect(showBtn.or(geminiError)).toBeVisible({ timeout: 90_000 });

    if (await geminiError.isVisible()) {
      // Ranking must still be reachable via structured form when Gemini is down.
      await page.getByRole("tab", { name: /structured|form/i }).click();
      await page.getByRole("button", { name: /show recommendations/i }).click();
      await expect(
        page.getByText(/your top|best match|no vehicles matched|no matches|eligible|found/i).first()
      ).toBeVisible({ timeout: 60_000 });
      return;
    }

    await showBtn.click();
    await expect(
      page.getByText(/your top|best match|no vehicles matched|no matches|eligible/i).first()
    ).toBeVisible({ timeout: 90_000 });
  });

  test("admin login, dashboard, protected route, logout", async ({ page }) => {
    const { email, password } = getAdminCredentials();
    test.skip(!password, "INITIAL_ADMIN_PASSWORD not configured");

    await page.goto("/admin/vehicles");
    await expect(page).toHaveURL(/\/admin\/login/);

    await page.locator("#email").fill(email);
    await page.locator("#password").fill("wrong-password");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page.getByRole("alert")).toBeVisible();

    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/admin(?!\/login)/, { timeout: 20000 });
    await expect(page.getByText(/dashboard|vehicles|signed in/i).first()).toBeVisible({
      timeout: 20000,
    });

    await page.getByRole("button", { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("admin vehicle CRUD with HTTPS image URL", async ({ page }) => {
    const { email, password } = getAdminCredentials();
    test.skip(!password, "INITIAL_ADMIN_PASSWORD not configured");

    await page.goto("/admin/login");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/admin(?!\/login)/, { timeout: 20000 });

    await page.goto("/admin/vehicles/new");
    await page.locator("#brand").fill("E2EPlay");
    await page.locator("#model").fill("PilotCar");
    await page.locator("#variant").fill("SpecA");
    await page.locator("#price").fill("875000");
    await page.locator("#image_url").fill("https://example.com/e2e-playwright.jpg");
    await page.getByRole("button", { name: /create vehicle/i }).click();

    await expect(page).toHaveURL(/\/admin\/vehicles\/\d+\/edit$/, { timeout: 20000 });
    // Dismiss success toast that can intercept clicks.
    await page.keyboard.press("Escape");
    await page.locator("#image_url").fill("https://example.com/e2e-playwright-updated.jpg");
    await page.getByRole("button", { name: /save changes/i }).click({ force: true });
    await expect(page.locator("#image_url")).toHaveValue(
      "https://example.com/e2e-playwright-updated.jpg",
      { timeout: 20000 }
    );

    await page.goto("/admin/vehicles");
    const search = page.getByPlaceholder(/search/i).first();
    if (await search.count()) {
      await search.fill("E2EPlay");
      await page.waitForTimeout(700);
    }
    const row = page.locator("tr", { hasText: "E2EPlay" }).first();
    await expect(row).toBeVisible({ timeout: 20000 });
    await row.getByRole("button", { name: /delete/i }).click();
    await page.getByRole("button", { name: /delete vehicle/i }).click();
    await expect(page.locator("tr", { hasText: "E2EPlay" })).toHaveCount(0, {
      timeout: 20000,
    });
  });
});

test.describe("Phase 6.3 responsive viewports", () => {
  for (const width of [1440, 1280, 768, 390, 360]) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/", "/vehicles", "/compare", "/recommendations"]) {
        await page.goto(path);
        await page.waitForLoadState("domcontentloaded");
        await assertNoHorizontalOverflow(page);
      }
    });
  }

  test("mobile navigation opens", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const menu = page.getByRole("button", { name: /open|menu|navigation/i }).first();
    if (await menu.isVisible()) {
      await menu.click();
      await expect(page.getByRole("link", { name: /explore vehicles|vehicles/i }).first()).toBeVisible();
    }
  });
});
