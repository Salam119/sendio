'use client';

import { supabase } from '@/lib/supabase';

export type R2UploadPurpose =
  | 'image'
  | 'company-ad'
  | 'worker-media'
  | 'worker-cv';

const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]);

const VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
]);

const CV_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_WORKER_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_CV_SIZE_BYTES = 10 * 1024 * 1024;

type UploadUrlResponse = {
  uploadUrl: string;
  objectKey: string;
  headers: Record<string, string>;
};

async function getAccessToken() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error('Please sign in again.');
  }

  return session.access_token;
}

function getFileExtension(fileName: string) {
  const normalizedName = fileName.trim().toLowerCase();
  const lastDot = normalizedName.lastIndexOf('.');

  return lastDot >= 0 ? normalizedName.slice(lastDot + 1) : '';
}

export function isR2MediaUrl(url: string | null | undefined) {
  return Boolean(url?.startsWith('/api/r2/media?key='));
}

export function validateR2File(file: File, purpose: R2UploadPurpose) {
  const extension = getFileExtension(file.name);
  const contentType = file.type.trim().toLowerCase();

  if (file.size <= 0) {
    throw new Error('The selected file is empty.');
  }

  if (purpose === 'image') {
    if (!IMAGE_TYPES.has(contentType)) {
      throw new Error('Supported image types are JPG, PNG, WebP, AVIF, and GIF.');
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error('Image size must be 10 MB or less.');
    }

    return;
  }

  if (purpose === 'company-ad') {
    if (IMAGE_TYPES.has(contentType)) {
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        throw new Error('Advertisement image size must be 10 MB or less.');
      }

      return;
    }

    if (VIDEO_TYPES.has(contentType)) {
      if (file.size > MAX_VIDEO_SIZE_BYTES) {
        throw new Error('Advertisement video size must be 50 MB or less.');
      }

      return;
    }

    throw new Error('Only supported image or video files are allowed.');
  }

  if (purpose === 'worker-media') {
    if (IMAGE_TYPES.has(contentType)) {
      if (file.size > MAX_WORKER_IMAGE_SIZE_BYTES) {
        throw new Error('Worker image size must be 5 MB or less.');
      }

      return;
    }

    if (VIDEO_TYPES.has(contentType)) {
      if (file.size > MAX_VIDEO_SIZE_BYTES) {
        throw new Error('Worker video size must be 50 MB or less.');
      }

      return;
    }

    throw new Error('Only supported image or video files are allowed.');
  }

  const allowedCvExtension = ['pdf', 'doc', 'docx'].includes(extension);
  const allowedCvMime = !contentType || CV_TYPES.has(contentType);

  if (!allowedCvExtension || !allowedCvMime) {
    throw new Error('Only PDF, DOC, or DOCX files are allowed.');
  }

  if (file.size > MAX_CV_SIZE_BYTES) {
    throw new Error('CV file size must be 10 MB or less.');
  }
}

export async function uploadFileToR2(
  file: File,
  purpose: R2UploadPurpose,
) {
  validateR2File(file, purpose);

  const accessToken = await getAccessToken();
  const uploadUrlResponse = await fetch('/api/r2/upload-url', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      purpose,
      contentType: file.type,
      size: file.size,
      fileName: file.name,
    }),
  });

  const uploadData = (await uploadUrlResponse.json()) as
    | UploadUrlResponse
    | { error?: string };

  if (!uploadUrlResponse.ok || !('uploadUrl' in uploadData)) {
    throw new Error(
      'error' in uploadData && uploadData.error
        ? uploadData.error
        : 'Could not prepare file upload.',
    );
  }

  const uploadResponse = await fetch(uploadData.uploadUrl, {
    method: 'PUT',
    headers: uploadData.headers,
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error('Could not upload the file to Cloudflare R2.');
  }

  return {
    objectKey: uploadData.objectKey,
    publicUrl: `/api/r2/media?key=${encodeURIComponent(uploadData.objectKey)}`,
  };
}

export async function uploadImageToR2(file: File) {
  return uploadFileToR2(file, 'image');
}

export async function deleteFileFromR2(objectKey: string) {
  const accessToken = await getAccessToken();
  const response = await fetch('/api/r2/delete-object', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ objectKey }),
  });

  const result = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(result.error || 'Could not delete the file from R2.');
  }
}

export async function deleteImageFromR2(objectKey: string) {
  return deleteFileFromR2(objectKey);
}
