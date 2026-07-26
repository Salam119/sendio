import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import { createR2UploadUrl } from '@/lib/r2-storage';

export const runtime = 'nodejs';

type UploadPurpose =
  | 'image'
  | 'company-ad'
  | 'worker-media'
  | 'worker-cv';

type UploadRule = {
  extension: string;
  contentType: string;
  maxSizeBytes: number;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const IMAGE_RULES: Record<string, UploadRule> = {
  'image/jpeg': {
    extension: 'jpg',
    contentType: 'image/jpeg',
    maxSizeBytes: 10 * 1024 * 1024,
  },
  'image/png': {
    extension: 'png',
    contentType: 'image/png',
    maxSizeBytes: 10 * 1024 * 1024,
  },
  'image/webp': {
    extension: 'webp',
    contentType: 'image/webp',
    maxSizeBytes: 10 * 1024 * 1024,
  },
  'image/avif': {
    extension: 'avif',
    contentType: 'image/avif',
    maxSizeBytes: 10 * 1024 * 1024,
  },
  'image/gif': {
    extension: 'gif',
    contentType: 'image/gif',
    maxSizeBytes: 10 * 1024 * 1024,
  },
};

const VIDEO_RULES: Record<string, UploadRule> = {
  'video/mp4': {
    extension: 'mp4',
    contentType: 'video/mp4',
    maxSizeBytes: 50 * 1024 * 1024,
  },
  'video/webm': {
    extension: 'webm',
    contentType: 'video/webm',
    maxSizeBytes: 50 * 1024 * 1024,
  },
  'video/quicktime': {
    extension: 'mov',
    contentType: 'video/quicktime',
    maxSizeBytes: 50 * 1024 * 1024,
  },
  'video/x-m4v': {
    extension: 'm4v',
    contentType: 'video/x-m4v',
    maxSizeBytes: 50 * 1024 * 1024,
  },
};

const CV_RULES_BY_EXTENSION: Record<string, UploadRule> = {
  pdf: {
    extension: 'pdf',
    contentType: 'application/pdf',
    maxSizeBytes: 10 * 1024 * 1024,
  },
  doc: {
    extension: 'doc',
    contentType: 'application/msword',
    maxSizeBytes: 10 * 1024 * 1024,
  },
  docx: {
    extension: 'docx',
    contentType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    maxSizeBytes: 10 * 1024 * 1024,
  },
};

const PURPOSE_FOLDERS: Record<UploadPurpose, string> = {
  image: 'images',
  'company-ad': 'company-ads',
  'worker-media': 'worker-media',
  'worker-cv': 'worker-cv',
};

function getFileExtension(fileName: string) {
  const normalizedName = fileName.trim().toLowerCase();
  const lastDot = normalizedName.lastIndexOf('.');

  return lastDot >= 0 ? normalizedName.slice(lastDot + 1) : '';
}

function getUploadRule({
  purpose,
  contentType,
  fileName,
}: {
  purpose: UploadPurpose;
  contentType: string;
  fileName: string;
}) {
  const normalizedContentType = contentType.trim().toLowerCase();

  if (purpose === 'image') {
    return IMAGE_RULES[normalizedContentType] ?? null;
  }

  if (purpose === 'company-ad') {
    return (
      IMAGE_RULES[normalizedContentType] ??
      VIDEO_RULES[normalizedContentType] ??
      null
    );
  }

  if (purpose === 'worker-media') {
    const rule =
      IMAGE_RULES[normalizedContentType] ??
      VIDEO_RULES[normalizedContentType] ??
      null;

    if (
      rule &&
      normalizedContentType.startsWith('image/') &&
      rule.maxSizeBytes > 5 * 1024 * 1024
    ) {
      return {
        ...rule,
        maxSizeBytes: 5 * 1024 * 1024,
      };
    }

    return rule;
  }

  const extension = getFileExtension(fileName);
  const rule = CV_RULES_BY_EXTENSION[extension] ?? null;

  if (!rule) {
    return null;
  }

  if (
    normalizedContentType &&
    normalizedContentType !== rule.contentType &&
    normalizedContentType !== 'application/octet-stream'
  ) {
    return null;
  }

  return rule;
}

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
      !('purpose' in body) ||
      typeof body.purpose !== 'string' ||
      !('contentType' in body) ||
      typeof body.contentType !== 'string' ||
      !('size' in body) ||
      typeof body.size !== 'number' ||
      !('fileName' in body) ||
      typeof body.fileName !== 'string'
    ) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const purpose = body.purpose as UploadPurpose;

    if (!(purpose in PURPOSE_FOLDERS)) {
      return NextResponse.json(
        { error: 'Unsupported upload purpose.' },
        { status: 400 },
      );
    }

    let profileAllowed = true;

    if (purpose === 'company-ad') {
      const { data, error } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      profileAllowed = !error && Boolean(data?.id);
    } else if (purpose === 'worker-media' || purpose === 'worker-cv') {
      const { data, error } = await supabase
        .from('workers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      profileAllowed = !error && Boolean(data?.id);
    }

    if (!profileAllowed) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const rule = getUploadRule({
      purpose,
      contentType: body.contentType,
      fileName: body.fileName,
    });

    if (!rule) {
      return NextResponse.json(
        { error: 'Unsupported file type.' },
        { status: 400 },
      );
    }

    if (body.size <= 0 || body.size > rule.maxSizeBytes) {
      return NextResponse.json(
        { error: 'The selected file exceeds the allowed size.' },
        { status: 400 },
      );
    }

    const objectKey =
      `users/${user.id}/${PURPOSE_FOLDERS[purpose]}/` +
      `${crypto.randomUUID()}.${rule.extension}`;

    const uploadData = await createR2UploadUrl({
      objectKey,
      contentType: rule.contentType,
    });

    return NextResponse.json(uploadData);
  } catch (error) {
    console.error(
      'R2 upload URL error:',
      error instanceof Error ? error.message : error,
    );

    return NextResponse.json(
      { error: 'Could not create upload URL.' },
      { status: 500 },
    );
  }
}
