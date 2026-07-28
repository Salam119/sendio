import 'server-only';

import { GetObjectCommand } from '@aws-sdk/client-s3';
import { gunzipSync } from 'node:zlib';

import { R2_BUCKET_NAME, r2Client } from './r2';

const BCE_CURRENT_KEY = 'bce/current.json';
const CURRENT_CACHE_TTL_MS = 5 * 60 * 1000;

type BceCurrentIndex = {
  extract_number: string;
  manifest_key: string;
};

export type BceCompanyRecord = {
  number: string;
  name: string;
  status_code: string;
  status_fr: string;
  status_nl: string;
  legal_form_code: string;
  legal_form_fr: string;
  legal_form_nl: string;
  start_date: string;
  postal_code: string;
  city_fr: string;
  city_nl: string;
  street_fr: string;
  street_nl: string;
  house_number: string;
  box: string;
  country_fr: string;
  country_nl: string;
};

export type BceLookupResult = {
  extractNumber: string;
  company: BceCompanyRecord;
};

let currentIndexCache:
  | {
      value: BceCurrentIndex;
      expiresAt: number;
    }
  | null = null;

function isNotFoundError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    name?: string;
    $metadata?: {
      httpStatusCode?: number;
    };
  };

  return (
    candidate.name === 'NoSuchKey' ||
    candidate.name === 'NotFound' ||
    candidate.$metadata?.httpStatusCode === 404
  );
}

async function readR2Object(objectKey: string) {
  const response = await r2Client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
    }),
  );

  if (!response.Body) {
    throw new Error(`Empty R2 object: ${objectKey}`);
  }

  return Buffer.from(await response.Body.transformToByteArray());
}

function parseCurrentIndex(buffer: Buffer): BceCurrentIndex {
  const parsed = JSON.parse(buffer.toString('utf8')) as Partial<BceCurrentIndex>;

  if (
    typeof parsed.extract_number !== 'string' ||
    !/^[0-9]+$/.test(parsed.extract_number) ||
    typeof parsed.manifest_key !== 'string' ||
    !/^bce\/v[0-9]+\/manifest\.json$/.test(parsed.manifest_key)
  ) {
    throw new Error('Invalid BCE current index.');
  }

  return {
    extract_number: parsed.extract_number,
    manifest_key: parsed.manifest_key,
  };
}

async function getCurrentIndex() {
  const now = Date.now();

  if (currentIndexCache && currentIndexCache.expiresAt > now) {
    return currentIndexCache.value;
  }

  const currentIndex = parseCurrentIndex(await readR2Object(BCE_CURRENT_KEY));

  currentIndexCache = {
    value: currentIndex,
    expiresAt: now + CURRENT_CACHE_TTL_MS,
  };

  return currentIndex;
}

function decodeShard(buffer: Buffer) {
  const isGzip =
    buffer.length >= 2 &&
    buffer[0] === 0x1f &&
    buffer[1] === 0x8b;

  return (isGzip ? gunzipSync(buffer) : buffer).toString('utf8');
}

function findRecordInShard(
  shardContent: string,
  enterpriseNumber: string,
): BceCompanyRecord | null {
  const needle = `"number":"${enterpriseNumber}"`;
  const matchIndex = shardContent.indexOf(needle);

  if (matchIndex === -1) {
    return null;
  }

  const lineStart = shardContent.lastIndexOf('\n', matchIndex) + 1;
  const nextLineBreak = shardContent.indexOf('\n', matchIndex);
  const lineEnd =
    nextLineBreak === -1 ? shardContent.length : nextLineBreak;
  const line = shardContent.slice(lineStart, lineEnd).trim();

  const record = JSON.parse(line) as Partial<BceCompanyRecord>;

  if (
    record.number !== enterpriseNumber ||
    typeof record.name !== 'string' ||
    typeof record.status_code !== 'string'
  ) {
    throw new Error('Invalid BCE company record.');
  }

  return record as BceCompanyRecord;
}

export function normalizeBelgianEnterpriseNumber(input: string) {
  const trimmed = input.trim().toUpperCase();
  const withoutCountryPrefix = trimmed.replace(/^BE[\s.-]*/, '');

  if (/[A-Z]/.test(withoutCountryPrefix)) {
    return null;
  }

  let digits = withoutCountryPrefix.replace(/\D/g, '');

  if (digits.length === 9) {
    digits = `0${digits}`;
  }

  if (digits.length !== 10) {
    return null;
  }

  const baseNumber = Number.parseInt(digits.slice(0, 8), 10);
  const suppliedCheckDigits = Number.parseInt(digits.slice(8), 10);
  const expectedCheckDigits = 97 - (baseNumber % 97);

  if (suppliedCheckDigits !== expectedCheckDigits) {
    return null;
  }

  return digits;
}

export async function findBceCompany(
  enterpriseNumber: string,
): Promise<BceLookupResult | null> {
  if (!/^[0-9]{10}$/.test(enterpriseNumber)) {
    throw new Error('Invalid normalized enterprise number.');
  }

  const currentIndex = await getCurrentIndex();
  const versionPrefix = currentIndex.manifest_key.replace(
    /\/manifest\.json$/,
    '',
  );
  const shardPrefix = enterpriseNumber.slice(0, 3);
  const shardKey = `${versionPrefix}/${shardPrefix}.ndjson.gz`;

  let shardBuffer: Buffer;

  try {
    shardBuffer = await readR2Object(shardKey);
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }

    throw error;
  }

  const company = findRecordInShard(
    decodeShard(shardBuffer),
    enterpriseNumber,
  );

  if (!company) {
    return null;
  }

  return {
    extractNumber: currentIndex.extract_number,
    company,
  };
}
