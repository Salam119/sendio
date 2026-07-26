'use client';

import Image from 'next/image';
import { ChangeEvent, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCompanyId } from '@/lib/getCompanyId';
import {
  deleteImageFromR2,
  uploadImageToR2,
} from '@/lib/r2-media-client';

type Company = {
  name: string;
  category: string | null;
  city: string | null;
  address: string | null;
  status: string | null;
  logo: string | null;
  phone: string | null;
  email: string | null;
  rating: number | null;
  reviews_count: number | null;
};

type GalleryItem = {
  id: string;
  url: string;
  type: string | null;
  storage_provider: 'supabase' | 'r2' | null;
  object_key: string | null;
};

const MAX_MEDIA = 4;
const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/avif';

function cleanPhone(phone: string | null) {
  return phone?.replace(/[^\d+]/g, '') ?? '';
}

function getStatusStyle(status: string | null) {
  if (status === 'available') {
    return 'border-green-200 bg-green-50 text-green-700';
  }

  if (status === 'busy') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-red-200 bg-red-50 text-red-700';
}

export default function CompanyHeader() {
  const [company, setCompany] = useState<Company | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);

  const galleryImages = galleryItems.filter((item) => item.type === 'image');

  useEffect(() => {
    let isMounted = true;

    void getCompanyId().then(async (id) => {
      if (!isMounted) return;

      if (!id) {
        alert('Company not found for this user.');
        return;
      }

      setCompanyId(id);

      await Promise.all([reloadCompany(id), loadGallery(id)]);
    });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reloadCompany(id?: string) {
    const currentCompanyId = id || companyId;

    if (!currentCompanyId) {
      return;
    }

    const { data, error } = await supabase
      .from('companies')
      .select(
        'name, category, city, address, status, logo, phone, email, rating, reviews_count',
      )
      .eq('id', currentCompanyId)
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setCompany(data as Company);
  }

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

    setGalleryItems((data ?? []) as GalleryItem[]);
  }

  async function setLogoFromGallery(url: string) {
    if (!companyId) {
      alert('Company ID not found.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('companies')
        .update({ logo: url })
        .eq('id', companyId);

      if (error) {
        throw new Error(error.message);
      }

      await reloadCompany(companyId);
      setShowGalleryPicker(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not update logo.');
    } finally {
      setLoading(false);
    }
  }

  async function uploadLogo(file: File) {
    if (!file) return;

    if (!companyId) {
      alert('Company ID not found.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file for the logo.');
      return;
    }

    if (galleryItems.length >= MAX_MEDIA) {
      alert(
        'Gallery is full. Delete or replace one media item before uploading a new logo.',
      );
      return;
    }

    setLoading(true);

    try {
      const uploaded = await uploadImageToR2(file);
      const { data: insertedGalleryItem, error: galleryError } = await supabase
        .from('company_gallery')
        .insert([
          {
            company_id: companyId,
            url: uploaded.publicUrl,
            type: 'image',
            storage_provider: 'r2',
            object_key: uploaded.objectKey,
          },
        ])
        .select('id, url, type, storage_provider, object_key')
        .single();

      if (galleryError) {
        try {
          await deleteImageFromR2(uploaded.objectKey);
        } catch (cleanupError) {
          console.error(cleanupError);
        }

        throw new Error(galleryError.message);
      }

      const { error: companyError } = await supabase
        .from('companies')
        .update({ logo: uploaded.publicUrl })
        .eq('id', companyId);

      if (companyError) {
        if (insertedGalleryItem?.id) {
          await supabase
            .from('company_gallery')
            .delete()
            .eq('id', insertedGalleryItem.id)
            .eq('company_id', companyId);
        }

        try {
          await deleteImageFromR2(uploaded.objectKey);
        } catch (cleanupError) {
          console.error(cleanupError);
        }

        throw new Error(companyError.message);
      }

      await Promise.all([reloadCompany(companyId), loadGallery(companyId)]);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not upload logo.');
    } finally {
      setLoading(false);
    }
  }

  function handleLogoUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      void uploadLogo(file);
    }

    event.target.value = '';
  }

  const phoneNumber = cleanPhone(company?.phone ?? null);
  const rating = Number(company?.rating || 0).toFixed(1);
  const reviewsCount = company?.reviews_count || 0;
  const status = company?.status || 'available';
  const galleryIsFull = galleryItems.length >= MAX_MEDIA;

  return (
    <section className="rounded-[24px] border border-[var(--sendio-border)] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[24px] border border-[var(--sendio-border)] bg-[var(--sendio-soft)] shadow-sm">
            {company?.logo ? (
              <Image
                src={company.logo}
                alt="Company logo"
                fill
                className="object-contain p-2"
                sizes="96px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-black text-[var(--sendio-muted)]">
                Logo
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-[var(--sendio-text)] md:text-3xl">
                {company?.name || 'Company Name'}
              </h1>

              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase ${getStatusStyle(
                  status,
                )}`}
              >
                {status}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--sendio-muted)]">
              <span>★ {rating}</span>
              <span>({reviewsCount} reviews)</span>
              {company?.category ? <span>• {company.category}</span> : null}
            </div>

            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-[var(--sendio-muted)]">
              {company?.city ? <span>{company.city}</span> : null}
              {company?.address ? <span>• {company.address}</span> : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {phoneNumber ? (
                <a
                  href={`tel:${phoneNumber}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--sendio-border)] bg-[var(--sendio-soft)] text-sm font-black transition hover:bg-[var(--sendio-soft-hover)]"
                  title="Call"
                >
                  ☎
                </a>
              ) : null}

              {company?.email ? (
                <a
                  href={`mailto:${company.email}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--sendio-border)] bg-[var(--sendio-soft)] text-sm font-black transition hover:bg-[var(--sendio-soft-hover)]"
                  title="Email"
                >
                  ✉
                </a>
              ) : null}

              {phoneNumber ? (
                <a
                  href={`https://wa.me/${phoneNumber.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-green-200 bg-green-50 text-[11px] font-black text-green-700 transition hover:bg-green-100"
                  title="WhatsApp"
                >
                  WA
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            <label
              className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-black shadow-sm transition ${
                loading || galleryIsFull
                  ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                  : 'cursor-pointer bg-[var(--sendio-accent)] text-[var(--sendio-accent-text)] hover:opacity-90'
              }`}
              title={
                galleryIsFull
                  ? 'Gallery is full. Delete or replace one media item first.'
                  : 'Upload logo'
              }
            >
              {loading ? 'Uploading...' : 'Upload Logo'}
              <input
                type="file"
                accept={ACCEPTED_IMAGE_TYPES}
                disabled={loading || galleryIsFull}
                onChange={handleLogoUploadChange}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={() => setShowGalleryPicker((current) => !current)}
              disabled={loading || galleryImages.length === 0}
              className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-black shadow-sm transition ${
                loading || galleryImages.length === 0
                  ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                  : 'bg-[var(--sendio-soft)] text-[var(--sendio-text)] hover:bg-[var(--sendio-soft-hover)]'
              }`}
            >
              Choose from Gallery
            </button>
          </div>

          <span className="text-[11px] font-bold text-[var(--sendio-muted)]">
            Gallery: {galleryItems.length}/{MAX_MEDIA}
          </span>
        </div>
      </div>

      {showGalleryPicker ? (
        <div className="mt-4 rounded-[22px] border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
                Choose logo
              </p>
              <h3 className="text-sm font-black text-[var(--sendio-text)]">
                Select an image from Gallery
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setShowGalleryPicker(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-black text-[var(--sendio-text)] shadow-sm"
              title="Close"
            >
              ×
            </button>
          </div>

          {galleryImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {galleryImages.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void setLogoFromGallery(item.url)}
                  disabled={loading}
                  className="relative aspect-square overflow-hidden rounded-2xl border border-[var(--sendio-border)] bg-white transition hover:scale-[1.02]"
                  title="Use as logo"
                >
                  <Image
                    src={item.url}
                    alt="Gallery image"
                    fill
                    className="object-contain p-2"
                    sizes="(max-width: 640px) 50vw, 25vw"
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-white px-4 py-3 text-xs font-bold text-[var(--sendio-muted)]">
              No gallery images yet. Upload an image first.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
