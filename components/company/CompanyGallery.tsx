'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCompanyId } from '@/lib/getCompanyId';

type GalleryItem = {
  id: string;
  url: string;
  type: string | null;
};

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
      .eq('company_id', currentCompanyId);

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

    initGallery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadFile(
    file: File,
    type: 'image' | 'video'
  ) {
    if (!file) return;

    if (!companyId) {
      alert('Company ID not found.');
      return;
    }

    if (type === 'image' && images.length >= 4) {
      alert('Maximum 4 images');
      return;
    }

    if (type === 'video' && videos.length >= 2) {
      alert('Maximum 2 videos');
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
    } = supabase.storage
      .from('company-gallery')
      .getPublicUrl(filePath);

    const { error: dbError } = await supabase
      .from('company_gallery')
      .insert([
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
      await supabase.storage
        .from('company-gallery')
        .remove([path]);
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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-[#e2cfbc] p-6">
        <h2 className="text-xl font-semibold mb-4">
          Upload Images
        </h2>

        <p className="text-sm text-gray-500 mb-3">
          {images.length}/4 Images
        </p>

        <input
          type="file"
          accept="image/*"
          disabled={loading || images.length >= 4}
          onChange={(e) => {
            const file = e.target.files?.[0];

            if (file) {
              uploadFile(file, 'image');
            }
          }}
          className="w-full border border-[#e2cfbc] rounded-xl p-3"
        />
      </div>

      <div className="bg-white rounded-3xl border border-[#e2cfbc] p-6">
        <h2 className="text-xl font-semibold mb-4">
          Upload Videos
        </h2>

        <p className="text-sm text-gray-500 mb-3">
          {videos.length}/2 Videos
        </p>

        <input
          type="file"
          accept="video/*"
          disabled={loading || videos.length >= 2}
          onChange={(e) => {
            const file = e.target.files?.[0];

            if (file) {
              uploadFile(file, 'video');
            }
          }}
          className="w-full border border-[#e2cfbc] rounded-xl p-3"
        />
      </div>

      <div className="bg-white rounded-3xl border border-[#e2cfbc] p-6">
        <h2 className="text-xl font-semibold mb-6">
          Gallery
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="border border-[#e2cfbc] rounded-2xl overflow-hidden"
            >
              {item.type === 'image' ? (
                <img
                  src={item.url}
                  alt=""
                  className="w-full h-56 object-cover"
                />
              ) : (
                <video
                  src={item.url}
                  controls
                  className="w-full h-56"
                />
              )}

              <button
                onClick={() => deleteItem(item.id, item.url)}
                className="w-full py-3 text-red-500"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
