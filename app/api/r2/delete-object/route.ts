import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import { deleteR2Object } from '@/lib/r2-storage';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const R2_MEDIA_KEY_PATTERN =
  /^users\/[0-9a-f-]{36}\/(images|company-ads|worker-media|worker-cv)\/[0-9a-f-]{36}\.(jpg|png|webp|avif|gif|mp4|webm|mov|m4v|pdf|doc|docx)$/i;

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 },
      );
    }

    const authorization = request.headers.get('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const accessToken = authorization.slice(7).trim();

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body: unknown = await request.json();

    if (
      typeof body !== 'object' ||
      body === null ||
      !('objectKey' in body) ||
      typeof body.objectKey !== 'string'
    ) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const objectKey = body.objectKey.trim();

    if (!R2_MEDIA_KEY_PATTERN.test(objectKey)) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const ownsObject = objectKey.startsWith(`users/${user.id}/`);

    if (!ownsObject) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (
        profileError ||
        !profile ||
        !['admin', 'super_admin'].includes(profile.role)
      ) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }
    }

    await deleteR2Object(objectKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      'R2 delete error:',
      error instanceof Error ? error.message : error,
    );

    return NextResponse.json(
      { error: 'Could not delete the file.' },
      { status: 500 },
    );
  }
}
