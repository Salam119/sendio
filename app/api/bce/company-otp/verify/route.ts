import 'server-only';

import { NextRequest, NextResponse } from 'next/server';

import {
  CompanyAccountCreationError,
  createVerifiedCompanyAccount,
} from '@/lib/bce-company-account';
import {
  consumeBceOtpChallenge,
  verifyBceOtpChallenge,
} from '@/lib/bce-company-otp-supabase';
import {
  BceRegistrationLookupError,
  lookupBceRegistrationCompany,
} from '@/lib/bce-registration-r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type VerifyOtpBody = {
  challengeId?: string;
  code?: string;
  password?: string;
  confirmPassword?: string;
};

function isRegistrationEnabled() {
  return process.env.ENABLE_REAL_COMPANY_REGISTRATION === 'true';
}

export async function POST(request: NextRequest) {
  if (!isRegistrationEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        error: 'COMPANY_REGISTRATION_DISABLED',
        message: 'Real company registration is not enabled yet.',
      },
      { status: 503 },
    );
  }

  let body: VerifyOtpBody;

  try {
    body = (await request.json()) as VerifyOtpBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'INVALID_REQUEST',
        message: 'The verification request is invalid.',
      },
      { status: 400 },
    );
  }

  const challengeId = body.challengeId?.trim() || '';
  const code = body.code?.replace(/\D/g, '').slice(0, 6) || '';
  const password = body.password || '';
  const confirmPassword = body.confirmPassword || '';

  if (!challengeId || code.length !== 6) {
    return NextResponse.json(
      {
        ok: false,
        error: 'INVALID_CODE_FORMAT',
        message: 'Enter the complete 6-digit verification code.',
      },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      {
        ok: false,
        error: 'WEAK_PASSWORD',
        message: 'Use a password with at least 8 characters.',
      },
      { status: 400 },
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json(
      {
        ok: false,
        error: 'PASSWORDS_DO_NOT_MATCH',
        message: 'The two password fields do not match.',
      },
      { status: 400 },
    );
  }

  const verification = await verifyBceOtpChallenge(challengeId, code);

  if (!verification.ok) {
    return NextResponse.json(verification, { status: verification.status });
  }

  try {
    const lookup = await lookupBceRegistrationCompany(verification.companyNumber);
    const account = await createVerifiedCompanyAccount({
      lookup,
      entityNumber: verification.entityNumber,
      contactId: verification.contactId,
      password,
    });

    await consumeBceOtpChallenge(challengeId);

    return NextResponse.json(
      {
        ok: true,
        verified: true,
        accountCreated: account.accountCreated,
        companyId: account.companyId,
        companySlug: account.companySlug,
        session: account.session,
        message: account.session
          ? 'Your verified company account was created successfully.'
          : 'Your verified company account was created. Sign in with the official email and your new password.',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    if (error instanceof BceRegistrationLookupError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.code,
          message: error.message,
        },
        { status: error.status },
      );
    }

    if (error instanceof CompanyAccountCreationError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.code,
          message: error.message,
        },
        { status: error.status },
      );
    }

    console.error('Verified company account creation failed:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'COMPANY_ACCOUNT_CREATION_FAILED',
        message: 'The verified company account could not be created.',
      },
      { status: 500 },
    );
  }
}
