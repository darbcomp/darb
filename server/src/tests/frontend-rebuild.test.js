const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const { readFileSync } = require("node:fs");

const {
  DEPLOY_HOOK_ENV_NAME,
  triggerFrontendRebuild,
} = require("../services/frontendRebuild.service");

const makeResponse = () => ({
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const makeQuery = (value) => ({
  select() { return this; },
  populate() { return this; },
  lean() { return Promise.resolve(value); },
  then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
});

const loadControllerWithMocks = (controllerPath, mocks) => {
  const resolvedController = require.resolve(controllerPath);
  delete require.cache[resolvedController];

  const originalLoad = Module._load;
  Module._load = function mockedLoad(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) {
      return mocks[request];
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require(controllerPath);
  } finally {
    Module._load = originalLoad;
    delete require.cache[resolvedController];
  }
};

test("frontend rebuild no-ops when the hook environment variable is absent", async () => {
  let fetchCalls = 0;
  const result = await triggerFrontendRebuild("product-created", {
    env: {},
    fetchImpl: async () => {
      fetchCalls += 1;
      return { ok: true };
    },
  });

  assert.deepEqual(result, { triggered: false, outcome: "not-configured" });
  assert.equal(fetchCalls, 0);
});

test("frontend rebuild sends a bodyless POST to the configured hook", async () => {
  const hookUrl = "https://api.cloudflare.test/deploy-hook/private-token";
  let captured;

  const result = await triggerFrontendRebuild("category-updated", {
    env: { [DEPLOY_HOOK_ENV_NAME]: hookUrl },
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return { ok: true, status: 200 };
    },
  });

  assert.deepEqual(result, { triggered: true, outcome: "accepted" });
  assert.equal(captured.url, hookUrl);
  assert.equal(captured.options.method, "POST");
  assert.equal(captured.options.body, undefined);
  assert.equal(captured.options.headers, undefined);
  assert.ok(captured.options.signal instanceof AbortSignal);
});

test("frontend rebuild contains non-success responses", async () => {
  const warnings = [];
  const result = await triggerFrontendRebuild("product-updated", {
    env: { [DEPLOY_HOOK_ENV_NAME]: "https://api.cloudflare.test/private" },
    fetchImpl: async () => ({ ok: false, status: 503 }),
    logger: { warn: (message) => warnings.push(message) },
  });

  assert.deepEqual(result, { triggered: false, outcome: "non-success-response" });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /product-updated/);
  assert.match(warnings[0], /HTTP 503/);
});

test("frontend rebuild swallows network errors without logging the hook URL", async () => {
  const hookUrl = "https://api.cloudflare.test/deploy-hook/sensitive-token";
  const warnings = [];
  const result = await triggerFrontendRebuild("product-image-deleted", {
    env: { [DEPLOY_HOOK_ENV_NAME]: hookUrl },
    fetchImpl: async () => {
      throw new Error(`request failed for ${hookUrl}`);
    },
    logger: { warn: (message) => warnings.push(message) },
  });

  assert.deepEqual(result, { triggered: false, outcome: "request-error" });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /product-image-deleted/);
  assert.equal(warnings[0].includes(hookUrl), false);
  assert.equal(warnings[0].includes("sensitive-token"), false);
});

test("successful product creation schedules a rebuild", { concurrency: false }, async () => {
  const reasons = [];
  const Product = {
    findOne: () => makeQuery(null),
    create: async () => ({ _id: "product-id" }),
    findById: () => makeQuery({ _id: "product-id", slug: "barq" }),
  };
  const Category = {
    findOne: async () => ({ _id: "category-id", name: "Men", slug: "men" }),
  };
  const controller = loadControllerWithMocks("../controllers/product.controller", {
    mongoose: { connection: { readyState: 1 }, Types: { ObjectId: { isValid: () => false } } },
    "../models/Product": Product,
    "../models/Category": Category,
    "../services/mediaStorage.service": {
      uploadOptimizedPublicImage: async () => ({}),
      deletePublicMedia: async () => {},
    },
    "../services/frontendRebuild.service": {
      scheduleFrontendRebuild: (reason) => reasons.push(reason),
    },
  });
  const res = makeResponse();

  await controller.createProduct(
    { body: { name: "Barq", category: "men", isActive: false }, files: [] },
    res
  );

  assert.equal(res.statusCode, 201);
  assert.deepEqual(reasons, ["product-created"]);
});

test("failed product creation does not schedule a rebuild", { concurrency: false }, async () => {
  const reasons = [];
  const controller = loadControllerWithMocks("../controllers/product.controller", {
    mongoose: { connection: { readyState: 1 }, Types: { ObjectId: { isValid: () => false } } },
    "../models/Product": { findOne: () => makeQuery({ _id: "duplicate" }) },
    "../models/Category": {},
    "../services/mediaStorage.service": {
      uploadOptimizedPublicImage: async () => ({}),
      deletePublicMedia: async () => {},
    },
    "../services/frontendRebuild.service": {
      scheduleFrontendRebuild: (reason) => reasons.push(reason),
    },
  });
  const res = makeResponse();

  await controller.createProduct({ body: { name: "Barq" }, files: [] }, res);

  assert.equal(res.statusCode, 409);
  assert.deepEqual(reasons, []);
});

test("successful category creation schedules a rebuild", { concurrency: false }, async () => {
  const reasons = [];
  const controller = loadControllerWithMocks("../controllers/category.controller", {
    mongoose: { connection: { readyState: 1 } },
    "../models/Category": {
      findOne: async () => null,
      create: async (payload) => ({ _id: "category-id", ...payload }),
    },
    "../models/Product": {},
    "../services/mediaStorage.service": {
      uploadOptimizedPublicImage: async () => ({}),
      deletePublicMedia: async () => {},
    },
    "../services/frontendRebuild.service": {
      scheduleFrontendRebuild: (reason) => reasons.push(reason),
    },
  });
  const res = makeResponse();

  await controller.createCategory({ body: { name: "Men" }, file: null }, res);

  assert.equal(res.statusCode, 201);
  assert.deepEqual(reasons, ["category-created"]);
});

const makeSettings = () => ({
  storeName: "Darb",
  arabicName: "Darb",
  tagline: "A scent for every path.",
  currency: "EGP",
  contact: {},
  delivery: {},
  paymentMethods: {},
  orderSettings: {},
  brand: {},
  seo: { metaTitle: "Old title", metaDescription: "Old description" },
  marketingPixels: {},
  save: async function save() {},
});

test("settings rebuild only follows a persisted SEO change", { concurrency: false }, async () => {
  for (const scenario of [
    { body: { seo: { metaTitle: "New title" } }, expected: ["seo-settings-updated"] },
    { body: { contact: { phone: "+20 100" } }, expected: [] },
  ]) {
    const reasons = [];
    const settings = makeSettings();
    const controller = loadControllerWithMocks("../controllers/settings.controller", {
      mongoose: { connection: { readyState: 1 } },
      "../models/StoreSettings": { findOne: async () => settings },
      "../services/frontendRebuild.service": {
        scheduleFrontendRebuild: (reason) => reasons.push(reason),
      },
    });
    const res = makeResponse();

    await controller.updateAdminSettings({ body: scenario.body }, res);

    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.deepEqual(reasons, scenario.expected);
  }
});

test("all approved admin mutation reasons are wired and order flows remain untouched", () => {
  const productSource = readFileSync(
    require.resolve("../controllers/product.controller"),
    "utf8"
  );
  const categorySource = readFileSync(
    require.resolve("../controllers/category.controller"),
    "utf8"
  );
  const orderSource = readFileSync(
    require.resolve("../controllers/order.controller"),
    "utf8"
  );

  for (const reason of [
    "product-created",
    "product-updated",
    "product-deactivated",
    "product-deleted",
    "product-image-deleted",
  ]) {
    assert.equal(productSource.split(`scheduleFrontendRebuild("${reason}")`).length - 1, 1);
  }

  for (const reason of [
    "category-created",
    "category-updated",
    "category-deactivated",
    "category-deleted",
  ]) {
    assert.equal(categorySource.split(`scheduleFrontendRebuild("${reason}")`).length - 1, 1);
  }

  assert.equal(orderSource.includes("frontendRebuild.service"), false);
  assert.equal(orderSource.includes("scheduleFrontendRebuild"), false);
});
