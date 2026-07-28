import fs from "node:fs";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";

const env = {};

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=(.*)$/);
  if (!match) continue;

  env[match[1]] = match[2]
    .trim()
    .replace(/^["']|["']$/g, "");
}

const bucket = env.CLOUDFLARE_R2_BUCKET_NAME;

const client = new S3Client({
  region: "auto",
  endpoint: env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

try {
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
  console.log(`R2_OK: ${bucket}`);
} catch (error) {
  console.error(`R2_ERROR: ${bucket}`);
  console.error(error.name, error.message);
  process.exit(1);
}
