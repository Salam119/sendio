'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCompanyId } from '@/lib/getCompanyId';

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
        .select(
          'name, category, city, address, status, logo, phone, email, rating, reviews_count'
        )
        .eq('id', companyId)
        .single();

      if (!isMounted) return;

      if (error) {
        alert(error.message);
        return;
      }

      setCompany(data as Company);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  async function reloadCompany(companyId: string) {
    const { data, error } = await supabase
      .from('companies')
      .select(
        'name, category, city, address, status, logo, phone, email, rating, reviews_count'
      )
      .eq('id', companyId)
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setCompany(data as Company);
  }

  async function uploadLogo(file: File) {
    setLoading(true);

    const companyId = await getCompanyId();

    if (!companyId) {
      alert('Company not found for this user.');
      setLoading(false);
      return;
    }

    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${companyId}/logo/${fileName}`;

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
        logo: publicUrl,
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

  const phoneNumber = cleanPhone(company?.phone ?? null);
  const rating = Number(company?.rating || 0).toFixed(1);
  const reviewsCount = company?.reviews_count || 0;
  const status = company?.status || 'available';

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
                className="object-cover"
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
                  status
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

        <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[var(--sendio-accent)] px-4 py-2 text-xs font-black text-[var(--sendio-accent-text)] shadow-sm transition hover:opacity-90">
          {loading ? 'Uploading...' : 'Upload Logo'}
          <input
            type="file"
            accept="image/*"
            disabled={loading}
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (file) {
                void uploadLogo(file);
              }
            }}
            className="hidden"
          />
        </label>
      </div>
    </section>
  );
}