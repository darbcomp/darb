const { randomUUID } = require("crypto");
const {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { getR2Client, getR2Config } = require("../config/r2");
const { processProductImage } = require("../utils/imageProcessor");

const sanitizeKeyPart = (value = "media") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "media";

const publicUrlForKey = (key) => {
  const { publicBaseUrl } = getR2Config();
  const encoded = String(key)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${publicBaseUrl}/${encoded}`;
};

const putPublicObject = async ({ buffer, key, contentType = "image/webp", cacheControl = "public, max-age=31536000, immutable" }) => {
  const { publicBucket } = getR2Config();
  await getR2Client().send(new PutObjectCommand({
    Bucket: publicBucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: cacheControl,
  }));
  return {
    url: publicUrlForKey(key),
    publicId: key,
    storageKey: key,
    provider: "r2",
  };
};

const putPrivateObject = async ({ buffer, key, contentType = "image/webp" }) => {
  const { privateBucket } = getR2Config();
  await getR2Client().send(new PutObjectCommand({
    Bucket: privateBucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: "private, no-store",
  }));
  return { publicId: key, storageKey: key, provider: "r2" };
};

const deletePublicMedia = async (key) => {
  if (!key) return;
  const { publicBucket } = getR2Config();
  await getR2Client().send(new DeleteObjectCommand({ Bucket: publicBucket, Key: key }));
};

const deletePrivateMedia = async (key) => {
  if (!key) return;
  const { privateBucket } = getR2Config();
  await getR2Client().send(new DeleteObjectCommand({ Bucket: privateBucket, Key: key }));
};

const getPrivateMediaUrl = async (key, expiresIn = 300) => {
  if (!key) throw new Error("Private media key is required.");
  const { privateBucket } = getR2Config();
  const command = new GetObjectCommand({ Bucket: privateBucket, Key: key });
  return getSignedUrl(getR2Client(), command, {
    expiresIn: Math.min(Math.max(Number(expiresIn) || 300, 60), 900),
  });
};

const uploadOptimizedPublicImage = async (file, { folder, baseName, alt = "Darb image" } = {}) => {
  if (!file?.buffer) throw new Error("Image file is required.");
  const processed = await processProductImage(file.buffer);
  const safeFolder = String(folder || "media").split("/").map(sanitizeKeyPart).join("/");
  const key = `${safeFolder}/${sanitizeKeyPart(baseName || "image")}-${randomUUID()}.webp`;
  const stored = await putPublicObject({
    buffer: processed.buffer,
    key,
    contentType: processed.mimeType,
  });
  return {
    ...stored,
    alt: file.originalname || alt,
    width: processed.width,
    height: processed.height,
    bytes: processed.size,
  };
};

module.exports = {
  sanitizeKeyPart,
  publicUrlForKey,
  putPublicObject,
  putPrivateObject,
  deletePublicMedia,
  deletePrivateMedia,
  getPrivateMediaUrl,
  uploadOptimizedPublicImage,
};
