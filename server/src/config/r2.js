const {
  S3Client,
  HeadBucketCommand,
} = require("@aws-sdk/client-s3");

let client = null;

const required = (name) => {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is missing from server/.env`);
  return value;
};

const getR2Config = () => ({
  accountId: required("R2_ACCOUNT_ID"),
  accessKeyId: required("R2_ACCESS_KEY_ID"),
  secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
  publicBucket: required("R2_PUBLIC_BUCKET"),
  privateBucket: required("R2_PRIVATE_BUCKET"),
  publicBaseUrl: required("R2_PUBLIC_BASE_URL").replace(/\/+$/, ""),
});

const getR2Client = () => {
  if (client) return client;
  const config = getR2Config();
  client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return client;
};

const isR2Configured = () =>
  [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_PUBLIC_BUCKET",
    "R2_PRIVATE_BUCKET",
    "R2_PUBLIC_BASE_URL",
  ].every((name) => Boolean(String(process.env[name] || "").trim()));

const testR2Connection = async () => {
  const config = getR2Config();
  const r2 = getR2Client();
  await Promise.all([
    r2.send(new HeadBucketCommand({ Bucket: config.publicBucket })),
    r2.send(new HeadBucketCommand({ Bucket: config.privateBucket })),
  ]);
  return {
    publicBucket: config.publicBucket,
    privateBucket: config.privateBucket,
    publicBaseUrl: config.publicBaseUrl,
  };
};

module.exports = {
  getR2Client,
  getR2Config,
  isR2Configured,
  testR2Connection,
};
