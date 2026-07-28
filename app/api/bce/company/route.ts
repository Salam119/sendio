import { NextRequest, NextResponse } from 'next/server';

import {
  findBceCompany,
  normalizeBelgianEnterpriseNumber,
} from '@/lib/bce-r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get('number') ?? '';
  const enterpriseNumber = normalizeBelgianEnterpriseNumber(input);

  if (!enterpriseNumber) {
    return NextResponse.json(
      {
        ok: false,
        error: 'INVALID_ENTERPRISE_NUMBER',
        message: 'Numéro d’entreprise belge invalide.',
      },
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  }

  try {
    const result = await findBceCompany(enterpriseNumber);

    if (!result) {
      return NextResponse.json(
        {
          ok: false,
          error: 'COMPANY_NOT_FOUND',
          message: 'Entreprise introuvable dans les données BCE.',
        },
        {
          status: 404,
          headers: {
            'Cache-Control': 'no-store',
          },
        },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        source: 'BCE',
        extractNumber: result.extractNumber,
        company: result.company,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=300',
        },
      },
    );
  } catch (error) {
    console.error('BCE company lookup failed:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'BCE_LOOKUP_FAILED',
        message: 'La vérification BCE est temporairement indisponible.',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  }
}
