const sharp = require("sharp");

/* =========================
   DARＢ IMAGE RULES
========================= */

const ALLOWED_IMAGE_FORMATS = new Set([
  "jpeg",
  "png",
  "webp",
]);

const PRODUCT_MAX_WIDTH = 1800;
const PRODUCT_MAX_HEIGHT = 1800;

const PRODUCT_WEBP_QUALITY = 85;

const PAYMENT_PROOF_MAX_WIDTH = 3000;
const PAYMENT_PROOF_MAX_HEIGHT = 3000;

/*
  Protects the server from absurdly
  large/decompression-heavy images.

  40 million pixels is far above what
  Darb actually needs for product photos.
*/
const MAX_INPUT_PIXELS = 40_000_000;

const createInvalidImageError = (message) => {
  const error = new Error(message);
  error.code = "INVALID_IMAGE_DATA";
  error.statusCode = 400;
  return error;
};

/* =========================
   BASIC VALIDATION
========================= */

const ensureImageBuffer = (
  buffer
) => {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length === 0
  ) {
    throw createInvalidImageError(
      "The uploaded image is empty or invalid."
    );
  }
};

/* =========================
   READ REAL IMAGE METADATA

   Important:
   We do not trust only the filename or
   MIME type sent by the browser.

   Sharp actually tries to decode the file.
========================= */

const getImageMetadata = async (
  buffer
) => {
  ensureImageBuffer(buffer);

  try {
    const metadata = await sharp(
      buffer,
      {
        failOn: "error",
        limitInputPixels:
          MAX_INPUT_PIXELS,
      }
    ).metadata();

    if (
      !metadata?.format ||
      !ALLOWED_IMAGE_FORMATS.has(
        metadata.format
      )
    ) {
      throw createInvalidImageError(
        "Unsupported image format."
      );
    }

    if (
      !metadata.width ||
      !metadata.height
    ) {
      throw createInvalidImageError(
        "The uploaded image does not have valid dimensions."
      );
    }

    return metadata;
  } catch (error) {
    if (
      error.message ===
        "Unsupported image format." ||
      error.message ===
        "The uploaded image does not have valid dimensions."
    ) {
      throw error;
    }

    throw createInvalidImageError(
      "The uploaded file is not a valid JPG, PNG, or WEBP image."
    );
  }
};

/* =========================
   PRODUCT IMAGE PROCESSOR
========================= */

const processProductImage =
  async (buffer) => {
    const metadata =
      await getImageMetadata(
        buffer
      );

    try {
      const processedBuffer =
        await sharp(buffer, {
          failOn: "error",
          limitInputPixels:
            MAX_INPUT_PIXELS,
        })
          /*
            Uses EXIF orientation when needed.
            Example:
            phone image uploaded sideways
            → automatically corrected.
          */
          .rotate()

          /*
            Keep the original aspect ratio.

            Images smaller than 1800px are
            NEVER enlarged.
          */
          .resize({
            width:
              PRODUCT_MAX_WIDTH,

            height:
              PRODUCT_MAX_HEIGHT,

            fit: "inside",

            withoutEnlargement:
              true,
          })

          /*
            Convert every accepted source
            format to optimized WEBP.

            Sharp strips unnecessary metadata
            because we are NOT calling
            withMetadata().
          */
          .webp({
            quality:
              PRODUCT_WEBP_QUALITY,

            effort: 4,
          })

          .toBuffer();

      const processedMetadata =
        await sharp(
          processedBuffer
        ).metadata();

      return {
        buffer:
          processedBuffer,

        format:
          "webp",

        mimeType:
          "image/webp",

        extension:
          ".webp",

        width:
          processedMetadata.width ||
          0,

        height:
          processedMetadata.height ||
          0,

        size:
          processedBuffer.length,

        originalFormat:
          metadata.format,

        originalWidth:
          metadata.width,

        originalHeight:
          metadata.height,
      };
    } catch {
      throw createInvalidImageError(
        "The product image could not be processed."
      );
    }
  };

/* =========================
   PAYMENT PROOF PROCESSOR

   We are adding this NOW so the same
   utility is ready when we build
   InstaPay.

   Different policy:
   - preserve small text
   - lossless WEBP
   - no aggressive resizing
========================= */

const processPaymentProof =
  async (buffer) => {
    const metadata =
      await getImageMetadata(
        buffer
      );

    try {
      const processedBuffer =
        await sharp(buffer, {
          failOn: "error",
          limitInputPixels:
            MAX_INPUT_PIXELS,
        })
          .rotate()

          .resize({
            width:
              PAYMENT_PROOF_MAX_WIDTH,

            height:
              PAYMENT_PROOF_MAX_HEIGHT,

            fit: "inside",

            withoutEnlargement:
              true,
          })

          /*
            Lossless because transaction
            IDs, amounts and tiny text matter.
          */
          .webp({
            lossless: true,
            effort: 4,
          })

          .toBuffer();

      const processedMetadata =
        await sharp(
          processedBuffer
        ).metadata();

      return {
        buffer:
          processedBuffer,

        format:
          "webp",

        mimeType:
          "image/webp",

        extension:
          ".webp",

        width:
          processedMetadata.width ||
          0,

        height:
          processedMetadata.height ||
          0,

        size:
          processedBuffer.length,

        originalFormat:
          metadata.format,

        originalWidth:
          metadata.width,

        originalHeight:
          metadata.height,
      };
    } catch {
      throw createInvalidImageError(
        "The payment screenshot could not be processed."
      );
    }
  };

/* =========================
   EXPORTS
========================= */

module.exports = {
  ALLOWED_IMAGE_FORMATS,

  PRODUCT_MAX_WIDTH,
  PRODUCT_MAX_HEIGHT,
  PRODUCT_WEBP_QUALITY,
  PAYMENT_PROOF_MAX_WIDTH,
  PAYMENT_PROOF_MAX_HEIGHT,

  getImageMetadata,
  processProductImage,
  processPaymentProof,
};
