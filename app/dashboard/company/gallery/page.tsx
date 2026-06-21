'use client';

import CompanyGallery from '@/components/company/CompanyGallery';

export default function GalleryPage() {
  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold text-[#2c3e2f]">
          Gallery
        </h1>

        <p className="text-gray-500 mt-2">
          Manage your company photos and videos.
        </p>
      </div>

      <CompanyGallery />

    </div>
  );
}