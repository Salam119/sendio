import 'server-only';

import {
  createHash,
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';

import { createSupabaseAdminClient } from '@/lib/supabase-admin';

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RATE_LIMIT_WINDOW_MS = 60 * 1000;

type OtpChallengeRow = {
  id: string;
  company_number: string;
  entity_number: string;
  contact_id: string;
  masked_destination: string;
  code_hash: string;
  expires_at: string;
  attempts_remaining: number;
  consumed_at: string | null;
};

export class BceOtpChallengeError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'BceOtpChallengeError';
  }
}

function getOtpSecret() {
  const secret = process.env.COMPANY_OTP_SECRET?.trim();

  if (!secret) {
    throw new Error('COMPANY_OTP_SECRET is not configured.');
  }

  return secret;
}

function hashCode(challengeId: string, code: string) {
  return createHmac('sha256', getOtpSecret())
    .update(`${challengeId}:${code}`)
    .digest();
}

function createRateLimitKey(input: {
  companyNumber: string;
  entityNumber: string;
  contactId: string;
  now: number;
}) {
  const minuteBucket = Math.floor(input.now / OTP_RATE_LIMIT_WINDOW_MS);

  return createHash('sha256')
    .update(
      `${input.companyNumber}:${input.entityNumber}:${input.contactId}:${minuteBucket}`,
    )
    .digest('hex');
}

function isUniqueViolation(error: { code?: string; message?: string } | null) {
  return error?.code === '23505' || /duplicate key/i.test(error?.message || '');
}

export async function createBceOtpChallenge(input: {
  companyNumber: string;
  entityNumber: string;
  contactId: string;
  maskedDestination: string;
}) {
  const now = Date.now();
  const id = randomUUID();
  const code = randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, '0');
  const expiresAt = new Date(now + OTP_TTL_MS);
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from('company_registration_otps').insert({
    id,
    company_number: input.companyNumber,
    entity_number: input.entityNumber,
    contact_id: input.contactId,
    masked_destination: input.maskedDestination,
    code_hash: hashCode(id, code).toString('hex'),
    rate_limit_key: createRateLimitKey({
      companyNumber: input.companyNumber,
      entityNumber: input.entityNumber,
      contactId: input.contactId,
      now,
    }),
    created_at: new Date(now).toISOString(),
    expires_at: expiresAt.toISOString(),
    attempts_remaining: OTP_MAX_ATTEMPTS,
    consumed_at: null,
  });

  if (error) {
    if (isUniqueViolation(error)) {
      throw new BceOtpChallengeError(
        'OTP_RATE_LIMITED',
        429,
        'Please wait one minute before requesting another verification code.',
      );
    }

    throw new Error(`OTP challenge creation failed: ${error.message}`);
  }

  return {
    id,
    code,
    expiresAt: expiresAt.getTime(),
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
  };
}

export async function removeBceOtpChallenge(challengeId: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from('company_registration_otps')
    .delete()
    .eq('id', challengeId);

  if (error) {
    console.error('OTP challenge cleanup failed:', error.message);
  }
}

export async function verifyBceOtpChallenge(
  challengeId: string,
  code: string,
) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('company_registration_otps')
    .select(
      'id,company_number,entity_number,contact_id,masked_destination,code_hash,expires_at,attempts_remaining,consumed_at',
    )
    .eq('id', challengeId)
    .maybeSingle();

  if (error) {
    throw new Error(`OTP challenge lookup failed: ${error.message}`);
  }

  const challenge = data as OtpChallengeRow | null;

  if (!challenge || challenge.consumed_at) {
    return {
      ok: false as const,
      status: 404,
      error: 'CHALLENGE_NOT_FOUND',
      message: 'The verification session was not found. Request a new code.',
    };
  }

  if (Date.parse(challenge.expires_at) <= Date.now()) {
    await removeBceOtpChallenge(challengeId);

    return {
      ok: false as const,
      status: 410,
      error: 'CODE_EXPIRED',
      message: 'The verification code has expired. Request a new code.',
    };
  }

  if (challenge.attempts_remaining <= 0) {
    return {
      ok: false as const,
      status: 429,
      error: 'TOO_MANY_ATTEMPTS',
      message: 'Too many incorrect attempts. Request a new code.',
    };
  }

  const expected = Buffer.from(challenge.code_hash, 'hex');
  const received = hashCode(challengeId, code);
  const matches =
    expected.length === received.length && timingSafeEqual(expected, received);

  if (!matches) {
    const nextAttempts = Math.max(0, challenge.attempts_remaining - 1);
    const { error: updateError } = await admin
      .from('company_registration_otps')
      .update({ attempts_remaining: nextAttempts })
      .eq('id', challengeId)
      .eq('attempts_remaining', challenge.attempts_remaining);

    if (updateError) {
      throw new Error(`OTP attempt update failed: ${updateError.message}`);
    }

    return {
      ok: false as const,
      status: nextAttempts === 0 ? 429 : 400,
      error: nextAttempts === 0 ? 'TOO_MANY_ATTEMPTS' : 'INVALID_CODE',
      message:
        nextAttempts === 0
          ? 'Too many incorrect attempts. Request a new code.'
          : `Incorrect code. ${nextAttempts} attempt${
              nextAttempts === 1 ? '' : 's'
            } remaining.`,
      attemptsRemaining: nextAttempts,
    };
  }

  return {
    ok: true as const,
    companyNumber: challenge.company_number,
    entityNumber: challenge.entity_number,
    contactId: challenge.contact_id,
    maskedDestination: challenge.masked_destination,
  };
}

export async function consumeBceOtpChallenge(challengeId: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from('company_registration_otps')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', challengeId)
    .is('consumed_at', null);

  if (error) {
    console.error('OTP challenge consumption failed:', error.message);
  }
}
