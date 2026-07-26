'use client';

import Image from 'next/image';
import { ChangeEvent, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCompanyId } from '@/lib/getCompanyId';
import {
  deleteImageFromR2,
  uploadImageToR2,
} from '@/lib/r2-media-client';

type GalleryItem = {
  id: string;
  url: string;
  type: string | null;
  storage_provider: 'supabase' | 'r2' | null;
  object_key: string | null;
};

const MAX_MEDIA = 4;
const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/avif';

function getSupabaseObjectPath(url: string) {
  const path = url.split('/company-gallery/')[1]?.split('?')[0];

  if (!path) {
    return null;
  }

  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

export default function CompanyGallery() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewItem, setPreviewItem] = useState<GalleryItem | null>(null);

  async function loadGallery(id?: string) {
    const currentCompanyId = id || companyId;

    if (!currentCompanyId) {
      return;
    }

    const { data, error } = await supabase
      .from('company_gallery')
      .select('id, url, type, storage_provider, object_key')
      .eq('company_id', currentCompanyId)
      .order('id', { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setItems((data ?? []) as GalleryItem[]);
  }

  useEffect(() => {
    async function initGallery() {
      const id = await getCompanyId();

      if (!id) {
        alert('Company not found for this user.');
        return;
      }

      setCompanyId(id);
      await loadGallery(id);
    }

    void initGallery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadFile(file: File) {
    if (!file) return;

    if (!companyId) {
      alert('Company ID not found.');
      return;
    }

    if (items.length >= MAX_MEDIA) {
      alert('Gallery is full. Delete or replace one media item before uploading a new file.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    setLoading(true);

    try {
      const uploaded = await uploadImageToR2(file);
      const { error: dbError } = await supabase.from('company_gallery').insert([
        {
          company_id: companyId,
          url: uploaded.publicUrl,
          type: 'image',
          storage_provider: 'r2',
          object_key: uploaded.objectKey,
        },
      ]);

      if (dbError) {
        try {
          await deleteImageFromR2(uploaded.objectKey);
        } catch (cleanupError) {
          console.error(cleanupError);
        }

        throw new Error(dbError.message);
      }

      await loadGallery(companyId);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not upload image.');
    } finally {
      setLoading(false);
    }
  }

  async function deleteItem(item: GalleryItem) {
    if (!companyId) {
      alert('Company ID not found.');
      return;
    }

    const confirmed = window.confirm('Delete this media item?');

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const { error: dbError } = await supabase
        .from('company_gallery')
        .delete()
        .eq('id', item.id)
        .eq('company_id', companyId);

      if (dbError) {
        throw new Error(dbError.message);
      }

      const { error: logoError } = await supabase
        .from('companies')
        .update({ logo: null })
        .eq('id', companyId)
        .eq('logo', item.url);

      if (logoError) {
        console.error(logoError);
      }

      try {
        if (item.storage_provider === 'r2' && item.object_key) {
          await deleteImageFromR2(item.object_key);
        } else {
          const path = getSupabaseObjectPath(item.url);

          if (path) {
            const { error: storageError } = await supabase.storage
              .from('company-gallery')
              .remove([path]);

            if (storageError) {
              throw storageError;
            }
          }
        }
      } catch (storageError) {
        console.error(storageError);
        alert('The gallery entry was deleted, but storage cleanup could not be completed.');
      }

      if (previewItem?.id === item.id) {
        setPreviewItem(null);
      }

      await loadGallery(companyId);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not delete media.');
    } finally {
      setLoading(false);
    }
  }

  function handleUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      void uploadFile(file);
    }

    event.target.value = '';
  }

  const slots = Array.from({ length: MAX_MEDIA }, (_, index) => items[index]);

  return (
    <section className="rounded-[22px] border border-[var(--sendio-border)] bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
            Gallery
          </p>

          <h2 className="mt-1 text-base font-black text-[var(--sendio-text)]">
            Images and videos
          </h2>

          <p className="mt-1 text-[11px] font-semibold text-[var(--sendio-muted)]">
            Upload up to {MAX_MEDIA} media items. Use them later for logo, ads, showcase, or public profile.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[var(--sendio-soft)] px-3 py-1 text-[11px] font-black text-[var(--sendio-muted)]">
            {items.length}/{MAX_MEDIA} media
          </span>

          <label
            className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-[11px] font-black shadow-sm transition ${
              loading || items.length >= MAX_MEDIA
                ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                : 'cursor-pointer bg-[var(--sendio-accent)] text-[var(--sendio-accent-text)] hover:opacity-90'
            }`}
          >
            {loading ? 'Uploading...' : 'Upload media'}
            <input
              type="file"
              accept={ACCEPTED_IMAGE_TYPES}
              disabled={loading || items.length >= MAX_MEDIA}
              onChange={handleUploadChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {slots.map((item, index) =>
          item ? (
            <div
              key={item.id}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)]"
            >
              <button
                type="button"
                onClick={() => setPreviewItem(item)}
                className="absolute inset-0 z-10"
                title="Open preview"
              >
                <span className="sr-only">Open preview</span>
              </button>

              {item.type === 'video' ? (
                <video
                  src={item.url}
                  muted
                  playsInline
                  className="h-full w-full object-contain"
                />
              ) : (
                <Image
  src={item.url}
  unoptimized={item.url.startsWith('/api/r2/media?')}
  alt="Company gallery media"
  fill
  className="object-contain"
  sizes="(max-width: 768px) 50vw, 25vw"
/>
              )}

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void deleteItem(item);
                }}
                className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-sm font-black text-red-500 shadow-sm transition hover:bg-red-50"
                title="Delete"
              >
                ×
              </button>
            </div>
          ) : (
            <label
              key={`empty-${index}`}
              className={`flex aspect-square flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-3 text-center transition ${
                loading || items.length >= MAX_MEDIA
                  ? 'cursor-not-allowed opacity-60'
                  : 'cursor-pointer hover:bg-[var(--sendio-soft-hover)]'
              }`}
            >
              <span className="text-xl font-black text-[var(--sendio-text)]">
                +
              </span>

              <span className="mt-1 text-[11px] font-black text-[var(--sendio-muted)]">
                Upload media
              </span>

              <input
                type="file"
                accept={ACCEPTED_IMAGE_TYPES}
                disabled={loading || items.length >= MAX_MEDIA}
                onChange={handleUploadChange}
                className="hidden"
              />
            </label>
          ),
        )}
      </div>

      {previewItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative inline-flex max-h-[92vh] max-w-[92vw] items-center justify-center rounded-[24px] bg-white p-3 shadow-2xl">
            <button
              type="button"
              onClick={() => setPreviewItem(null)}
              className="absolute -right-3 -top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-black text-[var(--sendio-text)] shadow-sm"
              title="Close"
            >
              ×
            </button>

            {previewItem.type === 'video' ? (
              <video
                src={previewItem.url}
                controls
                className="max-h-[86vh] max-w-[88vw] rounded-2xl object-contain"
              />
            ) : (
              <Image
                src={previewItem.url}
                unoptimized={previewItem.url.startsWith('/api/r2/media?')}
                alt="Company gallery preview"
                width={1200}
                height={1200}
                className="h-auto max-h-[86vh] w-auto max-w-[88vw] rounded-2xl object-contain"
              />
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
