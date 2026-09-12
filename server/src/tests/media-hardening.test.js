const test = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");

const {
  PAYMENT_PROOF_MAX_HEIGHT,
  PAYMENT_PROOF_MAX_WIDTH,
  processPaymentProof,
  processProductImage,
} = require("../utils/imageProcessor");
const {
  buildPublicMediaKey,
  deletePrivateMedia,
  deletePublicMedia,
  isManagedPrivateMediaKey,
  isManagedPublicMediaKey,
  putPrivateObject,
  putPublicObject,
  publicUrlForKey,
} = require("../services/mediaStorage.service");
const { buildPaymentProofKey } = require("../services/paymentProof.service");
const { getR2Config } = require("../config/r2");
const { sanitizePaymentProofForClient } = require("../utils/paymentProofResponse");
const { sanitizePublicProductMedia, sanitizePublicReviewMedia } = require("../utils/mediaResponse");
const {
  shouldCleanupUploadedMedia,
  shouldDeleteReplacedMedia,
} = require("../utils/mediaLifecycle");
const { assertCustomerReviewUpdateAllowed } = require("../services/reviewVerification.service");
const { serializePublicReview } = require("../controllers/review.controller");
const { classifyUploadError } = require("../middleware/error.middleware");
const {
  PAYMENT_PROOF_MAX_BYTES,
  PUBLIC_IMAGE_MAX_BYTES,
} = require("../middleware/upload.middleware");

const sourceImage = (format) => sharp({
  create: {
    width: 24,
    height: 16,
    channels: 4,
    background: { r: 30, g: 76, b: 61, alpha: 1 },
  },
})[format]().toBuffer();

for (const sourceFormat of ["jpeg", "png", "webp"]) {
  test(`${sourceFormat.toUpperCase()} public source is normalized to WebP`, async () => {
    const result = await processProductImage(await sourceImage(sourceFormat));
    const metadata = await sharp(result.buffer).metadata();
    assert.equal(result.mimeType, "image/webp");
    assert.equal(result.extension, ".webp");
    assert.equal(metadata.format, "webp");
  });
}

test("corrupt image data is rejected as a safe client error", async () => {
  await assert.rejects(
    processProductImage(Buffer.from("not an image")),
    (error) => error.code === "INVALID_IMAGE_DATA" && error.statusCode === 400 && !/sharp/i.test(error.message)
  );
});

test("corrupt image errors map to a safe 400 upload response", () => {
  assert.deepEqual(
    classifyUploadError({
      code: "INVALID_IMAGE_DATA",
      message: "The uploaded file is not a valid JPG, PNG, or WEBP image.",
    }),
    {
      statusCode: 400,
      message: "The uploaded file is not a valid JPG, PNG, or WEBP image.",
    }
  );
});

test("upload middleware limits public images to 5 MB and private proofs to 10 MB", () => {
  assert.equal(PUBLIC_IMAGE_MAX_BYTES, 5 * 1024 * 1024);
  assert.equal(PAYMENT_PROOF_MAX_BYTES, 10 * 1024 * 1024);
});

test("payment proofs are normalized to bounded lossless WebP output", async () => {
  const result = await processPaymentProof(await sourceImage("png"));
  const metadata = await sharp(result.buffer).metadata();
  assert.equal(result.mimeType, "image/webp");
  assert.equal(metadata.format, "webp");
  assert.ok(result.width <= PAYMENT_PROOF_MAX_WIDTH);
  assert.ok(result.height <= PAYMENT_PROOF_MAX_HEIGHT);
});

test("public media keys are server-generated without using an original filename", () => {
  const key = buildPublicMediaKey({
    folder: "products/fragrance",
    baseName: "darb-product",
    id: "fixed-id",
  });
  assert.equal(key, "products/fragrance/darb-product-fixed-id.webp");
  assert.equal(key.includes("customer-upload.jpg"), false);
});

test("payment-proof keys contain no customer-supplied identity", () => {
  const key = buildPaymentProofKey({
    now: new Date("2026-09-12T12:00:00.000Z"),
    id: "fixed-id",
  });
  assert.equal(key, "payment-proofs/2026-09-12/proof-1789214400000-fixed-id.webp");
  assert.equal(/@|\+20|01\d{9}/.test(key), false);
  assert.equal(isManagedPrivateMediaKey(key), true);
});

test("public and private namespaces cannot be crossed", () => {
  assert.equal(isManagedPublicMediaKey("products/item-id.webp"), true);
  assert.equal(isManagedPublicMediaKey("payment-proofs/2026-09-12/proof-id.webp"), false);
  assert.equal(isManagedPrivateMediaKey("products/item-id.webp"), false);
  assert.throws(
    () => publicUrlForKey("payment-proofs/2026-09-12/proof-id.webp"),
    /Invalid public media key/
  );
});

test("R2 configuration rejects a shared public/private bucket", () => {
  const names = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_PUBLIC_BUCKET",
    "R2_PRIVATE_BUCKET",
    "R2_PUBLIC_BASE_URL",
  ];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  Object.assign(process.env, {
    R2_ACCOUNT_ID: "test-account",
    R2_ACCESS_KEY_ID: "test-key",
    R2_SECRET_ACCESS_KEY: "test-secret",
    R2_PUBLIC_BUCKET: "shared-bucket",
    R2_PRIVATE_BUCKET: "shared-bucket",
    R2_PUBLIC_BASE_URL: "https://media.darbfragrance.com",
  });
  try {
    assert.throws(() => getR2Config(), /must be different/);
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});

test("storage helpers refuse crossed namespaces before contacting R2", async () => {
  await assert.rejects(
    putPublicObject({
      buffer: Buffer.from("test"),
      key: "payment-proofs/2026-09-12/proof-id.webp",
      contentType: "image/webp",
    }),
    /Invalid public media object/
  );
  await assert.rejects(
    putPrivateObject({
      buffer: Buffer.from("test"),
      key: "products/item-id.webp",
      contentType: "image/webp",
    }),
    /Invalid private media object/
  );
  assert.equal(await deletePublicMedia("https://example.com/item.webp"), false);
  assert.equal(await deletePrivateMedia("products/item-id.webp"), false);
});

test("configured public media base generates canonical URLs", () => {
  const names = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_PUBLIC_BUCKET",
    "R2_PRIVATE_BUCKET",
    "R2_PUBLIC_BASE_URL",
  ];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  Object.assign(process.env, {
    R2_ACCOUNT_ID: "test-account",
    R2_ACCESS_KEY_ID: "test-key",
    R2_SECRET_ACCESS_KEY: "test-secret",
    R2_PUBLIC_BUCKET: "test-public",
    R2_PRIVATE_BUCKET: "test-private",
    R2_PUBLIC_BASE_URL: "https://media.darbfragrance.com/",
  });
  try {
    assert.equal(
      publicUrlForKey("products/test/item-id.webp"),
      "https://media.darbfragrance.com/products/test/item-id.webp"
    );
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});

test("unknown URLs and malformed keys are never destructive deletion targets", () => {
  for (const value of [
    "https://example.com/image.webp",
    "../products/item.webp",
    "/products/item.webp",
    "products/item.jpg",
    "",
  ]) {
    assert.equal(isManagedPublicMediaKey(value), false);
  }
});

test("public product responses omit managed storage identifiers", () => {
  const result = sanitizePublicProductMedia({
    name: "Darb",
    images: [{
      url: "https://media.darbfragrance.com/products/item.webp",
      publicId: "products/item.webp",
      storageKey: "products/item.webp",
      provider: "r2",
      alt: "Darb",
      isMain: true,
    }],
  });
  assert.deepEqual(result.images, [{
    url: "https://media.darbfragrance.com/products/item.webp",
    alt: "Darb",
    isMain: true,
  }]);
});

test("public review media omits its managed storage identifier", () => {
  assert.deepEqual(
    sanitizePublicReviewMedia({
      type: "image",
      url: "https://media.darbfragrance.com/reviews/item.webp",
      publicId: "reviews/item.webp",
      alt: "Review",
    }),
    {
      type: "image",
      url: "https://media.darbfragrance.com/reviews/item.webp",
      posterUrl: "",
      alt: "Review",
    }
  );
});

test("customer review creation serialization omits managed media and customer/order identifiers", () => {
  const result = serializePublicReview({
    _id: "review-1",
    customer: "customer-1",
    order: "order-1",
    product: { _id: "product-1", name: "Darb Musk", slug: "darb-musk" },
    displayName: "Darb Customer",
    rating: 5,
    text: "A lasting scent.",
    source: "customer",
    isVerifiedPurchase: true,
    media: {
      type: "image",
      url: "https://media.darbfragrance.com/reviews/item.webp",
      publicId: "reviews/item.webp",
    },
  });

  assert.equal(result.customer, undefined);
  assert.equal(result.order, undefined);
  assert.equal(result.media.publicId, undefined);
  assert.equal(result.fragrance._id, "product-1");
});

test("safe payment-proof responses never expose the private object reference", () => {
  const result = sanitizePaymentProofForClient({
    status: "submitted",
    publicId: "payment-proofs/2026-09-12/proof-id.webp",
    storageKey: "payment-proofs/2026-09-12/proof-id.webp",
    bytes: 1200,
  });
  assert.equal(result.status, "submitted");
  assert.equal(result.bytes, 1200);
  assert.equal(result.publicId, undefined);
  assert.equal(result.storageKey, undefined);
  assert.equal(result.url, undefined);
});

test("media lifecycle cleans new uploads on failed persistence and old uploads only after replacement", () => {
  assert.equal(shouldCleanupUploadedMedia({ uploadedKey: "reviews/new.webp", persisted: false }), true);
  assert.equal(shouldCleanupUploadedMedia({ uploadedKey: "reviews/new.webp", persisted: true }), false);
  assert.equal(shouldDeleteReplacedMedia({ previousKey: "reviews/old.webp", nextKey: "reviews/new.webp", persisted: false }), false);
  assert.equal(shouldDeleteReplacedMedia({ previousKey: "reviews/old.webp", nextKey: "reviews/new.webp", persisted: true }), true);
});

test("customer review media remains immutable in the admin editor", () => {
  assert.throws(
    () => assertCustomerReviewUpdateAllowed({
      review: { source: "customer" },
      body: { removeImage: "true" },
    }),
    /cannot be changed/
  );
});
