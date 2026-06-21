'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type AdminProfile = {
  full_name: string | null;
  user_type: string | null;
  role: string | null;
};

type RecentCompany = {
  id: string;
  name: string;
  slug: string | null;
  category: string | null;
  city: string | null;
  created_at: string | null;
};

type RecentWorker = {
  id: string;
  name: string;
  slug: string | null;
  profession: string | null;
  city: string | null;
  status: string | null;
  created_at: string | null;
};

type AdCompany = {
  id: string;
  name: string;
  slug: string | null;
};

type RecentAd = {
  id: string;
  company_id: string | null;
  title: string;
  active: boolean | null;
  created_at: string | null;
  company: AdCompany | AdCompany[] | null;
};

type DashboardStats = {
  clients: number | null;
  workers: number | null;
  companies: number | null;
  ads: number | null;
  activeAds: number | null;
  companyMessages: number | null;
  workerRequests: number | null;
  companyReviews: number | null;
  workerReviews: number | null;
};

function formatCount(value: number | null) {
  if (value === null) return '—';
  return value.toLocaleString();
}

function formatDate(value: string | null) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getCompanyProfileHref(company: { id: string; slug: string | null }) {
  const identifier = company.slug?.trim() || company.id;
  return `/companies/${encodeURIComponent(identifier)}`;
}

function getWorkerProfileHref(worker: { id: string; slug: string | null }) {
  const identifier = worker.slug?.trim() || worker.id;
  return `/workers/${encodeURIComponent(identifier)}`;
}

function getAdCompany(ad: RecentAd) {
  if (Array.isArray(ad.company)) {
    return ad.company[0] ?? null;
  }

  return ad.company ?? null;
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    clients: null,
    workers: null,
    companies: null,
    ads: null,
    activeAds: null,
    companyMessages: null,
    workerRequests: null,
    companyReviews: null,
    workerReviews: null,
  });

  const [recentCompanies, setRecentCompanies] = useState<RecentCompany[]>([]);
  const [recentWorkers, setRecentWorkers] = useState<RecentWorker[]>([]);
  const [recentAds, setRecentAds] = useState<RecentAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAdminDashboard() {
      setLoading(true);
      setPageError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, user_type, role')
        .eq('id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      const profile = profileData as AdminProfile | null;

      if (
        profileError ||
        (profile?.role !== 'admin' && profile?.role !== 'super_admin')
      ) {
        router.replace('/');
        return;
      }

      setAdminProfile(profile);

      const [
        clientsResult,
        workersCountResult,
        companiesCountResult,
        adsCountResult,
        activeAdsCountResult,
        companyMessagesResult,
        workerRequestsResult,
        companyReviewsResult,
        workerReviewsResult,
        companiesListResult,
        workersListResult,
        adsListResult,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('user_type', 'client'),

        supabase.from('workers').select('id', { count: 'exact', head: true }),

        supabase
          .from('companies')
          .select('id', { count: 'exact', head: true }),

        supabase
          .from('company_ads')
          .select('id', { count: 'exact', head: true }),

        supabase
          .from('company_ads')
          .select('id', { count: 'exact', head: true })
          .eq('active', true),

        supabase
          .from('company_messages')
          .select('id', { count: 'exact', head: true }),

        supabase
          .from('worker_requests')
          .select('id', { count: 'exact', head: true }),

        supabase
          .from('company_reviews')
          .select('id', { count: 'exact', head: true }),

        supabase
          .from('worker_reviews')
          .select('id', { count: 'exact', head: true }),

        supabase
          .from('companies')
          .select('id, name, slug, category, city, created_at')
          .order('created_at', { ascending: false })
          .limit(6),

        supabase
          .from('workers')
          .select('id, name, slug, profession, city, status, created_at')
          .order('created_at', { ascending: false })
          .limit(6),

        supabase
          .from('company_ads')
          .select(`
            id,
            company_id,
            title,
            active,
            created_at,
            company:companies!company_ads_company_id_fkey (
              id,
              name,
              slug
            )
          `)
          .order('created_at', { ascending: false })
          .limit(6),
      ]);

      if (!isMounted) return;

      setStats({
        clients: clientsResult.error ? null : clientsResult.count ?? 0,
        workers: workersCountResult.error
          ? null
          : workersCountResult.count ?? 0,
        companies: companiesCountResult.error
          ? null
          : companiesCountResult.count ?? 0,
        ads: adsCountResult.error ? null : adsCountResult.count ?? 0,
        activeAds: activeAdsCountResult.error
          ? null
          : activeAdsCountResult.count ?? 0,
        companyMessages: companyMessagesResult.error
          ? null
          : companyMessagesResult.count ?? 0,
        workerRequests: workerRequestsResult.error
          ? null
          : workerRequestsResult.count ?? 0,
        companyReviews: companyReviewsResult.error
          ? null
          : companyReviewsResult.count ?? 0,
        workerReviews: workerReviewsResult.error
          ? null
          : workerReviewsResult.count ?? 0,
      });

      if (companiesListResult.data) {
        setRecentCompanies(companiesListResult.data as RecentCompany[]);
      }

      if (workersListResult.data) {
        setRecentWorkers(workersListResult.data as RecentWorker[]);
      }

      if (adsListResult.data) {
        setRecentAds(adsListResult.data as unknown as RecentAd[]);
      }

      if (
        clientsResult.error ||
        workersCountResult.error ||
        companiesCountResult.error ||
        adsCountResult.error ||
        activeAdsCountResult.error ||
        companyMessagesResult.error ||
        workerRequestsResult.error ||
        companyReviewsResult.error ||
        workerReviewsResult.error ||
        companiesListResult.error ||
        workersListResult.error ||
        adsListResult.error
      ) {
        setPageError(
          'Some admin data could not be loaded. Check RLS policies if anything is missing.'
        );
      }

      setLoading(false);
    }

    loadAdminDashboard();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const totalReviews =
    stats.companyReviews === null && stats.workerReviews === null
      ? null
      : (stats.companyReviews ?? 0) + (stats.workerReviews ?? 0);

  if (loading) {
    return (
      <div className="rounded-3xl border border-[#e2d3bf] bg-white p-8 text-center shadow-sm">
        <p className="font-bold text-[#4f3b25]">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#e2d3bf] bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8b5a2b]">
              Sendio Control Center
            </p>

            <h2 className="mt-2 text-3xl font-black text-[#0b5b2f]">
              Welcome, {adminProfile?.full_name || 'Admin'}
            </h2>

            <p className="mt-2 text-sm font-semibold text-[#6e5e4a]">
              Platform overview for companies, workers, clients, ads, and
              activity.
            </p>
          </div>

          <div className="rounded-full bg-[#f1e6d8] px-4 py-2 text-sm font-black text-[#0b5b2f]">
            Role: {adminProfile?.role}
          </div>
        </div>

        {pageError ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            {pageError}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-[#e2d3bf] bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-[#8b5a2b]">Companies</p>
          <strong className="mt-2 block text-3xl font-black text-[#0b5b2f]">
            {formatCount(stats.companies)}
          </strong>
        </div>

        <div className="rounded-3xl border border-[#e2d3bf] bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-[#8b5a2b]">Workers</p>
          <strong className="mt-2 block text-3xl font-black text-[#0b5b2f]">
            {formatCount(stats.workers)}
          </strong>
        </div>

        <div className="rounded-3xl border border-[#e2d3bf] bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-[#8b5a2b]">Clients</p>
          <strong className="mt-2 block text-3xl font-black text-[#0b5b2f]">
            {formatCount(stats.clients)}
          </strong>
        </div>

        <div className="rounded-3xl border border-[#e2d3bf] bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-[#8b5a2b]">Total Reviews</p>
          <strong className="mt-2 block text-3xl font-black text-[#0b5b2f]">
            {formatCount(totalReviews)}
          </strong>
        </div>

        <div className="rounded-3xl border border-[#e2d3bf] bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-[#8b5a2b]">Total Ads</p>
          <strong className="mt-2 block text-3xl font-black text-[#0b5b2f]">
            {formatCount(stats.ads)}
          </strong>
        </div>

        <div className="rounded-3xl border border-[#e2d3bf] bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-[#8b5a2b]">Active Ads</p>
          <strong className="mt-2 block text-3xl font-black text-[#0b5b2f]">
            {formatCount(stats.activeAds)}
          </strong>
        </div>

        <div className="rounded-3xl border border-[#e2d3bf] bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-[#8b5a2b]">Company Messages</p>
          <strong className="mt-2 block text-3xl font-black text-[#0b5b2f]">
            {formatCount(stats.companyMessages)}
          </strong>
        </div>

        <div className="rounded-3xl border border-[#e2d3bf] bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-[#8b5a2b]">Worker Requests</p>
          <strong className="mt-2 block text-3xl font-black text-[#0b5b2f]">
            {formatCount(stats.workerRequests)}
          </strong>
        </div>
      </section>

      <section className="rounded-3xl border border-[#e2d3bf] bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h3 className="text-lg font-black text-[#0b5b2f]">
              Admin Controls
            </h3>

            <p className="mt-1 text-sm font-semibold text-[#6e5e4a]">
              Open dedicated control pages for platform management.
            </p>
          </div>

          <Link
            href="/dashboard/admin/ads"
            className="inline-flex items-center justify-center rounded-full bg-[#0b5b2f] px-6 py-3 text-sm font-black text-white shadow-sm hover:bg-[#084625]"
          >
            Ads Control
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#e2d3bf] bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-black text-[#0b5b2f]">
            Recent Companies
          </h3>

          <div className="space-y-3">
            {recentCompanies.map((company) => (
              <div
                key={company.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#eadcc9] bg-[#fbf8f3] p-4"
              >
                <div>
                  <p className="font-black text-[#173321]">{company.name}</p>
                  <p className="text-xs font-semibold text-[#8b5a2b]">
                    {company.category || company.city || 'No category yet'} •{' '}
                    {formatDate(company.created_at)}
                  </p>
                </div>

                <Link
                  href={getCompanyProfileHref(company)}
                  className="rounded-full bg-[#0b5b2f] px-3 py-2 text-xs font-black text-white hover:bg-[#084625]"
                >
                  Open
                </Link>
              </div>
            ))}

            {recentCompanies.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#eadcc9] p-4 text-sm font-semibold text-[#8b5a2b]">
                No companies yet.
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-3xl border border-[#e2d3bf] bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-black text-[#0b5b2f]">
            Recent Workers
          </h3>

          <div className="space-y-3">
            {recentWorkers.map((worker) => (
              <div
                key={worker.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#eadcc9] bg-[#fbf8f3] p-4"
              >
                <div>
                  <p className="font-black text-[#173321]">{worker.name}</p>
                  <p className="text-xs font-semibold text-[#8b5a2b]">
                    {worker.profession || worker.city || 'No profession yet'} •{' '}
                    {worker.status || 'unknown'} •{' '}
                    {formatDate(worker.created_at)}
                  </p>
                </div>

                <Link
                  href={getWorkerProfileHref(worker)}
                  className="rounded-full bg-[#0b5b2f] px-3 py-2 text-xs font-black text-white hover:bg-[#084625]"
                >
                  Open
                </Link>
              </div>
            ))}

            {recentWorkers.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#eadcc9] p-4 text-sm font-semibold text-[#8b5a2b]">
                No workers yet.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[#e2d3bf] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <h3 className="text-lg font-black text-[#0b5b2f]">Recent Ads</h3>

          <Link
            href="/dashboard/admin/ads"
            className="rounded-full bg-[#0b5b2f] px-4 py-2 text-center text-xs font-black text-white hover:bg-[#084625]"
          >
            Manage All Ads
          </Link>
        </div>

        <div className="space-y-3">
          {recentAds.map((ad) => {
            const company = getAdCompany(ad);

            return (
              <div
                key={ad.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-[#eadcc9] bg-[#fbf8f3] p-4 md:flex-row md:items-center"
              >
                <div>
                  <p className="font-black text-[#173321]">{ad.title}</p>
                  <p className="text-xs font-semibold text-[#8b5a2b]">
                    {company?.name || 'Company not linked'} •{' '}
                    {ad.active ? 'Active' : 'Inactive'} •{' '}
                    {formatDate(ad.created_at)}
                  </p>
                </div>

                {company ? (
                  <Link
                    href={getCompanyProfileHref(company)}
                    className="rounded-full bg-[#0b5b2f] px-3 py-2 text-center text-xs font-black text-white hover:bg-[#084625]"
                  >
                    Open Company
                  </Link>
                ) : null}
              </div>
            );
          })}

          {recentAds.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#eadcc9] p-4 text-sm font-semibold text-[#8b5a2b]">
              No ads yet.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}