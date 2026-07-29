import 'server-only';

import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MIN_RESEND_MS = 60 * 1000;

type OtpChallenge = {
  id: string;
  companyNumber: string;
  entityNumber: string;
  contactId: string;
  maskedDestination: string;
  codeHash: string;
  createdAt: number;
  expiresAt: number;
  attemptsRemaining: number;
  consumedAt: number | null;
};

type OtpStore = Map<string, OtpChallenge>;

type GlobalWithOtpStore = typeof globalThis & {
  __sendioBceOtpChallenges?: OtpStore;
};

const globalWithOtpStore = globalThis as GlobalWithOtpStore;
const challenges =
  globalWithOtpStore.__sendioBceOtpChallenges ?? new Map<string, OtpChallenge>();

globalWithOtpStore.__sendioBceOtpChallenges = challenges;

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

function hashCode(challengeId: string, code: string) {
  const secret = process.env.COMPANY_OTP_SECRET?.trim() || 'sendio-local-otp';

  return createHmac('sha256', secret)
    .update(`${challengeId}:${code}`)
    .digest();
}

function cleanExpiredChallenges() {
  const now = Date.now();

  for (const [id, challenge] of challenges.entries()) {
    if (challenge.expiresAt <= now || challenge.consumedAt) {
      challenges.delete(id);
    }
  }
}

export function createBceOtpChallenge(input: {
  companyNumber: string;
  entityNumber: string;
  contactId: string;
  maskedDestination: string;
}) {
  cleanExpiredChallenges();

  const now = Date.now();
  const recentChallenge = [...challenges.values()].find(
    (challenge) =>
      challenge.companyNumber === input.companyNumber &&
      challenge.entityNumber === input.entityNumber &&
      challenge.contactId === input.contactId &&
      now - challenge.createdAt < OTP_MIN_RESEND_MS,
  );

  if (recentChallenge) {
    throw new BceOtpChallengeError(
      'OTP_RATE_LIMITED',
      429,
      'Please wait one minute before requesting another verification code.',
    );
  }

  const id = randomUUID();
  const code = randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, '0');
  const expiresAt = now + OTP_TTL_MS;

  challenges.set(id, {
    id,
    companyNumber: input.companyNumber,
    entityNumber: input.entityNumber,
    contactId: input.contactId,
    maskedDestination: input.maskedDestination,
    codeHash: hashCode(id, code).toString('hex'),
    createdAt: now,
    expiresAt,
    attemptsRemaining: OTP_MAX_ATTEMPTS,
    consumedAt: null,
  });

  return {
    id,
    code,
    expiresAt,
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
  };
}

export function removeBceOtpChallenge(challengeId: string) {
  challenges.delete(challengeId);
}

export function verifyBceOtpChallenge(challengeId: string, code: string) {
  cleanExpiredChallenges();

  const challenge = challenges.get(challengeId);

  if (!challenge) {
    return {
      ok: false as const,
      status: 404,
      error: 'CHALLENGE_NOT_FOUND',
      message: 'The verification session was not found. Request a new code.',
    };
  }

  if (challenge.expiresAt <= Date.now()) {
    challenges.delete(challengeId);

    return {
      ok: false as const,
      status: 410,
      error: 'CODE_EXPIRED',
      message: 'The verification code has expired. Request a new code.',
    };
  }

  if (challenge.attemptsRemaining <= 0) {
    challenges.delete(challengeId);

    return {
      ok: false as const,
      status: 429,
      error: 'TOO_MANY_ATTEMPTS',
      message: 'Too many incorrect attempts. Request a new code.',
    };
  }

  const expected = Buffer.from(challenge.codeHash, 'hex');
  const received = hashCode(challengeId, code);
  const matches =
    expected.length === received.length && timingSafeEqual(expected, received);

  if (!matches) {
    challenge.attemptsRemaining -= 1;

    return {
      ok: false as const,
      status: 400,
      error: 'INVALID_CODE',
      message: `Incorrect code. ${challenge.attemptsRemaining} attempt${
        challenge.attemptsRemaining === 1 ? '' : 's'
      } remaining.`,
      attemptsRemaining: challenge.attemptsRemaining,
    };
  }

  return {
    ok: true as const,
    companyNumber: challenge.companyNumber,
    entityNumber: challenge.entityNumber,
    contactId: challenge.contactId,
    maskedDestination: challenge.maskedDestination,
  };
}

export function consumeBceOtpChallenge(challengeId: string) {
  const challenge = challenges.get(challengeId);

  if (!challenge) return;

  challenge.consumedAt = Date.now();
  challenges.delete(challengeId);
}
