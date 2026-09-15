import { test, expect } from "@playwright/test";

const json = (route, body, status = 200) => route.fulfill({
  status,
  contentType: "application/json",
  body: JSON.stringify(body),
});

async function mockBaseApi(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("darb_rewards_auto_opened_v1", "true");
  });
  await page.route("**/api/**", async (route) => {
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

test("customer and admin login pages render", async ({ page }) => {
  await mockBaseApi(page);
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: "Admin Login" })).toBeVisible();
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
  await page.route("**/api/rewards/guest/order-spin", async (route) => {
    captured = route.request().postDataJSON();
    return json(route, { success: false, message: "No unclaimed delivered-order spin is available for those details." }, 409);
  });
  await page.goto("/shop");
  await page.getByRole("button", { name: /Open Darb rewards/i }).click();
  await page.getByLabel("Order number").fill("DARB-1002");
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
  await page.route("**/api/**", async (route) => {
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
