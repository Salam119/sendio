import 'server-only';

import { randomUUID } from 'node:crypto';

import type {
  BceEntityKind,
  BceCompanyRegistrationLookup,
  PrivateBceContact,
} from '@/lib/bce-registration-r2';
import {
  createSupabaseAdminClient,
  createSupabaseServerAuthClient,
} from '@/lib/supabase-admin';

const VISIBILITY_DEFAULTS = {
  show_public_messages: false,
  show_public_about: false,
  show_public_address: false,
  show_public_status: false,
  show_public_services: false,
  show_public_projects: false,
  show_public_gallery: false,
  show_public_branches: false,
  show_public_showcase: false,
  show_public_features: false,
  show_public_articles: false,
  show_public_social_links: false,
} as const;

export class CompanyAccountCreationError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'CompanyAccountCreationError';
  }
}

function isSafeEmail(value: string) {
  return (
    !/[\r\n]/.test(value) &&
    /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)
  );
}

function makeSlug(value: string) {
  const base = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return `${base || 'company'}-${randomUUID().slice(0, 8)}`;
}

function getEntity(
  lookup: BceCompanyRegistrationLookup,
  entityNumber: string,
) {
  return lookup.company.entities.find(
    (candidate) => candidate.number === entityNumber,
  );
}

function getContact(
  lookup: BceCompanyRegistrationLookup,
  entityNumber: string,
  contactId: string,
): PrivateBceContact | undefined {
  return lookup.privateContacts.find(
    (candidate) =>
      candidate.id === contactId &&
      candidate.sourceEntityNumber === entityNumber,
  );
}

function getAddressSnapshot(
  entity: BceCompanyRegistrationLookup['company']['entities'][number],
) {
  return {
    street: entity.address.street,
    houseNumber: entity.address.houseNumber,
    box: entity.address.box,
    extraInfo: entity.address.extraInfo,
    postalCode: entity.address.postalCode,
    city: entity.address.city,
  };
}

async function rollbackCreatedUser(userId: string) {
  const admin = createSupabaseAdminClient();

  await admin.from('companies').delete().eq('user_id', userId);
  await admin.from('profiles').delete().eq('id', userId);
  await admin.auth.admin.deleteUser(userId);
}

export async function createVerifiedCompanyAccount(input: {
  lookup: BceCompanyRegistrationLookup;
  entityNumber: string;
  contactId: string;
  password: string;
}) {
  const entity = getEntity(input.lookup, input.entityNumber);
  const contact = getContact(
    input.lookup,
    input.entityNumber,
    input.contactId,
  );

  if (!entity || !contact || contact.type !== 'email' || !contact.selectable) {
    throw new CompanyAccountCreationError(
      'OFFICIAL_EMAIL_NOT_AVAILABLE',
      400,
      'The official email is no longer available for this company entity.',
    );
  }

  const email = contact.value.trim().toLowerCase();
  const password = input.password;

  if (!isSafeEmail(email)) {
    throw new CompanyAccountCreationError(
      'INVALID_OFFICIAL_EMAIL',
      400,
      'The official BCE email address is invalid.',
    );
  }

  if (password.length < 8) {
    throw new CompanyAccountCreationError(
      'WEAK_PASSWORD',
      400,
      'Use a password with at least 8 characters.',
    );
  }

  const admin = createSupabaseAdminClient();

  const { data: existingCompany, error: companyLookupError } = await admin
    .from('companies')
    .select('id')
    .eq('registration_number', entity.number)
    .limit(1)
    .maybeSingle();

  if (companyLookupError) {
    throw new CompanyAccountCreationError(
      'COMPANY_LOOKUP_FAILED',
      500,
      companyLookupError.message,
    );
  }

  if (existingCompany) {
    throw new CompanyAccountCreationError(
      'COMPANY_ALREADY_REGISTERED',
      409,
      'This company or establishment is already registered on Sendio.',
    );
  }

  const { data: existingProfile, error: profileLookupError } = await admin
    .from('profiles')
    .select('id,user_type')
    .ilike('email', email)
    .limit(1)
    .maybeSingle();

  if (profileLookupError) {
    throw new CompanyAccountCreationError(
      'EMAIL_LOOKUP_FAILED',
      500,
      profileLookupError.message,
    );
  }

  if (existingProfile) {
    throw new CompanyAccountCreationError(
      'EMAIL_ALREADY_REGISTERED',
      409,
      'The official email already belongs to a Sendio account.',
    );
  }

  const verifiedAt = new Date().toISOString();
  const entityKind: BceEntityKind = entity.kind;
  const { data: createdUserData, error: createUserError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: entity.name,
        user_type: 'company',
      },
    });

  if (createUserError || !createdUserData.user) {
    const normalizedMessage = createUserError?.message.toLowerCase() || '';

    if (
      normalizedMessage.includes('already') ||
      normalizedMessage.includes('registered') ||
      normalizedMessage.includes('exists')
    ) {
      throw new CompanyAccountCreationError(
        'EMAIL_ALREADY_REGISTERED',
        409,
        'The official email already belongs to a Sendio account.',
      );
    }

    throw new CompanyAccountCreationError(
      'AUTH_ACCOUNT_CREATION_FAILED',
      500,
      createUserError?.message || 'The company account could not be created.',
    );
  }

  const userId = createdUserData.user.id;

  try {
    const { error: metadataError } = await admin.auth.admin.updateUserById(
      userId,
      {
        app_metadata: {
          user_type: 'company',
          bce_verified: true,
          bce_enterprise_number: input.lookup.company.number,
          bce_entity_number: entity.number,
          bce_entity_kind: entityKind,
          bce_verified_at: verifiedAt,
          bce_contact_type: 'email',
          bce_contact_masked: contact.maskedValue,
          bce_official_name: entity.name,
          bce_official_address: getAddressSnapshot(entity),
          bce_activities: entity.activities,
        },
      },
    );

    if (metadataError) {
      throw new CompanyAccountCreationError(
        'VERIFICATION_METADATA_FAILED',
        500,
        metadataError.message,
      );
    }

    const { error: profileError } = await admin.from('profiles').upsert(
      {
        id: userId,
        email,
        user_type: 'company',
      },
      {
        onConflict: 'id',
      },
    );

    if (profileError) {
      throw new CompanyAccountCreationError(
        'PROFILE_CREATION_FAILED',
        500,
        profileError.message,
      );
    }

    const { data: companyData, error: companyError } = await admin
      .from('companies')
      .insert({
        user_id: userId,
        name: entity.name,
        slug: makeSlug(entity.name),
        registration_number: entity.number,
        verification_status: 'verified',
        email: null,
        status: 'available',
        views: 0,
        connections: 0,
        rating: 0,
        reviews_count: 0,
        ...VISIBILITY_DEFAULTS,
      })
      .select('id,slug')
      .single();

    if (companyError || !companyData) {
      throw new CompanyAccountCreationError(
        'COMPANY_PROFILE_CREATION_FAILED',
        500,
        companyError?.message || 'The company profile could not be created.',
      );
    }

    const authClient = createSupabaseServerAuthClient();
    const { data: sessionData, error: signInError } =
      await authClient.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError || !sessionData.session) {
      return {
        accountCreated: true as const,
        companyId: companyData.id,
        companySlug: companyData.slug,
        session: null,
      };
    }

    return {
      accountCreated: true as const,
      companyId: companyData.id,
      companySlug: companyData.slug,
      session: {
        accessToken: sessionData.session.access_token,
        refreshToken: sessionData.session.refresh_token,
      },
    };
  } catch (error) {
    await rollbackCreatedUser(userId);
    throw error;
  }
}
