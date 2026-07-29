import 'server-only';

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { normalizeBelgianEnterpriseNumber } from '@/lib/bce-r2';

const execFileAsync = promisify(execFile);

const DATABASE_RELATIVE_PATH = path.join(
  'data',
  'bce',
  'sendio-bce-registration.sqlite',
);
const SCRIPT_RELATIVE_PATH = path.join(
  'tools',
  'bce',
  'bce_registration_index.py',
);

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

export type LocalBceCompanyLookup = {
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

export class LocalBceLookupError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'LocalBceLookupError';
  }
}

export function isLocalBceFeatureEnabled() {
  return (
    process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_BCE_LOCAL_PREVIEW === 'true'
  );
}

function getPythonExecutable() {
  const configured = process.env.PYTHON_EXECUTABLE?.trim();

  if (configured) return configured;

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA?.trim();

    if (localAppData) {
      return path.join(
        localAppData,
        'Programs',
        'Python',
        'Python313',
        'python.exe',
      );
    }

    return 'python.exe';
  }

  return 'python3';
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

export async function lookupLocalBceCompany(
  input: string,
): Promise<LocalBceCompanyLookup> {
  const enterpriseNumber = normalizeBelgianEnterpriseNumber(input);

  if (!enterpriseNumber) {
    throw new LocalBceLookupError(
      'INVALID_ENTERPRISE_NUMBER',
      400,
      'Enter a valid Belgian enterprise number.',
    );
  }

  const projectRoot = process.cwd();
  const databasePath = path.join(projectRoot, DATABASE_RELATIVE_PATH);
  const scriptPath = path.join(projectRoot, SCRIPT_RELATIVE_PATH);
  const pythonExecutable = getPythonExecutable();

  await Promise.all([
    access(databasePath),
    access(scriptPath),
    access(pythonExecutable),
  ]);

  const { stdout } = await execFileAsync(
    pythonExecutable,
    [
      scriptPath,
      'inspect',
      '--db',
      databasePath,
      '--number',
      enterpriseNumber,
    ],
    {
      cwd: projectRoot,
      timeout: 30_000,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',
      },
    },
  );

  const raw = JSON.parse(stdout) as RawLookup;

  if (!raw.found || !raw.enterprise) {
    throw new LocalBceLookupError(
      'COMPANY_NOT_FOUND',
      404,
      'The company was not found in the local BCE index.',
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
  ];
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
