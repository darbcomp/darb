const { randomUUID } = require("crypto");
const {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { getR2Client, getR2Config } = require("../config/r2");
const { processProductImage } = require("../utils/imageProcessor");

const PUBLIC_MEDIA_NAMESPACES = new Set(["products", "categories", "bundles", "reviews"]);
const PRIVATE_MEDIA_NAMESPACES = new Set(["payment-proofs"]);

const sanitizeKeyPart = (value = "media") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "media";

const isSafeManagedKey = (key, namespaces) => {
  const clean = String(key || "");
  if (!clean || clean !== clean.trim() || clean.includes("\\") || clean.includes("..")) return false;
  if (!/^[a-z0-9][a-z0-9._/-]*\.webp$/.test(clean)) return false;
  return namespaces.has(clean.split("/")[0]);
};

const isManagedPublicMediaKey = (key) => isSafeManagedKey(key, PUBLIC_MEDIA_NAMESPACES);
const isManagedPrivateMediaKey = (key) => isSafeManagedKey(key, PRIVATE_MEDIA_NAMESPACES);

const buildPublicMediaKey = ({ folder, baseName, id = randomUUID() } = {}) => {
  const safeFolder = String(folder || "media").split("/").map(sanitizeKeyPart).join("/");
  return `${safeFolder}/${sanitizeKeyPart(baseName || "image")}-${sanitizeKeyPart(id)}.webp`;
};

const publicUrlForKey = (key) => {
  if (!isManagedPublicMediaKey(key)) throw new Error("Invalid public media key.");
  const { publicBaseUrl } = getR2Config();
  const encoded = String(key)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${publicBaseUrl}/${encoded}`;
};

const putPublicObject = async ({ buffer, key, contentType = "image/webp", cacheControl = "public, max-age=31536000, immutable" }) => {
  if (!isManagedPublicMediaKey(key) || contentType !== "image/webp") {
    throw new Error("Invalid public media object.");
  }
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
  if (!isManagedPrivateMediaKey(key) || contentType !== "image/webp") {
    throw new Error("Invalid private media object.");
  }
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
  if (!isManagedPublicMediaKey(key)) return false;
  const { publicBucket } = getR2Config();
  await getR2Client().send(new DeleteObjectCommand({ Bucket: publicBucket, Key: key }));
  return true;
};

const deletePrivateMedia = async (key) => {
  if (!isManagedPrivateMediaKey(key)) return false;
  const { privateBucket } = getR2Config();
  await getR2Client().send(new DeleteObjectCommand({ Bucket: privateBucket, Key: key }));
  return true;
};

const getPrivateMediaUrl = async (key, expiresIn = 300) => {
  if (!isManagedPrivateMediaKey(key)) throw new Error("Private media file is unavailable.");
  const { privateBucket } = getR2Config();
  const command = new GetObjectCommand({ Bucket: privateBucket, Key: key });
  return getSignedUrl(getR2Client(), command, {
    expiresIn: Math.min(Math.max(Number(expiresIn) || 300, 60), 900),
  });
};

const uploadOptimizedPublicImage = async (file, { folder, baseName, alt = "Darb image" } = {}) => {
  if (!file?.buffer) throw new Error("Image file is required.");
  const processed = await processProductImage(file.buffer);
  const key = buildPublicMediaKey({ folder, baseName });
  if (!isManagedPublicMediaKey(key)) throw new Error("Invalid public media namespace.");
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
  buildPublicMediaKey,
  isManagedPublicMediaKey,
  isManagedPrivateMediaKey,
  publicUrlForKey,
  putPublicObject,
  putPrivateObject,
  deletePublicMedia,
  deletePrivateMedia,
  getPrivateMediaUrl,
  uploadOptimizedPublicImage,
};
