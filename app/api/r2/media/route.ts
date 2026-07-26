import { NextRequest, NextResponse } from 'next/server';

import { createR2ReadUrl } from '@/lib/r2-storage';

export const runtime = 'nodejs';

const R2_MEDIA_KEY_PATTERN =
  /^users\/[0-9a-f-]{36}\/(images|company-ads|worker-media|worker-cv)\/[0-9a-f-]{36}\.(jpg|png|webp|avif|gif|mp4|webm|mov|m4v|pdf|doc|docx)$/i;

export async function GET(request: NextRequest) {
  try {
    const objectKey = request.nextUrl.searchParams.get('key')?.trim() ?? '';

    if (!R2_MEDIA_KEY_PATTERN.test(objectKey)) {
      return NextResponse.json({ error: 'Invalid media key.' }, { status: 400 });
    }

    const readUrl = await createR2ReadUrl({
      objectKey,
      expiresInSeconds: 3600,
    });

    const response = NextResponse.redirect(readUrl, 307);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error(
      'R2 media redirect error:',
      error instanceof Error ? error.message : error,
    );

    return NextResponse.json(
      { error: 'Media is unavailable.' },
      { status: 404 },
    );
  }
}
