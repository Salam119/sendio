import 'server-only';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { R2_BUCKET_NAME, r2Client } from './r2';

function validateObjectKey(objectKey: string) {
  const normalizedKey = objectKey.trim();

  if (
    !normalizedKey ||
    normalizedKey.startsWith('/') ||
    normalizedKey.includes('..') ||
    !/^[a-zA-Z0-9][a-zA-Z0-9/_.-]*$/.test(normalizedKey)
  ) {
    throw new Error('Invalid R2 object key.');
  }

  return normalizedKey;
}

function validateContentType(contentType: string) {
  const normalizedContentType = contentType.trim().toLowerCase();

  if (!normalizedContentType || !/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(normalizedContentType)) {
    throw new Error('Invalid R2 content type.');
  }

  return normalizedContentType;
}

export async function createR2UploadUrl({
  objectKey,
  contentType,
  expiresInSeconds = 300,
}: {
  objectKey: string;
  contentType: string;
  expiresInSeconds?: number;
}) {
  const safeObjectKey = validateObjectKey(objectKey);
  const safeContentType = validateContentType(contentType);

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: safeObjectKey,
    ContentType: safeContentType,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, {
    expiresIn: expiresInSeconds,
  });

  return {
    uploadUrl,
    objectKey: safeObjectKey,
    headers: {
      'Content-Type': safeContentType,
    },
  };
}

export async function createR2ImageUploadUrl({
  objectKey,
  contentType,
  expiresInSeconds = 300,
}: {
  objectKey: string;
  contentType: string;
  expiresInSeconds?: number;
}) {
  if (!contentType.trim().toLowerCase().startsWith('image/')) {
    throw new Error('Unsupported image type.');
  }

  return createR2UploadUrl({
    objectKey,
    contentType,
    expiresInSeconds,
  });
}

export async function createR2ReadUrl({
  objectKey,
  expiresInSeconds = 3600,
}: {
  objectKey: string;
  expiresInSeconds?: number;
}) {
  const safeObjectKey = validateObjectKey(objectKey);

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: safeObjectKey,
  });

  return getSignedUrl(r2Client, command, {
    expiresIn: expiresInSeconds,
  });
}

export async function deleteR2Object(objectKey: string) {
  const safeObjectKey = validateObjectKey(objectKey);

  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: safeObjectKey,
    }),
  );
}
