import { test, expect } from "@playwright/test";
const API_BASE = "http://127.0.0.1:4173/api";
const API_GLOB = `${API_BASE}/**`;

const json = (route, body, status = 200) => route.fulfill({
  status,
  contentType: "application/json",
  body: JSON.stringify(body),
});

async function mockBaseApi(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("darb_rewards_auto_opened_v1", "true");
  });
  await page.route(API_GLOB, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    if (pathname === "/api/auth/me") return json(route, { success: false, message: "Not authenticated" }, 401);
    if (pathname === "/api/settings") return json(route, { success: true, data: { currency: "EGP", delivery: { defaultFee: 100, governorateFees: { cairo: 100, giza: 100, alexandria: 100, other: 100 } } } });
    if (pathname === "/api/categories") return json(route, { success: true, data: [] });
    if (pathname === "/api/products" || pathname.includes("/featured") || pathname.includes("/search/suggestions")) return json(route, { success: true, data: [] });
    if (pathname === "/api/bundles") return json(route, { success: true, data: [] });
    if (pathname === "/api/offers") return json(route, { success: true, data: [] });
    if (pathname.includes("/reviews")) return json(route, { success: true, data: [] });
    return json(route, { success: true, data: [] });
  });
}

test("customer and admin auth pages render with password visibility controls", async ({ page }) => {
  await mockBaseApi(page);

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  const loginPassword = page.getByPlaceholder("Your password");
  await expect(loginPassword).toHaveAttribute("type", "password");
  await expect(page.getByRole("button", { name: "Show password" })).toHaveCount(1);
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(loginPassword).toHaveAttribute("type", "text");
  await expect(page.getByRole("button", { name: "Hide password" })).toHaveCount(1);

  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Create Account" })).toBeVisible();
  const registerPassword = page.getByPlaceholder("At least 8 characters");
  await expect(registerPassword).toHaveAttribute("type", "password");
  await expect(registerPassword).toHaveAttribute("minlength", "8");
  await expect(registerPassword).toHaveAttribute("maxlength", "72");
  await expect(page.getByRole("button", { name: "Show password" })).toHaveCount(1);
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(registerPassword).toHaveAttribute("type", "text");

  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: "Admin Login" })).toBeVisible();
  const adminPassword = page.getByPlaceholder("Admin password");
  await expect(adminPassword).toHaveAttribute("type", "password");
  await expect(page.getByRole("button", { name: "Show password" })).toHaveCount(1);
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(adminPassword).toHaveAttribute("type", "text");
});

test("registration requires email or phone before contacting the API", async ({ page }) => {
  await mockBaseApi(page);
  let registrationRequests = 0;
  await page.route(`${API_BASE}/auth/register`, async (route) => {
    registrationRequests += 1;
    return json(route, { success: true, data: { user: {} } });
  });

  await page.goto("/register");
  await page.locator('input[name="name"]').fill("Darb Customer");
  await page.getByPlaceholder("At least 8 characters").fill("strongpass");
  await page.getByRole("button", { name: "Create Account" }).click();

  await expect(page.getByText("Enter an email address or phone number.", { exact: true }).first()).toBeVisible();
  expect(registrationRequests).toBe(0);
});

test("registration rejects passwords beyond bcrypt's UTF-8 byte limit before contacting the API", async ({ page }) => {
  await mockBaseApi(page);
  let registrationRequests = 0;

  await page.route(`${API_BASE}/auth/register`, async (route) => {
    registrationRequests += 1;
    return json(route, { success: true, data: { user: {} } });
  });

  await page.goto("/register");
  await page.locator('input[name="name"]').fill("Darb Customer");
  await page.locator('input[name="email"]').fill("customer@example.com");
  await page.getByPlaceholder("At least 8 characters").fill("🙂".repeat(19));
  await page.getByRole("button", { name: "Create Account" }).click();

  await expect(
    page.getByText("Password is too long. Use 72 UTF-8 bytes or fewer.", { exact: true }).first()
  ).toBeVisible();
  expect(registrationRequests).toBe(0);
});

test("failed logout keeps the authenticated session visible", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("darb_rewards_auto_opened_v1", "true");
  });

  await page.route(API_GLOB, async (route) => {
    const pathname = new URL(route.request().url()).pathname;

    if (pathname === "/api/auth/me") {
      return json(route, {
        success: true,
        data: {
          user: {
            _id: "customer-1",
            name: "Darb Customer",
            email: "customer@example.com",
            phone: "01000000000",
            role: "customer",
            addresses: [],
          },
        },
      });
    }

    if (pathname === "/api/auth/logout") {
      return json(route, { success: false, message: "Logout is temporarily unavailable." }, 503);
    }

    if (pathname === "/api/rewards/mine") {
      return json(route, {
        success: true,
        data: {
          spinAvailable: false,
          spinAvailableCount: 0,
          spins: [],
          available: [],
          history: [],
        },
      });
    }

    if (pathname === "/api/settings") {
      return json(route, { success: true, data: { currency: "EGP" } });
    }

    if (pathname === "/api/categories") return json(route, { success: true, data: [] });
    if (pathname === "/api/products" || pathname.includes("/featured") || pathname.includes("/search/suggestions")) {
      return json(route, { success: true, data: [] });
    }

    return json(route, { success: true, data: [] });
  });

  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "My Account" })).toBeVisible();

  await page.getByRole("button", { name: "Sign Out" }).click();
  await page.getByRole("button", { name: "Log out" }).click();

  await expect(page.getByRole("heading", { name: "My Account" })).toBeVisible();
  await expect(page.getByText("Could not log out", { exact: true })).toBeVisible();
});

test("account-scoped query data is cleared when the authenticated identity changes", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("darb_rewards_auto_opened_v1", "true");
  });

  const users = {
    a: {
      _id: "customer-a",
      name: "Customer A",
      email: "a@example.com",
      phone: "01000000001",
      role: "customer",
      addresses: [],
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    b: {
      _id: "customer-b",
      name: "Customer B",
      email: "b@example.com",
      phone: "01000000002",
      role: "customer",
      addresses: [],
      createdAt: "2026-02-01T00:00:00.000Z",
    },
  };

  const rewards = {
    a: {
      spinAvailable: false,
      spinAvailableCount: 0,
      spins: [],
      available: [{
        _id: "reward-a",
        label: "Customer A private reward",
        code: "ALICE-ONLY-CODE",
        locked: false,
        minSubtotal: 0,
      }],
      history: [],
    },
    b: {
      spinAvailable: false,
      spinAvailableCount: 0,
      spins: [],
      available: [{
        _id: "reward-b",
        label: "Customer B private reward",
        code: "BOB-ONLY-CODE",
        locked: false,
        minSubtotal: 0,
      }],
      history: [],
    },
  };

  let activeIdentity = "a";
  let releaseBRewards;
  const bRewardsGate = new Promise((resolve) => {
    releaseBRewards = resolve;
  });

  await page.route(API_GLOB, async (route) => {
    const pathname = new URL(route.request().url()).pathname;

    if (pathname === "/api/auth/me") {
      return json(route, { success: true, data: { user: users[activeIdentity] } });
    }

    if (pathname === "/api/auth/login") {
      activeIdentity = "b";
      return json(route, {
        success: true,
        data: { user: users.b },
      });
    }

    if (pathname === "/api/rewards/mine") {
      if (activeIdentity === "b") await bRewardsGate;
      return json(route, {
        success: true,
        data: rewards[activeIdentity],
      });
    }

    if (pathname === "/api/settings") {
      return json(route, { success: true, data: { currency: "EGP" } });
    }

    if (pathname === "/api/categories") return json(route, { success: true, data: [] });
    if (pathname === "/api/bundles") return json(route, { success: true, data: [] });
    if (pathname === "/api/offers") return json(route, { success: true, data: [] });
    if (pathname.includes("/reviews")) return json(route, { success: true, data: [] });
    if (pathname === "/api/products" || pathname.includes("/featured") || pathname.includes("/search/suggestions")) {
      return json(route, { success: true, data: [] });
    }

    return json(route, { success: true, data: [] });
  });

  const navigateSpa = async (pathname) => {
    await page.evaluate((nextPathname) => {
      window.history.pushState(window.history.state, "", nextPathname);
      window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
    }, pathname);
  };

  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "My Account" })).toBeVisible();
  await expect(page.getByText("ALICE-ONLY-CODE", { exact: true })).toBeVisible();

  await navigateSpa("/login");
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  await page.locator('input[name="identifier"]').fill("b@example.com");
  await page.getByPlaceholder("Your password").fill("strongpass");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL(/\/account\/orders$/);

  await navigateSpa("/account");
  await expect(page.getByRole("heading", { name: "My Account" })).toBeVisible();

  // B's request is intentionally still held. A's cached reward must already be gone.
  await expect(page.getByText("ALICE-ONLY-CODE", { exact: true })).toHaveCount(0);

  releaseBRewards();

  await expect(page.getByText("BOB-ONLY-CODE", { exact: true })).toBeVisible();
});

test("track order requires order number and checkout phone", async ({ page }) => {
  await mockBaseApi(page);
  await page.goto("/track-order");
  await expect(page.getByText("Order Number", { exact: true })).toBeVisible();
  await expect(page.getByText("Checkout Phone Number", { exact: true })).toBeVisible();
});

test("guest reward claim sends order number and phone together", async ({ page }) => {
  await mockBaseApi(page);
  let captured = null;
  await page.route(`${API_BASE}/rewards/guest/order-spin`, async (route) => {
    captured = route.request().postDataJSON();
    return json(route, { success: false, message: "No unclaimed delivered-order spin is available for those details." }, 409);
  });
  await page.goto("/shop");
  await page.getByRole("button", { name: /Open Darb rewards/i }).click();
  await page.getByLabel("Order number digits").fill("1002");
  await page.getByLabel("Phone used for your order").fill("01130696935");
  await page.getByRole("button", { name: "Claim order spin" }).click();
  await expect.poll(() => captured).toEqual({ orderNumber: "DARB-1002", phone: "01130696935" });
});

test("cart blocks checkout when current availability cannot be verified", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("darb_rewards_auto_opened_v1", "true");
    localStorage.setItem("darb_cart_v1", JSON.stringify([{
      cartItemId: "p1_v1",
      productId: "p1",
      slug: "test-fragrance",
      name: "Test Fragrance",
      arabicName: "",
      image: "",
      categoryName: "Darb",
      arabicCategoryName: "",
      categorySlug: "",
      price: 750,
      compareAtPrice: 0,
      stock: 5,
      sizeLabel: "50 ML",
      sizeMl: 50,
      variant: { variantId: "v1", label: "50 ML", sizeMl: 50, sku: "" },
      quantity: 1,
    }]));
  });
  await page.route(API_GLOB, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/me") return json(route, { success: false }, 401);
    if (pathname === "/api/orders/preview") return json(route, { success: false, message: "Test Fragrance does not have enough stock." }, 400);
    if (pathname === "/api/settings") return json(route, { success: true, data: { currency: "EGP" } });
    return json(route, { success: true, data: [] });
  });
  await page.goto("/cart");
  await expect(page.getByText(/couldn’t verify current availability/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Checkout" })).toBeDisabled();
});
