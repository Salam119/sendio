'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

import CompanyHeader from '@/components/company/CompanyHeader';
import CompanyServices from '@/components/company/CompanyServices';
import CompanyProjects from '@/components/company/CompanyProjects';
import CompanyAbout from '@/components/company/CompanyAbout';
import CompanyInfo from '@/components/company/CompanyInfo';
import CompanySocialLinks from '@/components/company/CompanySocialLinks';
import CompanyStatus from '@/components/company/CompanyStatus';
import CompanyFeatures from '@/components/company/CompanyFeatures';
import CompanyGallery from '@/components/company/CompanyGallery';
import { supabase } from '@/lib/supabase';

type CompanyRow = {
  id: string;
};

function makeSlug(value: string) {
  const cleanValue = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return cleanValue || `company-${Date.now()}`;
}

export default function CompanyDashboardPage() {
  const [checkingCompany, setCheckingCompany] = useState(true);
  const [companyExists, setCompanyExists] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function checkCompany() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setCheckingCompany(false);
        setCompanyExists(false);
        return;
      }

      const { data, error } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Company lookup error:', error.message);
      }

      setCompanyExists(Boolean(data as CompanyRow | null));
      setCheckingCompany(false);
    }

    void checkCompany();
  }, []);

  async function handleCreateCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert('Please sign in again.');
      setCreating(false);
      return;
    }

    const formData = new FormData(event.currentTarget);

    const name = String(formData.get('name') || '').trim();
    const city = String(formData.get('city') || '').trim();
    const category = String(formData.get('category') || '').trim();

    if (!name) {
      alert('Company name is required.');
      setCreating(false);
      return;
    }

    const baseSlug = makeSlug(name);
    const slug = `${baseSlug}-${Date.now()}`;

    const { error } = await supabase.from('companies').insert([
      {
        user_id: user.id,
        name,
        slug,
        city: city || null,
        category: category || null,
        email: user.email || null,
        status: 'available',
      },
    ]);

    if (error) {
      alert(error.message);
      setCreating(false);
      return;
    }

    setCompanyExists(true);
    setCreating(false);
  }

  if (checkingCompany) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-bold text-[var(--sendio-muted)]">
          Checking company profile...
        </p>
      </div>
    );
  }

  if (!companyExists) {
    return (
      <div className="mx-auto max-w-3xl">
        <section className="rounded-[28px] border border-[var(--sendio-border)] bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--sendio-muted)]">
              Company setup
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--sendio-text)] md:text-3xl">
              Create Company Profile
            </h1>

            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--sendio-muted)]">
              Your account is registered as a company, but no company profile
              has been created yet. Create it now to start managing your public
              Sendio profile.
            </p>
          </div>

          <form onSubmit={handleCreateCompany} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-black text-[var(--sendio-muted)]">
                Company name
              </span>

              <input
                name="name"
                type="text"
                placeholder="Company name"
                className="w-full rounded-full border border-[var(--sendio-border)] bg-white px-5 py-3 text-sm font-bold text-[var(--sendio-text)] outline-none transition focus:border-[var(--sendio-accent)] focus:ring-4 focus:ring-sky-100"
                required
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-black text-[var(--sendio-muted)]">
                  City
                </span>

                <input
                  name="city"
                  type="text"
                  placeholder="City"
                  className="w-full rounded-full border border-[var(--sendio-border)] bg-white px-5 py-3 text-sm font-bold text-[var(--sendio-text)] outline-none transition focus:border-[var(--sendio-accent)] focus:ring-4 focus:ring-sky-100"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-black text-[var(--sendio-muted)]">
                  Category
                </span>

                <input
                  name="category"
                  type="text"
                  placeholder="Cleaning, transport, repair..."
                  className="w-full rounded-full border border-[var(--sendio-border)] bg-white px-5 py-3 text-sm font-bold text-[var(--sendio-text)] outline-none transition focus:border-[var(--sendio-accent)] focus:ring-4 focus:ring-sky-100"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={creating}
                className="rounded-full bg-[var(--sendio-accent)] px-6 py-3 text-sm font-black text-[var(--sendio-accent-text)] shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? 'Creating...' : 'Create Company Profile'}
              </button>

              <Link
                href="/"
                className="rounded-full border border-[var(--sendio-border)] bg-white px-6 py-3 text-sm font-black text-[var(--sendio-text)] transition hover:bg-[var(--sendio-soft-hover)]"
              >
                Back to Home
              </Link>
            </div>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CompanyHeader />

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <CompanyInfo />
        <CompanyStatus />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <CompanyAbout />

        <section className="rounded-[22px] border border-[var(--sendio-border)] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
                Public profile tools
              </p>

              <h2 className="mt-1 text-base font-black text-[var(--sendio-text)]">
                Showcase, location & branches
              </h2>
            </div>

            <span className="rounded-full bg-[var(--sendio-soft)] px-3 py-1 text-[11px] font-black text-[var(--sendio-text)]">
              Public
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            <Link
              href="/dashboard/company/showcase"
              className="group rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-3 text-[var(--sendio-text)] transition hover:bg-[var(--sendio-soft-hover)]"
            >
              <p className="text-xs font-black">Showcase</p>
              <p className="mt-1 text-[11px] font-semibold leading-5 text-[var(--sendio-muted)]">
                Products, achievements, offers, and profile highlights.
              </p>
              <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-black">
                Open
              </span>
            </Link>

            <Link
              href="/dashboard/company/location"
              className="group rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-3 text-[var(--sendio-text)] transition hover:bg-[var(--sendio-soft-hover)]"
            >
              <p className="text-xs font-black">Location</p>
              <p className="mt-1 text-[11px] font-semibold leading-5 text-[var(--sendio-muted)]">
                Address and Google Maps directions for clients.
              </p>
              <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-black">
                Open
              </span>
            </Link>

            <Link
              href="/dashboard/company/branches"
              className="group rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-3 text-[var(--sendio-text)] transition hover:bg-[var(--sendio-soft-hover)]"
            >
              <p className="text-xs font-black">Branches</p>
              <p className="mt-1 text-[11px] font-semibold leading-5 text-[var(--sendio-muted)]">
                Branches and partner company links.
              </p>
              <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-black">
                Open
              </span>
            </Link>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <CompanyServices />
        <CompanyProjects />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <CompanyFeatures />
        <CompanySocialLinks />
      </div>

      <CompanyGallery />
    </div>
  );
}