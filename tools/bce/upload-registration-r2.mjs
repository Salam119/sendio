#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

function parseArgs(argv) {
  const values = new Map();

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (!value.startsWith('--')) continue;

    const next = argv[index + 1];

    if (!next || next.startsWith('--')) {
      throw new Error(`Missing value for ${value}`);
    }

    values.set(value.slice(2), next);
    index += 1;
  }

  const indexDir = values.get('index');

  if (!indexDir) {
    throw new Error(
      'Use --index with the generated BCE registration index directory.',
    );
  }

  return { indexDir: path.resolve(indexDir) };
}

function parseEnvLine(line) {
  const normalized = line.trim();

  if (!normalized || normalized.startsWith('#')) return null;

  const separator = normalized.indexOf('=');

  if (separator <= 0) return null;

  const key = normalized.slice(0, separator).trim();
  let value = normalized.slice(separator + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

async function loadLocalEnv() {
  const envPath = path.resolve('.env.local');

  if (!existsSync(envPath)) return;

  const content = await readFile(envPath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);

    if (!parsed) continue;

    const [key, value] = parsed;

    if (!process.env[key]) process.env[key] = value;
  }
}

function requireEnvironment() {
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error('Missing Cloudflare R2 environment variables.');
  }

  return { endpoint, accessKeyId, secretAccessKey, bucket };
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function uploadAndVerify({
  client,
  bucket,
  key,
  filePath,
  contentType,
  contentEncoding,
  expectedSha256,
}) {
  const body = await readFile(filePath);
  const expectedSize = body.byteLength;
  const localSha256 = sha256(body);

  if (expectedSha256 && localSha256 !== expectedSha256) {
    throw new Error(`Local SHA-256 mismatch for ${key}.`);
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ...(contentEncoding ? { ContentEncoding: contentEncoding } : {}),
      CacheControl: key === 'bce-registration/current.json'
        ? 'no-cache, max-age=0'
        : 'private, max-age=31536000, immutable',
      Metadata: {
        sha256: localSha256,
      },
    }),
  );

  const head = await client.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  if (head.ContentLength !== expectedSize) {
    throw new Error(
      `R2 verification failed for ${key}: expected ${expectedSize}, found ${head.ContentLength ?? 'unknown'}`,
    );
  }

  if (head.Metadata?.sha256 !== localSha256) {
    throw new Error(`R2 SHA-256 verification failed for ${key}.`);
  }
}

async function main() {
  const { indexDir } = parseArgs(process.argv.slice(2));
  await loadLocalEnv();
  const { endpoint, accessKeyId, secretAccessKey, bucket } =
    requireEnvironment();

  const currentPath = path.join(indexDir, 'current.json');
  const current = JSON.parse(await readFile(currentPath, 'utf8'));

  if (
    typeof current.extract_number !== 'string' ||
    typeof current.manifest_key !== 'string' ||
    !/^bce-registration\/v[0-9]+\/manifest\.json$/.test(
      current.manifest_key,
    )
  ) {
    throw new Error('Invalid registration current.json.');
  }

  const versionDirectory = path.join(
    indexDir,
    `v${current.extract_number}`,
  );
  const manifestPath = path.join(versionDirectory, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  if (!Array.isArray(manifest.shards) || manifest.shards.length === 0) {
    throw new Error('Invalid BCE registration manifest.');
  }

  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  for (let index = 0; index < manifest.shards.length; index += 1) {
    const shard = manifest.shards[index];

    if (
      typeof shard.prefix !== 'string' ||
      typeof shard.key !== 'string' ||
      !shard.key.startsWith(
        `bce-registration/v${current.extract_number}/`,
      )
    ) {
      throw new Error('Invalid BCE registration shard metadata.');
    }

    const filePath = path.join(
      versionDirectory,
      `${shard.prefix}.ndjson.gz`,
    );
    const fileInfo = await stat(filePath);

    if (fileInfo.size !== shard.size_bytes) {
      throw new Error(
        `Local size mismatch for ${shard.prefix}.ndjson.gz.`,
      );
    }

    process.stdout.write(
      `Uploading registration shard ${index + 1}/${manifest.shards.length}: ${shard.prefix}\n`,
    );

    await uploadAndVerify({
      client,
      bucket,
      key: shard.key,
      filePath,
      contentType: 'application/x-ndjson',
      contentEncoding: 'gzip',
      expectedSha256: shard.sha256,
    });
  }

  await uploadAndVerify({
    client,
    bucket,
    key: current.manifest_key,
    filePath: manifestPath,
    contentType: 'application/json',
  });

  await uploadAndVerify({
    client,
    bucket,
    key: 'bce-registration/current.json',
    filePath: currentPath,
    contentType: 'application/json',
  });

  process.stdout.write(
    `BCE registration extract ${current.extract_number} uploaded and verified in R2.\n`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
