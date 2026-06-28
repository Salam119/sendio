'use client';

import Link from 'next/link';

import CompanyHeader from '@/components/company/CompanyHeader';
import CompanyServices from '@/components/company/CompanyServices';
import CompanyProjects from '@/components/company/CompanyProjects';
import CompanyAbout from '@/components/company/CompanyAbout';
import CompanyInfo from '@/components/company/CompanyInfo';
import CompanySocialLinks from '@/components/company/CompanySocialLinks';
import CompanyStatus from '@/components/company/CompanyStatus';
import CompanyFeatures from '@/components/company/CompanyFeatures';
import CompanyGallery from '@/components/company/CompanyGallery';

export default function CompanyDashboardPage() {
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