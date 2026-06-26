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
    <div className="space-y-6">
      <CompanyHeader />
      <CompanyInfo />
      <CompanyStatus />
      <CompanyAbout />

      <section className="rounded-[22px] border border-blue-100 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-600">
            Public Profile Tools
          </p>
          <h2 className="mt-2 inline-flex min-h-[34px] items-center rounded-[22px] border border-blue-100 bg-[#eef6ff] px-4 py-2 text-sm font-black text-gray-900">
            Showcase & Location
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-gray-600">
            Manage the public sections that appear inside your company profile.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/dashboard/company/showcase"
            className="group rounded-[22px] border border-blue-100 bg-[#eef6ff] p-5 text-gray-900 transition hover:bg-[#e3efff]"
          >
            <div className="mb-3 inline-flex rounded-[22px] border border-green-200 bg-green-100 px-4 py-2 text-xs font-black text-green-800">
              Company Showcase
            </div>

            <h3 className="text-lg font-black">Internal profile highlight</h3>
            <p className="mt-2 text-sm font-bold leading-6 text-gray-600">
              Add a new product, achievement, project, opportunity, service, or offer.
            </p>

            <span className="mt-4 inline-flex h-9 items-center rounded-[18px] border border-blue-100 bg-white px-4 text-sm font-black transition group-hover:bg-[#eef6ff]">
              Open Showcase
            </span>
          </Link>

          <Link
            href="/dashboard/company/location"
            className="group rounded-[22px] border border-blue-100 bg-[#eef6ff] p-5 text-gray-900 transition hover:bg-[#e3efff]"
          >
            <div className="mb-3 inline-flex rounded-[22px] border border-blue-100 bg-white px-4 py-2 text-xs font-black text-gray-900">
              Location & Directions
            </div>

            <h3 className="text-lg font-black">Help clients reach you</h3>
            <p className="mt-2 text-sm font-bold leading-6 text-gray-600">
              Add your company address so clients can open Google Maps directions.
            </p>

            <span className="mt-4 inline-flex h-9 items-center rounded-[18px] border border-blue-100 bg-white px-4 text-sm font-black transition group-hover:bg-[#eef6ff]">
              Open Location
            </span>
          </Link>

          <Link
            href="/dashboard/company/branches"
            className="group rounded-[22px] border border-blue-100 bg-[#eef6ff] p-5 text-gray-900 transition hover:bg-[#e3efff]"
          >
            <div className="mb-3 inline-flex rounded-[22px] border border-blue-100 bg-white px-4 py-2 text-xs font-black text-gray-900">
              Branches & Partners
            </div>

            <h3 className="text-lg font-black">Branches & Partners</h3>
            <p className="mt-2 text-sm font-bold leading-6 text-gray-600">
              Manage company branches and partner company links.
            </p>

            <span className="mt-4 inline-flex h-9 items-center rounded-[18px] border border-blue-100 bg-white px-4 text-sm font-black transition group-hover:bg-[#eef6ff]">
              Open Branches
            </span>
          </Link>
        </div>
      </section>

      <CompanyServices />
      <CompanyProjects />
      <CompanyFeatures />
      <CompanySocialLinks />
      <CompanyGallery />
    </div>
  );
}
