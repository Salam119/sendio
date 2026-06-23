'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type CompanyInfo = {
  id: string;
  name: string;
  slug: string | null;
};

type AdminAd = {
  id: string;
  company_id: string | null;
  title: string;
  description: string | null;
  ad_slot: string | null;
  media_type: string | null;
  image_url: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  cta_text: string | null;
  target_url: string | null;
  active: boolean | null;
  status: string | null;
  payment_status: string | null;
  starts_at: string | null;
  ends_at: string | null;
  views: number | null;
  clicks: number | null;
  created_at: string | null;
  paid_at: string | null;
  paused_at: string | null;
  plan_days: number | null;
  price_cents: number | null;
  currency: string | null;
  payment_provider: string | null;
  payment_reference: string | null;
  payment_error: string | null;
  companies: CompanyInfo | null;
};

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

function getCompanyHref(company: CompanyInfo | null) {
  if (!company) return '/';

  const identifier = company.slug?.trim() || company.id;

  return `/companies/${encodeURIComponent(identifier)}`;
}

function getSlotLabel(slot: string | null) {
  if (!slot) return 'Homepage Slider Only';
  if (slot === 'general') return 'General';
  if (slot === 'household') return 'Household';
  if (slot === 'gardening') return 'Gardening';
  if (slot === 'logistics') return 'Logistics';

  return slot;
}

function getStatusClass(status: string | null) {
  if (status === 'active') return 'bg-green-100 text-green-800';
  if (status === 'paused') return 'bg-slate-100 text-slate-800';
  if (status === 'rejected') return 'bg-red-100 text-red-800';
  if (status === 'expired') return 'bg-zinc-100 text-zinc-700';
  if (status === 'payment_pending') return 'bg-amber-100 text-amber-800';

  return 'bg-[#f1e6d8] text-[#8b5a2b]';
}

function getPaymentClass(paymentStatus: string | null) {
  if (paymentStatus === 'paid') return 'bg-green-100 text-green-800';
  if (paymentStatus === 'pending') return 'bg-amber-100 text-amber-800';
  if (paymentStatus === 'failed') return 'bg-red-100 text-red-800';
  if (paymentStatus === 'refunded') return 'bg-slate-100 text-slate-800';

  return 'bg-[#f1e6d8] text-[#8b5a2b]';
}

function getPriceDisplay(priceCents: number | null, currency: string | null) {
  if (!priceCents || priceCents <= 0) return 'Not set yet';

  return `${(priceCents / 100).toFixed(2)} ${currency || 'EUR'}`;
}

function getMediaUrl(ad: AdminAd) {
  return ad.video_url || ad.image_url || ad.thumbnail_url || null;
}

function isVideoAd(ad: AdminAd) {
  return ad.media_type === 'video' || Boolean(ad.video_url);
}

export default function AdminAdsPage() {
  const router = useRouter();

  const [ads, setAds] = useState<AdminAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  async function checkAdminAccess() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace('/login');
      return false;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      setPageError(profileError.message);
      return false;
    }

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      router.replace('/');
      return false;
    }

    return true;
  }

  async function loadAds() {
    setLoading(true);
    setPageError(null);

    const hasAccess = await checkAdminAccess();

    if (!hasAccess) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('company_ads')
      .select(
        `
        id,
        company_id,
        title,
        description,
        ad_slot,
        media_type,
        image_url,
        video_url,
        thumbnail_url,
        cta_text,
        target_url,
        active,
        status,
        payment_status,
        starts_at,
        ends_at,
        views,
        clicks,
        created_at,
        paid_at,
        paused_at,
        plan_days,
        price_cents,
        currency,
        payment_provider,
        payment_reference,
        payment_error,
        companies (
          id,
          name,
          slug
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      setPageError(error.message);
      setLoading(false);
      return;
    }

  setAds(((data ?? []) as unknown) as AdminAd[]);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAds();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateAd(
    adId: string,
    values: Partial<AdminAd>,
    successMessage: string,
    actionName: string
  ) {
    setActionLoadingId(`${actionName}-${adId}`);
    setPageError(null);
    setPageMessage(null);

    const { error } = await supabase
      .from('company_ads')
      .update(values)
      .eq('id', adId);

    if (error) {
      setPageError(error.message);
      setActionLoadingId(null);
      return;
    }

    await loadAds();

    setPageMessage(successMessage);
    setActionLoadingId(null);
  }

  async function handlePauseAd(ad: AdminAd) {
    const confirmed = window.confirm(
      `Pause this ad?\n\n${ad.title}\n\nIt will stop appearing on the homepage.`
    );

    if (!confirmed) return;

    await updateAd(
      ad.id,
      {
        active: false,
        status: 'paused',
        paused_at: new Date().toISOString(),
      },
      'Ad paused successfully.',
      'pause'
    );
  }

  async function handleReactivateAd(ad: AdminAd) {
    const confirmed = window.confirm(
      `Reactivate this ad?\n\n${ad.title}\n\nIt will appear again only if payment and dates are still valid.`
    );

    if (!confirmed) return;

    await updateAd(
      ad.id,
      {
        active: true,
        status: 'active',
        paused_at: null,
        payment_error: null,
      },
      ad.status === 'rejected'
        ? 'Rejected ad restored successfully.'
        : 'Ad reactivated successfully.',
      'reactivate'
    );
  }

  async function handleRejectAd(ad: AdminAd) {
    const confirmed = window.confirm(
      `Reject this ad?\n\n${ad.title}\n\nIt will be removed from public display.`
    );

    if (!confirmed) return;

    await updateAd(
      ad.id,
      {
        active: false,
        status: 'rejected',
        paused_at: new Date().toISOString(),
      },
      'Ad rejected successfully.',
      'reject'
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f3ef] p-6 text-[#173321]">
        <div className="mx-auto max-w-7xl rounded-3xl border border-[#e2d3bf] bg-white p-8 text-center shadow-sm">
          <p className="font-bold text-[#4f3b25]">Loading ads...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f3ef] p-6 text-[#173321]">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-[#e2d3bf] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8b5a2b]">
                Admin Dashboard
              </p>

              <h1 className="mt-2 text-3xl font-black text-[#0b5b2f]">
                Ads Control
              </h1>

              <p className="mt-2 text-sm font-semibold text-[#6e5e4a]">
                Monitor all paid ads and pause, reactivate, restore, or reject
                ads when needed.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-full border border-[#d8c3a5] bg-white px-4 py-2 text-sm font-black text-[#173321] hover:bg-[#fbf8f3]"
              >
                Open Homepage
              </Link>

              <Link
                href="/dashboard/admin"
                className="rounded-full bg-[#0b5b2f] px-4 py-2 text-sm font-black text-white hover:bg-[#084625]"
              >
                Admin Dashboard
              </Link>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
            Admin control does not replace automatic publishing. Paid ads still
            go live automatically. Admin actions are only for monitoring,
            pausing, restoring, or rejecting ads when needed.
          </div>

          {pageError ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {pageError}
            </div>
          ) : null}

          {pageMessage ? (
            <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700">
              {pageMessage}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-[#e2d3bf] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-black text-[#0b5b2f]">All Ads</h2>
              <p className="mt-1 text-sm font-semibold text-[#6e5e4a]">
                Total ads: {ads.length}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {ads.map((ad) => {
              const mediaUrl = getMediaUrl(ad);
              const video = isVideoAd(ad);
              const actionDisabled = actionLoadingId?.endsWith(ad.id) || false;

              return (
                <article
                  key={ad.id}
                  className="rounded-3xl border border-[#eadcc9] bg-[#fbf8f3] p-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row">
                    <div className="h-[120px] w-[150px] max-w-full shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b5b2f] to-[#c49a6c]">
                      {mediaUrl && video ? (
                        <video
                          src={mediaUrl}
                          controls
                          muted
                          playsInline
                          className="h-full w-full bg-black object-contain"
                        />
                      ) : null}

                      {mediaUrl && !video ? (
                        <Image
                          src={mediaUrl}
                          alt={`${ad.title} advertisement`}
                          width={150}
                          height={120}
                          className="h-full w-full object-cover"
                          sizes="150px"
                        />
                      ) : null}

                      {!mediaUrl ? (
                        <div className="flex h-full w-full items-center justify-center text-4xl font-black text-white">
                          {ad.title.charAt(0).toUpperCase()}
                        </div>
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-start">
                        <div>
                          <h3 className="text-lg font-black text-[#173321]">
                            {ad.title}
                          </h3>

                          <p className="mt-1 text-sm font-bold text-[#6e5e4a]">
                            Company:{' '}
                            <span className="text-[#0b5b2f]">
                              {ad.companies?.name || 'Unknown company'}
                            </span>
                          </p>

                          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#8b5a2b]">
                            Placement: {getSlotLabel(ad.ad_slot)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
                              ad.status
                            )}`}
                          >
                            {ad.status || 'draft'}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${getPaymentClass(
                              ad.payment_status
                            )}`}
                          >
                            {ad.payment_status || 'unpaid'}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              ad.active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-zinc-100 text-zinc-700'
                            }`}
                          >
                            {ad.active ? 'active=true' : 'active=false'}
                          </span>
                        </div>
                      </div>

                      {ad.description ? (
                        <p className="mt-3 text-sm font-semibold text-[#6e5e4a]">
                          {ad.description}
                        </p>
                      ) : null}

                      <div className="mt-4 grid gap-2 text-xs font-bold text-[#6e5e4a] md:grid-cols-3">
                        <p>Media: {ad.media_type || '—'}</p>
                        <p>Plan: {ad.plan_days || 30} days</p>
                        <p>
                          Price: {getPriceDisplay(ad.price_cents, ad.currency)}
                        </p>
                        <p>Created: {formatDate(ad.created_at)}</p>
                        <p>Paid: {formatDate(ad.paid_at)}</p>
                        <p>Paused: {formatDate(ad.paused_at)}</p>
                        <p>Starts: {formatDate(ad.starts_at)}</p>
                        <p>Ends: {formatDate(ad.ends_at)}</p>
                        <p>Provider: {ad.payment_provider || '—'}</p>
                        <p>Views: {ad.views ?? 0}</p>
                        <p>Clicks: {ad.clicks ?? 0}</p>
                        <p>CTA: {ad.cta_text || 'View Company'}</p>
                      </div>

                      {ad.payment_reference ? (
                        <p className="mt-3 break-all rounded-2xl border border-[#eadcc9] bg-white px-3 py-2 text-xs font-bold text-[#6e5e4a]">
                          Payment Reference: {ad.payment_reference}
                        </p>
                      ) : null}

                      {ad.payment_error ? (
                        <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                          Payment Error: {ad.payment_error}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                          href={getCompanyHref(ad.companies)}
                          className="rounded-full border border-[#d8c3a5] bg-white px-4 py-2 text-xs font-black text-[#173321] hover:bg-[#fbf8f3]"
                        >
                          Open Company
                        </Link>

                        <Link
                          href="/"
                          className="rounded-full border border-[#d8c3a5] bg-white px-4 py-2 text-xs font-black text-[#173321] hover:bg-[#fbf8f3]"
                        >
                          Open Homepage
                        </Link>

                        {mediaUrl ? (
                          <a
                            href={mediaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-[#d8c3a5] bg-white px-4 py-2 text-xs font-black text-[#173321] hover:bg-[#fbf8f3]"
                          >
                            Open Media
                          </a>
                        ) : null}

                        {ad.status === 'active' && ad.active ? (
                          <button
                            type="button"
                            disabled={actionDisabled}
                            onClick={() => handlePauseAd(ad)}
                            className="rounded-full bg-slate-700 px-4 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Pause Ad
                          </button>
                        ) : null}

                        {ad.status !== 'active' ? (
                          <button
                            type="button"
                            disabled={actionDisabled}
                            onClick={() => handleReactivateAd(ad)}
                            className="rounded-full bg-[#0b5b2f] px-4 py-2 text-xs font-black text-white hover:bg-[#084625] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {ad.status === 'rejected'
                              ? 'Restore Rejected Ad'
                              : 'Reactivate Ad'}
                          </button>
                        ) : null}

                        {ad.status !== 'rejected' ? (
                          <button
                            type="button"
                            disabled={actionDisabled}
                            onClick={() => handleRejectAd(ad)}
                            className="rounded-full bg-red-600 px-4 py-2 text-xs font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Reject Ad
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}

            {ads.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#d8c3a5] bg-[#fbf8f3] p-8 text-center">
                <h3 className="text-lg font-black text-[#0b5b2f]">
                  No ads found
                </h3>

                <p className="mt-2 text-sm font-semibold text-[#6e5e4a]">
                  Company ads will appear here after companies create them.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
