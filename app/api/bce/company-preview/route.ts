import 'server-only';

import { NextRequest, NextResponse } from 'next/server';

import {
  BceRegistrationLookupError,
  lookupBceRegistrationCompany,
} from '@/lib/bce-registration-r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get('number') ?? '';

  try {
    const result = await lookupBceRegistrationCompany(input);

    return NextResponse.json(
      {
        ok: true,
        previewOnly: false,
        extractNumber: result.extractNumber,
        company: result.company,
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

    console.error('BCE registration lookup failed:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'BCE_REGISTRATION_LOOKUP_FAILED',
        message: 'The official BCE registration data could not be loaded.',
      },
      { status: 500 },
    );
  }
}
