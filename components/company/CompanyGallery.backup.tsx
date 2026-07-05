'use client';

import Image from 'next/image';
import { ChangeEvent, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCompanyId } from '@/lib/getCompanyId';

type GalleryItem = {
  id: string;
  url: string;
  type: string | null;
};

const MAX_IMAGES = 4;
const MAX_VIDEOS = 4;

export default function CompanyGallery() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const images = items.filter((item) => item.type === 'image');
  const videos = items.filter((item) => item.type === 'video');

  async function loadGallery(id?: string) {
    const currentCompanyId = id || companyId;

    if (!currentCompanyId) {
      return;
    }

    const { data, error } = await supabase
      .from('company_gallery')
      .select('*')
      .eq('company_id', currentCompanyId)
      .order('id', { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setItems(data || []);
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

  async function uploadFile(file: File, type: 'image' | 'video') {
    if (!file) return;

    if (!companyId) {
      alert('Company ID not found.');
      return;
    }

    if (type === 'image' && images.length >= MAX_IMAGES) {
      alert(`Maximum ${MAX_IMAGES} images`);
      return;
    }

    if (type === 'video' && videos.length >= MAX_VIDEOS) {
      alert(`Maximum ${MAX_VIDEOS} videos`);
      return;
    }

    setLoading(true);

    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${companyId}/gallery/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('company-gallery')
      .upload(filePath, file);

    if (uploadError) {
      alert(uploadError.message);
      setLoading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('company-gallery').getPublicUrl(filePath);

    const { error: dbError } = await supabase.from('company_gallery').insert([
      {
        company_id: companyId,
        url: publicUrl,
        type,
      },
    ]);

    if (dbError) {
      alert(dbError.message);
      setLoading(false);
      return;
    }

    await loadGallery(companyId);
    setLoading(false);
  }

  async function deleteItem(id: string, url: string) {
    const path = url.split('/company-gallery/')[1];

    if (path) {
      await supabase.storage.from('company-gallery').remove([path]);
    }

    const { error } = await supabase
      .from('company_gallery')
      .delete()
      .eq('id', id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadGallery();
  }

  function handleUploadChange(
    event: ChangeEvent<HTMLInputElement>,
    type: 'image' | 'video'
  ) {
    const file = event.target.files?.[0];

    if (file) {
      void uploadFile(file, type);
    }

    event.target.value = '';
  }

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
        </div>

        <div className="flex gap-2 text-[11px] font-black text-[var(--sendio-muted)]">
          <span className="rounded-full bg-[var(--sendio-soft)] px-3 py-1">
            {images.length}/{MAX_IMAGES} images
          </span>
          <span className="rounded-full bg-[var(--sendio-soft)] px-3 py-1">
            {videos.length}/{MAX_VIDEOS} videos
          </span>
        </div>
      </div>

      <GalleryRow
        title="Images"
        type="image"
        items={images}
        maxItems={MAX_IMAGES}
        loading={loading}
        onUpload={handleUploadChange}
        onDelete={deleteItem}
      />

      <div className="mt-4">
        <GalleryRow
          title="Videos"
          type="video"
          items={videos}
          maxItems={MAX_VIDEOS}
          loading={loading}
          onUpload={handleUploadChange}
          onDelete={deleteItem}
        />
      </div>
    </section>
  );
}

function GalleryRow({
  title,
  type,
  items,
  maxItems,
  loading,
  onUpload,
  onDelete,
}: {
  title: string;
  type: 'image' | 'video';
  items: GalleryItem[];
  maxItems: number;
  loading: boolean;
  onUpload: (
    event: ChangeEvent<HTMLInputElement>,
    type: 'image' | 'video'
  ) => void;
  onDelete: (id: string, url: string) => Promise<void>;
}) {
  const slots = Array.from({ length: maxItems }, (_, index) => items[index]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-black text-[var(--sendio-text)]">
          {title}
        </h3>

        <span className="text-[11px] font-bold text-[var(--sendio-muted)]">
          {items.length}/{maxItems}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {slots.map((item, index) =>
          item ? (
            <div
              key={item.id}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)]"
            >
              {type === 'image' ? (
                <Image
                  src={item.url}
                  alt="Company gallery image"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              ) : (
                <video
                  src={item.url}
                  controls
                  className="h-full w-full bg-black object-contain"
                />
              )}

              <button
                type="button"
                onClick={() => void onDelete(item.id, item.url)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-sm font-black text-red-500 shadow-sm"
                title="Delete"
              >
                ×
              </button>
            </div>
          ) : (
            <label
              key={`${type}-${index}`}
              className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-3 text-center transition hover:bg-[var(--sendio-soft-hover)]"
            >
              <span className="text-xl font-black text-[var(--sendio-text)]">
                +
              </span>

              <span className="mt-1 text-[11px] font-black text-[var(--sendio-muted)]">
                Upload {type}
              </span>

              <input
                type="file"
                accept={type === 'image' ? 'image/*' : 'video/*'}
                disabled={loading}
                onChange={(event) => onUpload(event, type)}
                className="hidden"
              />
            </label>
          )
        )}
      </div>
    </div>
  );
}