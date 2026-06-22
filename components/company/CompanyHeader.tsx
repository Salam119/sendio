'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCompanyId } from '@/lib/getCompanyId';

type Company = {
  name: string;
  category: string | null;
  city: string | null;
  status: string | null;
  logo: string | null;
  cover: string | null;
};

export default function CompanyHeader() {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void getCompanyId().then(async (companyId) => {
      if (!isMounted) return;

      if (!companyId) {
        alert('Company not found for this user.');
        return;
      }

      const { data, error } = await supabase
        .from('companies')
        .select('name, category, city, status, logo, cover')
        .eq('id', companyId)
        .single();

      if (!isMounted) return;

      if (error) {
        alert(error.message);
        return;
      }

      setCompany(data);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  async function reloadCompany(companyId: string) {
    const { data, error } = await supabase
      .from('companies')
      .select('name, category, city, status, logo, cover')
      .eq('id', companyId)
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setCompany(data);
  }

  async function uploadImage(file: File, field: 'logo' | 'cover') {
    setLoading(true);

    const companyId = await getCompanyId();

    if (!companyId) {
      alert('Company not found for this user.');
      setLoading(false);
      return;
    }

    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${companyId}/${field}/${fileName}`;

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

    const { error } = await supabase
      .from('companies')
      .update({
        [field]: publicUrl,
      })
      .eq('id', companyId);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    await reloadCompany(companyId);
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e2cfbc] overflow-hidden mb-6">
      <div className="relative h-56 bg-[#fefcf5] flex items-center justify-center">
        {company?.cover ? (
          <img
            src={company.cover}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-gray-400 text-sm">
            No cover image uploaded yet.
          </span>
        )}

        <label className="absolute bottom-4 right-4 bg-[#c49a6c] text-white px-4 py-2 rounded-xl cursor-pointer">
          {loading ? 'Uploading...' : 'Upload Cover'}
          <input
            type="file"
            accept="image/*"
            disabled={loading}
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (file) {
                void uploadImage(file, 'cover');
              }
            }}
            className="hidden"
          />
        </label>
      </div>

      <div className="p-6">
        <div className="-mt-16 mb-4 relative z-10">
          <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow flex items-center justify-center overflow-hidden">
            {company?.logo ? (
              <img
                src={company.logo}
                alt="Logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-400 text-sm">Logo</span>
            )}
          </div>

          <label className="inline-block mt-3 bg-[#c49a6c] text-white px-4 py-2 rounded-xl cursor-pointer text-sm">
            {loading ? 'Uploading...' : 'Upload Logo'}
            <input
              type="file"
              accept="image/*"
              disabled={loading}
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (file) {
                  void uploadImage(file, 'logo');
                }
              }}
              className="hidden"
            />
          </label>
        </div>

        <h1 className="text-3xl font-bold text-[#2c3e2f]">
          {company?.name || 'Company Name'}
        </h1>

        <div className="flex flex-wrap gap-3 mt-3 text-gray-500">
          {company?.category && <span>{company.category}</span>}

          {company?.city && <span>{company.city}</span>}
        </div>

        <div className="mt-4">
          <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-700">
            {(company?.status || 'available').toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}