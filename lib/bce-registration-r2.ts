import 'server-only';

import { GetObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

import { normalizeBelgianEnterpriseNumber } from '@/lib/bce-r2';
import { R2_BUCKET_NAME, r2Client } from '@/lib/r2';

const BCE_REGISTRATION_CURRENT_KEY = 'bce-registration/current.json';
const CURRENT_CACHE_TTL_MS = 5 * 60 * 1000;

type BceRegistrationCurrentIndex = {
  extract_number: string;
  manifest_key: string;
};

type BceRegistrationManifest = {
  schema_version: number;
  prefix_length: number;
  extract_number: string;
  version_prefix: string;
};

type RawContact = {
  scope?: string;
  type?: string;
  value?: string;
};

type RawActivity = {
  activity_group?: string;
  nace_version?: string;
  nace_code?: string;
  classification?: string;
  description_fr?: string;
  description_nl?: string;
};

type RawEntity = {
  enterprise_number?: string;
  establishment_number?: string;
  branch_number?: string;
  denomination?: string;
  zipcode?: string;
  municipality_fr?: string;
  municipality_nl?: string;
  street_fr?: string;
  street_nl?: string;
  house_number?: string;
  box?: string;
  extra_info?: string;
  contacts?: RawContact[];
  activities?: RawActivity[];
};

type RawLookup = {
  found?: boolean;
  number?: string;
  enterprise?: RawEntity & {
    status_code?: string;
    legal_form_code?: string;
  };
  enterprise_contacts?: RawContact[];
  enterprise_activities?: RawActivity[];
  establishments?: RawEntity[];
  branches?: RawEntity[];
};

export type BceEntityKind = 'enterprise' | 'establishment' | 'branch';
export type BcePhoneKind = 'mobile' | 'landline' | 'unknown';
export type BceContactType = 'email' | 'phone' | 'website';

export type PublicBceContact = {
  id: string;
  type: BceContactType;
  maskedValue: string;
  selectable: boolean;
  phoneKind: BcePhoneKind | null;
  sourceEntityNumber: string;
  sourceEntityName: string;
  sourceKind: BceEntityKind;
};

export type PrivateBceContact = PublicBceContact & {
  value: string;
};

export type BceCompanyRegistrationLookup = {
  extractNumber: string;
  company: {
    number: string;
    statusCode: string;
    name: string;
    entities: Array<{
      id: string;
      kind: BceEntityKind;
      number: string;
      name: string;
      address: {
        street: string;
        houseNumber: string;
        box: string;
        extraInfo: string;
        postalCode: string;
        city: string;
      };
      activities: Array<{
        group: string;
        version: string;
        code: string;
        classification: string;
        label: string;
      }>;
    }>;
    contacts: PublicBceContact[];
  };
  privateContacts: PrivateBceContact[];
};

export class BceRegistrationLookupError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'BceRegistrationLookupError';
  }
}

let indexCache:
  | {
      current: BceRegistrationCurrentIndex;
      manifest: BceRegistrationManifest;
      expiresAt: number;
    }
  | null = null;

function isNotFoundError(error: unknown) {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
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

function parseCurrentIndex(buffer: Buffer): BceRegistrationCurrentIndex {
  const parsed = JSON.parse(
    buffer.toString('utf8'),
  ) as Partial<BceRegistrationCurrentIndex>;

  if (
    typeof parsed.extract_number !== 'string' ||
    !/^\d+$/.test(parsed.extract_number) ||
    typeof parsed.manifest_key !== 'string' ||
    !/^bce-registration\/v\d+\/manifest\.json$/.test(
      parsed.manifest_key,
    )
  ) {
    throw new Error('Invalid BCE registration current index.');
  }

  return {
    extract_number: parsed.extract_number,
    manifest_key: parsed.manifest_key,
  };
}

function parseManifest(buffer: Buffer): BceRegistrationManifest {
  const parsed = JSON.parse(
    buffer.toString('utf8'),
  ) as Partial<BceRegistrationManifest>;

  if (
    parsed.schema_version !== 1 ||
    typeof parsed.prefix_length !== 'number' ||
    !Number.isInteger(parsed.prefix_length) ||
    parsed.prefix_length < 2 ||
    parsed.prefix_length > 5 ||
    typeof parsed.extract_number !== 'string' ||
    !/^\d+$/.test(parsed.extract_number) ||
    typeof parsed.version_prefix !== 'string' ||
    !/^bce-registration\/v\d+$/.test(parsed.version_prefix)
  ) {
    throw new Error('Invalid BCE registration manifest.');
  }

  return parsed as BceRegistrationManifest;
}

async function getRegistrationIndex() {
  const now = Date.now();

  if (indexCache && indexCache.expiresAt > now) {
    return indexCache;
  }

  const current = parseCurrentIndex(
    await readR2Object(BCE_REGISTRATION_CURRENT_KEY),
  );
  const manifest = parseManifest(await readR2Object(current.manifest_key));

  if (
    manifest.extract_number !== current.extract_number ||
    `${manifest.version_prefix}/manifest.json` !== current.manifest_key
  ) {
    throw new Error('BCE registration index version mismatch.');
  }

  indexCache = {
    current,
    manifest,
    expiresAt: now + CURRENT_CACHE_TTL_MS,
  };

  return indexCache;
}

function decodeShard(buffer: Buffer) {
  const isGzip =
    buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;

  return (isGzip ? gunzipSync(buffer) : buffer).toString('utf8');
}

function findRawLookupInShard(
  shardContent: string,
  enterpriseNumber: string,
): RawLookup | null {
  const needle = `"number":"${enterpriseNumber}"`;
  const matchIndex = shardContent.indexOf(needle);

  if (matchIndex === -1) return null;

  const lineStart = shardContent.lastIndexOf('\n', matchIndex) + 1;
  const nextLineBreak = shardContent.indexOf('\n', matchIndex);
  const lineEnd =
    nextLineBreak === -1 ? shardContent.length : nextLineBreak;
  const line = shardContent.slice(lineStart, lineEnd).trim();
  const record = JSON.parse(line) as RawLookup;

  if (record.number !== enterpriseNumber || !record.enterprise) {
    throw new Error('Invalid BCE registration company record.');
  }

  return record;
}

function getEntityNumber(entity: RawEntity, kind: BceEntityKind) {
  if (kind === 'enterprise') return entity.enterprise_number ?? '';
  if (kind === 'establishment') return entity.establishment_number ?? '';

  return entity.branch_number ?? '';
}

function getEntityName(entity: RawEntity, fallback: string) {
  return entity.denomination?.trim() || fallback;
}

function getAddress(entity: RawEntity) {
  const street = entity.street_fr?.trim() || entity.street_nl?.trim() || '';
  const city =
    entity.municipality_fr?.trim() || entity.municipality_nl?.trim() || '';

  return {
    street,
    houseNumber: entity.house_number?.trim() || '',
    box: entity.box?.trim() || '',
    extraInfo: entity.extra_info?.trim() || '',
    postalCode: entity.zipcode?.trim() || '',
    city,
  };
}

function getCleanLabel(value: string | undefined) {
  const label = value?.trim() || '';

  if (!label || label.includes('\uFFFD')) return '';

  return label.normalize('NFC');
}

function getActivities(
  entityActivities: RawActivity[] | undefined,
  fallbackActivities: RawActivity[],
) {
  const source =
    entityActivities && entityActivities.length > 0
      ? entityActivities
      : fallbackActivities;

  return source
    .map((activity) => ({
      group: activity.activity_group?.trim() || '',
      version: activity.nace_version?.trim() || '',
      code: activity.nace_code?.trim() || '',
      classification: activity.classification?.trim() || '',
      label:
        getCleanLabel(activity.description_fr) ||
        getCleanLabel(activity.description_nl) ||
        activity.nace_code?.trim() ||
        '',
    }))
    .filter((activity) => activity.label)
    .slice(0, 3);
}

function classifyPhone(value: string): BcePhoneKind {
  const digits = value.replace(/\D/g, '');

  if (/^324\d{8}$/.test(digits)) return 'mobile';
  if (/^32\d{8,9}$/.test(digits)) return 'landline';

  return 'unknown';
}

function maskEmail(value: string) {
  const [localPart = '', domain = ''] = value.split('@');
  const visibleLocal = localPart.slice(0, Math.min(2, localPart.length));
  const localMask = '•'.repeat(
    Math.max(4, localPart.length - visibleLocal.length),
  );
  const domainParts = domain.split('.').filter(Boolean);
  const topLevelDomain = domainParts.length > 1 ? domainParts.pop() ?? '' : '';
  const domainName = domainParts.join('.') || domain;
  const domainMask = '•'.repeat(Math.max(6, domainName.length));

  return `${visibleLocal}${localMask}@${domainMask}${
    topLevelDomain ? `.${topLevelDomain}` : ''
  }`;
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  const lastTwo = digits.slice(-2);

  return `${'•'.repeat(Math.max(8, digits.length - 2))}${lastTwo}`;
}

function maskWebsite(value: string) {
  const parts = value.split('.').filter(Boolean);

  if (parts.length < 2) return value;

  const topLevelDomain = parts.pop() ?? '';
  const domain = parts.join('.');

  return `${domain.slice(0, 2)}${'•'.repeat(
    Math.max(4, domain.length - 2),
  )}.${topLevelDomain}`;
}

function getContactLabel(contact: RawContact) {
  const type = contact.type?.trim().toUpperCase();
  const value = contact.value?.trim() || '';

  if (type === 'EMAIL') return maskEmail(value);
  if (type === 'TEL') return maskPhone(value);
  if (type === 'WEB') return maskWebsite(value);

  return '';
}

function buildEntity(
  entity: RawEntity,
  kind: BceEntityKind,
  fallbackName: string,
  fallbackActivities: RawActivity[],
) {
  return {
    id: `${kind}:${getEntityNumber(entity, kind)}`,
    kind,
    number: getEntityNumber(entity, kind),
    name: getEntityName(entity, fallbackName),
    address: getAddress(entity),
    activities: getActivities(entity.activities, fallbackActivities),
  };
}

function getContactId(
  sourceEntityNumber: string,
  rawType: string,
  value: string,
) {
  return createHash('sha256')
    .update(`${sourceEntityNumber}:${rawType}:${value}`)
    .digest('hex')
    .slice(0, 24);
}

function buildContacts(
  raw: RawLookup,
  entityNames: Map<string, { name: string; kind: BceEntityKind }>,
) {
  const sources: Array<{
    number: string;
    name: string;
    kind: BceEntityKind;
    contacts: RawContact[];
  }> = [];

  const enterpriseNumber = raw.enterprise?.enterprise_number ?? raw.number ?? '';
  const enterpriseName = raw.enterprise?.denomination?.trim() || 'Company';

  sources.push({
    number: enterpriseNumber,
    name: enterpriseName,
    kind: 'enterprise',
    contacts: raw.enterprise_contacts ?? [],
  });

  for (const establishment of raw.establishments ?? []) {
    const number = establishment.establishment_number ?? '';
    const metadata = entityNames.get(number);

    sources.push({
      number,
      name: metadata?.name || enterpriseName,
      kind: 'establishment',
      contacts: establishment.contacts ?? [],
    });
  }

  for (const branch of raw.branches ?? []) {
    const number = branch.branch_number ?? '';
    const metadata = entityNames.get(number);

    sources.push({
      number,
      name: metadata?.name || enterpriseName,
      kind: 'branch',
      contacts: branch.contacts ?? [],
    });
  }

  const seen = new Set<string>();
  const contacts: PrivateBceContact[] = [];

  for (const source of sources) {
    for (const contact of source.contacts) {
      const rawType = contact.type?.trim().toUpperCase();
      const value = contact.value?.trim() || '';

      if (!value || !['EMAIL', 'TEL', 'WEB'].includes(rawType ?? '')) {
        continue;
      }

      const dedupeKey = `${source.number}:${rawType}:${value}`;

      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const phoneKind = rawType === 'TEL' ? classifyPhone(value) : null;
      const type: BceContactType =
        rawType === 'EMAIL'
          ? 'email'
          : rawType === 'TEL'
            ? 'phone'
            : 'website';
      const selectable = type === 'email' || phoneKind === 'mobile';

      contacts.push({
        id: getContactId(source.number, rawType ?? '', value),
        type,
        value,
        maskedValue: getContactLabel(contact),
        selectable,
        phoneKind,
        sourceEntityNumber: source.number,
        sourceEntityName: source.name,
        sourceKind: source.kind,
      });
    }
  }

  return contacts.sort((left, right) => {
    const rank = (contact: PrivateBceContact) => {
      if (contact.type === 'phone' && contact.phoneKind === 'mobile') return 0;
      if (contact.type === 'email') return 1;
      if (contact.type === 'phone') return 2;
      return 3;
    };

    return rank(left) - rank(right);
  });
}

export async function lookupBceRegistrationCompany(
  input: string,
): Promise<BceCompanyRegistrationLookup> {
  const enterpriseNumber = normalizeBelgianEnterpriseNumber(input);

  if (!enterpriseNumber) {
    throw new BceRegistrationLookupError(
      'INVALID_ENTERPRISE_NUMBER',
      400,
      'Enter a valid Belgian enterprise number.',
    );
  }

  const { current, manifest } = await getRegistrationIndex();
  const shardPrefix = enterpriseNumber.slice(0, manifest.prefix_length);
  const shardKey = `${manifest.version_prefix}/${shardPrefix}.ndjson.gz`;
  let shardBuffer: Buffer;

  try {
    shardBuffer = await readR2Object(shardKey);
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new BceRegistrationLookupError(
        'COMPANY_NOT_FOUND',
        404,
        'The company was not found in the BCE registration index.',
      );
    }

    throw error;
  }

  const raw = findRawLookupInShard(
    decodeShard(shardBuffer),
    enterpriseNumber,
  );

  if (!raw || !raw.enterprise) {
    throw new BceRegistrationLookupError(
      'COMPANY_NOT_FOUND',
      404,
      'The company was not found in the BCE registration index.',
    );
  }

  const enterpriseName = raw.enterprise.denomination?.trim() || 'Company';
  const enterpriseActivities = raw.enterprise_activities ?? [];
  const entities = [
    buildEntity(
      raw.enterprise,
      'enterprise',
      enterpriseName,
      enterpriseActivities,
    ),
    ...(raw.establishments ?? []).map((entity) =>
      buildEntity(
        entity,
        'establishment',
        enterpriseName,
        enterpriseActivities,
      ),
    ),
    ...(raw.branches ?? []).map((entity) =>
      buildEntity(entity, 'branch', enterpriseName, enterpriseActivities),
    ),
  ].filter((entity) => entity.number);
  const entityNames = new Map(
    entities.map((entity) => [
      entity.number,
      { name: entity.name, kind: entity.kind },
    ]),
  );
  const privateContacts = buildContacts(raw, entityNames);
  const contacts = privateContacts.map((contact) => ({
    id: contact.id,
    type: contact.type,
    maskedValue: contact.maskedValue,
    selectable: contact.selectable,
    phoneKind: contact.phoneKind,
    sourceEntityNumber: contact.sourceEntityNumber,
    sourceEntityName: contact.sourceEntityName,
    sourceKind: contact.sourceKind,
  }));

  return {
    extractNumber: current.extract_number,
    company: {
      number: enterpriseNumber,
      statusCode: raw.enterprise.status_code ?? '',
      name: enterpriseName,
      entities,
      contacts,
    },
    privateContacts,
  };
}
