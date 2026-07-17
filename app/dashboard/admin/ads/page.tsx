'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
  show_home_slider: boolean | null;
  show_home_fixed: boolean | null;
  show_services_page: boolean | null;
  home_fixed_slot: string | null;
  services_slider_level: number | null;

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
  created_at: string | null;
  paid_at: string | null;
  paused_at: string | null;

  reviewed_at: string | null;
  approved_at: string | null;
  rejected_reason: string | null;

  views: number | null;
  clicks: number | null;
  plan_days: number | null;

  archived_by_admin: boolean | null;
  archived_by_company: boolean | null;

  companies: CompanyInfo | null;
};

type RawAdminAd = Omit<AdminAd, 'companies'> & {
  companies: CompanyInfo | CompanyInfo[] | null;
};

type StatusFilter =
  | 'all'
  | 'pending'
  | 'published'
  | 'paused'
  | 'rejected'
  | 'draft';

type AdminConfirmAction =
  | 'reject'
  | 'pause'
  | 'resume'
  | 'archive'
  | 'restore'
  | 'delete';

function normalizeCompany(
  company: CompanyInfo | CompanyInfo[] | null
) {
  if (Array.isArray(company)) {
    return company[0] ?? null;
  }

  return company;
}

function formatDate(value: string | null) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getCompanyHref(company: CompanyInfo | null) {
  if (!company) {
    return '/';
  }

  const identifier =
    company.slug?.trim() || company.id;

  return `/companies/${encodeURIComponent(
    identifier
  )}`;
}

function getMediaUrl(ad: AdminAd) {
  return (
    ad.video_url ||
    ad.image_url ||
    ad.thumbnail_url ||
    null
  );
}

function isVideoAd(ad: AdminAd) {
  return (
    ad.media_type === 'video' ||
    Boolean(ad.video_url)
  );
}

function getPlacementLabel(ad: AdminAd) {
  if (ad.show_home_slider) {
    return 'Homepage Slider';
  }

  if (ad.show_home_fixed) {
    const slot =
      ad.home_fixed_slot || ad.ad_slot || 'general';

    if (slot === 'general') {
      return 'Homepage Card — General';
    }

    if (slot === 'household') {
      return 'Homepage Card — Household';
    }

    if (slot === 'gardening') {
      return 'Homepage Card — Gardening';
    }

    if (slot === 'logistics') {
      return 'Homepage Card — Logistics';
    }

    return `Homepage Card — ${slot}`;
  }

  if (ad.show_services_page) {
    return `Services Slider — Level ${
      ad.services_slider_level || 1
    }`;
  }

  if (ad.ad_slot) {
    return `Homepage Card — ${ad.ad_slot}`;
  }

  return 'Homepage Slider';
}

function getStatusLabel(status: string | null) {
  if (status === 'pending_review') {
    return 'Waiting for review';
  }

  if (status === 'under_review') {
    return 'Under review';
  }

  if (status === 'approved') {
    return 'Approved';
  }

  if (status === 'active') {
    return 'Published';
  }

  if (status === 'paused') {
    return 'Paused';
  }

  if (status === 'rejected') {
    return 'Rejected';
  }

  if (status === 'expired') {
    return 'Expired';
  }

  if (status === 'payment_pending') {
    return 'Payment pending';
  }

  return 'Draft';
}

function getStatusClass(status: string | null) {
  if (status === 'active') {
    return 'border-green-200 bg-green-100 text-green-800';
  }

  if (status === 'pending_review') {
    return 'border-amber-200 bg-amber-100 text-amber-800';
  }

  if (status === 'under_review') {
    return 'border-sky-200 bg-sky-100 text-sky-800';
  }

  if (status === 'approved') {
    return 'border-emerald-200 bg-emerald-100 text-emerald-800';
  }

  if (status === 'paused') {
    return 'border-slate-200 bg-slate-100 text-slate-800';
  }

  if (status === 'rejected') {
    return 'border-red-200 bg-red-100 text-red-800';
  }

  if (status === 'expired') {
    return 'border-zinc-200 bg-zinc-100 text-zinc-700';
  }

  return 'border-[#eadcc9] bg-[#f1e6d8] text-[#8b5a2b]';
}

function calculateCtr(views: number, clicks: number) {
  if (views <= 0) {
    return '0.00%';
  }

  return `${((clicks / views) * 100).toFixed(
    2
  )}%`;
}

function matchesStatusFilter(
  ad: AdminAd,
  statusFilter: StatusFilter
) {
  if (statusFilter === 'all') {
    return true;
  }

  if (statusFilter === 'pending') {
    return (
      ad.status === 'pending_review' ||
      ad.status === 'under_review' ||
      ad.status === 'approved'
    );
  }

  if (statusFilter === 'published') {
    return ad.status === 'active';
  }

  if (statusFilter === 'paused') {
    return ad.status === 'paused';
  }

  if (statusFilter === 'rejected') {
    return ad.status === 'rejected';
  }

  return (
    ad.status === 'draft' ||
    ad.status === 'payment_pending'
  );
}

function AdPreview({
  ad,
}: {
  ad: AdminAd;
}) {
  const mediaUrl = getMediaUrl(ad);
  const video = isVideoAd(ad);

  const firstLetter =
    ad.title.trim().charAt(0).toUpperCase() || 'S';

  return (
    <div>
      <div className="relative flex h-[162px] w-[220px] max-w-full flex-col items-center justify-end overflow-hidden rounded-[22px] border-2 border-[#0b5b2f] bg-white p-3 text-center shadow-sm">
        {mediaUrl && video ? (
          <video
            src={mediaUrl}
            muted
            playsInline
            autoPlay
            loop
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}

        {mediaUrl && !video ? (
          <Image
            src={mediaUrl}
            alt={`${ad.title} advertisement`}
            fill
            unoptimized
            className="object-cover"
            sizes="220px"
          />
        ) : null}

        {!mediaUrl ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0b5b2f] to-[#45cfe7] text-5xl font-black text-white">
            {firstLetter}
          </div>
        ) : null}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/5" />

        <div className="relative z-10 w-full text-white">
          <p
            className="overflow-hidden text-sm font-black"
            style={{
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 1,
            }}
          >
            {ad.title}
          </p>

          {ad.description ? (
            <p
              className="mt-1 overflow-hidden text-[10px] font-semibold text-white/90"
              style={{
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
              }}
            >
              {ad.description}
            </p>
          ) : null}

          <div className="mt-2 inline-flex rounded-full bg-white/95 px-3 py-1 text-[10px] font-black text-[#0b5b2f]">
            {ad.cta_text || 'View Company'}
          </div>
        </div>
      </div>

      <p className="mt-2 w-[220px] max-w-full text-center text-[11px] font-bold text-[#8b5a2b]">
        {getPlacementLabel(ad)}
      </p>
    </div>
  );
}

export default function AdminAdsPage() {
  const router = useRouter();

  const [ads, setAds] = useState<AdminAd[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentRole, setCurrentRole] =
    useState<string | null>(null);

  const [openAdId, setOpenAdId] =
    useState<string | null>(null);

  const [previewAd, setPreviewAd] =
    useState<AdminAd | null>(null);

  const [showArchived, setShowArchived] =
    useState(false);

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('all');

  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  const [confirmApproveAdId, setConfirmApproveAdId] =
    useState<string | null>(null);

  const [confirmAdminAction, setConfirmAdminAction] =
    useState<{
      adId: string;
      action: AdminConfirmAction;
    } | null>(null);

  const [rejectReason, setRejectReason] =
    useState('');

  const [pageError, setPageError] =
    useState<string | null>(null);

  const [pageMessage, setPageMessage] =
    useState<string | null>(null);

  const visibleAds = useMemo(() => {
    return ads.filter((ad) => {
      const archived =
        ad.archived_by_admin === true;

      if (archived !== showArchived) {
        return false;
      }

      return matchesStatusFilter(
        ad,
        statusFilter
      );
    });
  }, [ads, showArchived, statusFilter]);

  const activeAdsCount = useMemo(() => {
    return ads.filter(
      (ad) =>
        ad.status === 'active' &&
        ad.active === true &&
        ad.archived_by_admin !== true
    ).length;
  }, [ads]);

  const pendingAdsCount = useMemo(() => {
    return ads.filter(
      (ad) =>
        [
          'pending_review',
          'under_review',
          'approved',
        ].includes(ad.status || '') &&
        ad.archived_by_admin !== true
    ).length;
  }, [ads]);

  const archivedAdsCount = useMemo(() => {
    return ads.filter(
      (ad) => ad.archived_by_admin === true
    ).length;
  }, [ads]);

  const totalViews = useMemo(() => {
    return ads.reduce(
      (total, ad) => total + (ad.views ?? 0),
      0
    );
  }, [ads]);

  const totalClicks = useMemo(() => {
    return ads.reduce(
      (total, ad) => total + (ad.clicks ?? 0),
      0
    );
  }, [ads]);

  async function checkAdminAccess() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace('/login');
      return false;
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      setPageError(profileError.message);
      return false;
    }

    if (
      !profile ||
      !['admin', 'super_admin'].includes(
        profile.role
      )
    ) {
      router.replace('/');
      return false;
    }

    setCurrentRole(profile.role);

    return true;
  }

  async function loadAds(showLoader = true) {
    if (showLoader) {
      setLoading(true);
    }

    setPageError(null);

    const hasAccess =
      await checkAdminAccess();

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
          show_home_slider,
          show_home_fixed,
          show_services_page,
          home_fixed_slot,
          services_slider_level,
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
          created_at,
          paid_at,
          paused_at,
          reviewed_at,
          approved_at,
          rejected_reason,
          views,
          clicks,
          plan_days,
          archived_by_admin,
          archived_by_company,
          companies (
            id,
            name,
            slug
          )
        `
      )
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      setPageError(error.message);
      setLoading(false);
      return;
    }

    const rawAds =
      ((data ?? []) as unknown as RawAdminAd[]);

    const normalizedAds: AdminAd[] =
      rawAds.map((ad) => ({
        ...ad,
        companies: normalizeCompany(
          ad.companies
        ),
      }));

    setAds(normalizedAds);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAds();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function writeAuditLog(
    action: string,
    description: string,
    adId: string
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const { error } = await supabase
      .from('admin_audit_logs')
      .insert({
        actor_id: user.id,
        actor_role: currentRole,
        action,
        target_table: 'company_ads',
        target_id: adId,
        description,
      });

    if (error) {
      console.error(
        'Admin audit log error:',
        error.message
      );
    }
  }

  async function refreshAfterAction(
    adId?: string
  ) {
    await loadAds(false);

    if (adId) {
      setOpenAdId(adId);
    }
  }

  async function handleToggleAd(ad: AdminAd) {
    setPageError(null);
    setPageMessage(null);
    setConfirmApproveAdId(null);
    setConfirmAdminAction(null);
    setRejectReason('');

    if (openAdId === ad.id) {
      setOpenAdId(null);
      return;
    }

    setOpenAdId(ad.id);

    if (ad.status !== 'pending_review') {
      return;
    }

    setActionLoading(`open-${ad.id}`);

    const { error } = await supabase.rpc(
      'open_company_ad_for_review',
      {
        p_ad_id: ad.id,
      }
    );

    if (error) {
      setPageError(error.message);
      setActionLoading(null);
      return;
    }

    await writeAuditLog(
      'ads_open_review',
      `Opened advertisement "${ad.title}" for review.`,
      ad.id
    );

    await refreshAfterAction(ad.id);

    setPageMessage(
      'The advertisement is now under review. The company has been notified.'
    );

    setActionLoading(null);
  }

  async function handleApprove(ad: AdminAd) {
    setConfirmApproveAdId(null);
    setConfirmAdminAction(null);
    setRejectReason('');

    setActionLoading(`approve-${ad.id}`);
    setPageError(null);
    setPageMessage(null);

    const { error } = await supabase.rpc(
      'review_company_ad',
      {
        p_ad_id: ad.id,
        p_decision: 'approve',
        p_reason: null,
      }
    );

    if (error) {
      setPageError(error.message);
      setActionLoading(null);
      return;
    }

    await writeAuditLog(
      'ads_approve_publish',
      `Approved and published advertisement "${ad.title}" for company "${ad.companies?.name || 'Unknown company'}".`,
      ad.id
    );

    await refreshAfterAction(ad.id);

    setPageMessage(
      'Advertisement approved and published successfully. The company has been notified.'
    );

    setActionLoading(null);
  }

  async function handleReject(ad: AdminAd) {
    const cleanReason = rejectReason.trim();

    if (!cleanReason) {
      setPageError(
        'A rejection reason is required.'
      );
      return;
    }

    setConfirmApproveAdId(null);
    setConfirmAdminAction(null);
    setRejectReason('');

    setActionLoading(`reject-${ad.id}`);
    setPageError(null);
    setPageMessage(null);

    const { error } = await supabase.rpc(
      'review_company_ad',
      {
        p_ad_id: ad.id,
        p_decision: 'reject',
        p_reason: cleanReason,
      }
    );

    if (error) {
      setPageError(error.message);
      setActionLoading(null);
      return;
    }

    await writeAuditLog(
      'ads_reject',
      `Rejected advertisement "${ad.title}" for company "${ad.companies?.name || 'Unknown company'}". Reason: ${cleanReason}`,
      ad.id
    );

    await refreshAfterAction(ad.id);

    setPageMessage(
      'Advertisement rejected successfully. The company has been notified.'
    );

    setActionLoading(null);
  }

  async function handlePause(ad: AdminAd) {
    setConfirmApproveAdId(null);
    setConfirmAdminAction(null);
    setRejectReason('');

    setActionLoading(`pause-${ad.id}`);
    setPageError(null);
    setPageMessage(null);

    const { error } = await supabase.rpc(
      'pause_company_ad',
      {
        p_ad_id: ad.id,
      }
    );

    if (error) {
      setPageError(error.message);
      setActionLoading(null);
      return;
    }

    await writeAuditLog(
      'ads_pause',
      `Paused advertisement "${ad.title}" for company "${ad.companies?.name || 'Unknown company'}".`,
      ad.id
    );

    await refreshAfterAction(ad.id);

    setPageMessage(
      'Advertisement paused successfully.'
    );

    setActionLoading(null);
  }

  async function handleResume(ad: AdminAd) {
    setConfirmApproveAdId(null);
    setConfirmAdminAction(null);
    setRejectReason('');

    setActionLoading(`resume-${ad.id}`);
    setPageError(null);
    setPageMessage(null);

    const { error } = await supabase.rpc(
      'resume_company_ad',
      {
        p_ad_id: ad.id,
      }
    );

    if (error) {
      setPageError(error.message);
      setActionLoading(null);
      return;
    }

    await writeAuditLog(
      'ads_resume',
      `Resumed advertisement "${ad.title}" for company "${ad.companies?.name || 'Unknown company'}".`,
      ad.id
    );

    await refreshAfterAction(ad.id);

    setPageMessage(
      'Advertisement published again successfully.'
    );

    setActionLoading(null);
  }

  async function handleArchive(
    ad: AdminAd,
    archived: boolean
  ) {
    setConfirmApproveAdId(null);
    setConfirmAdminAction(null);
    setRejectReason('');

    setActionLoading(`archive-${ad.id}`);
    setPageError(null);
    setPageMessage(null);

    const { error } = await supabase.rpc(
      'set_company_ad_archive',
      {
        p_ad_id: ad.id,
        p_archived: archived,
        p_scope: 'admin',
      }
    );

    if (error) {
      setPageError(error.message);
      setActionLoading(null);
      return;
    }

    await writeAuditLog(
      archived
        ? 'ads_archive'
        : 'ads_restore_archive',
      archived
        ? `Archived advertisement "${ad.title}" in the admin dashboard.`
        : `Restored advertisement "${ad.title}" from the admin archive.`,
      ad.id
    );

    setOpenAdId(null);

    await loadAds(false);

    setPageMessage(
      archived
        ? 'Advertisement moved to the admin archive.'
        : 'Advertisement restored from the admin archive.'
    );

    setActionLoading(null);
  }

  async function handleDelete(ad: AdminAd) {
    setConfirmApproveAdId(null);
    setConfirmAdminAction(null);
    setRejectReason('');

    setActionLoading(`delete-${ad.id}`);
    setPageError(null);
    setPageMessage(null);

    await writeAuditLog(
      'ads_delete',
      `Deleted advertisement "${ad.title}" for company "${ad.companies?.name || 'Unknown company'}".`,
      ad.id
    );

    const { error } = await supabase.rpc(
      'delete_company_ad',
      {
        p_ad_id: ad.id,
      }
    );

    if (error) {
      setPageError(error.message);
      setActionLoading(null);
      return;
    }

    setOpenAdId(null);

    await loadAds(false);

    setPageMessage(
      'Advertisement deleted permanently.'
    );

    setActionLoading(null);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f3ef] p-4 text-[#173321] sm:p-6">
        <div className="mx-auto max-w-6xl rounded-3xl border border-[#e2d3bf] bg-white p-8 text-center shadow-sm">
          <p className="font-bold text-[#4f3b25]">
            Loading advertisements...
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[#f6f3ef] p-4 text-[#173321] sm:p-6">
        <div className="mx-auto max-w-6xl space-y-5">
          <section className="rounded-3xl border border-[#e2d3bf] bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8b5a2b]">
                  Sendio Administration
                </p>

                <h1 className="mt-2 text-2xl font-black text-[#0b5b2f] sm:text-3xl">
                  Ads Control
                </h1>

                <p className="mt-2 max-w-2xl text-sm font-semibold text-[#6e5e4a]">
                  Review, approve, reject, pause,
                  preview and organize company
                  advertisements.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/"
                  className="rounded-full border border-[#d8c3a5] bg-white px-4 py-2 text-xs font-black text-[#173321] hover:bg-[#fbf8f3]"
                >
                  Homepage
                </Link>

                <Link
                  href="/dashboard/admin"
                  className="rounded-full bg-[#0b5b2f] px-4 py-2 text-xs font-black text-white hover:bg-[#084625]"
                >
                  Admin Dashboard
                </Link>
              </div>
            </div>

            {pageError ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {pageError}
              </div>
            ) : null}

            {pageMessage ? (
              <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
                {pageMessage}
              </div>
            ) : null}
          </section>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-2xl border border-[#dbeafe] bg-white p-3 text-center shadow-sm">
              <p className="text-[10px] font-black uppercase text-[#6e5e4a]">
                Pending
              </p>

              <p className="mt-1 text-xl font-black text-[#0b5b2f]">
                {pendingAdsCount}
              </p>
            </div>

            <div className="rounded-2xl border border-[#dbeafe] bg-white p-3 text-center shadow-sm">
              <p className="text-[10px] font-black uppercase text-[#6e5e4a]">
                Published
              </p>

              <p className="mt-1 text-xl font-black text-[#0b5b2f]">
                {activeAdsCount}
              </p>
            </div>

            <div className="rounded-2xl border border-[#dbeafe] bg-white p-3 text-center shadow-sm">
              <p className="text-[10px] font-black uppercase text-[#6e5e4a]">
                Views
              </p>

              <p className="mt-1 text-xl font-black text-[#0b5b2f]">
                {totalViews}
              </p>
            </div>

            <div className="rounded-2xl border border-[#dbeafe] bg-white p-3 text-center shadow-sm">
              <p className="text-[10px] font-black uppercase text-[#6e5e4a]">
                Clicks
              </p>

              <p className="mt-1 text-xl font-black text-[#0b5b2f]">
                {totalClicks}
              </p>
            </div>

            <div className="col-span-2 rounded-2xl border border-[#dbeafe] bg-white p-3 text-center shadow-sm sm:col-span-1">
              <p className="text-[10px] font-black uppercase text-[#6e5e4a]">
                Archived
              </p>

              <p className="mt-1 text-xl font-black text-[#0b5b2f]">
                {archivedAdsCount}
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-[#e2d3bf] bg-white p-4 shadow-sm">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-black text-[#0b5b2f]">
                  Advertisements
                </h2>

                <p className="mt-1 text-xs font-semibold text-[#6e5e4a]">
                  Cards are folded by default. Only one
                  advertisement opens at a time.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target
                        .value as StatusFilter
                    )
                  }
                  className="h-9 rounded-full border border-[#d8c3a5] bg-white px-3 text-xs font-black text-[#173321] outline-none"
                >
                  <option value="all">
                    All statuses
                  </option>
                  <option value="pending">
                    Waiting for review
                  </option>
                  <option value="published">
                    Published
                  </option>
                  <option value="paused">
                    Paused
                  </option>
                  <option value="rejected">
                    Rejected
                  </option>
                  <option value="draft">
                    Drafts
                  </option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setShowArchived(
                      (current) => !current
                    );
                    setOpenAdId(null);
                    setConfirmApproveAdId(null);
                    setConfirmAdminAction(null);
                    setRejectReason('');
                  }}
                  className={`h-9 rounded-full px-4 text-xs font-black ${
                    showArchived
                      ? 'bg-[#0b5b2f] text-white'
                      : 'border border-[#d8c3a5] bg-white text-[#173321]'
                  }`}
                >
                  {showArchived
                    ? 'Show Current Ads'
                    : `Archive (${archivedAdsCount})`}
                </button>

                <button
                  type="button"
                  onClick={() => void loadAds(false)}
                  className="h-9 rounded-full bg-[#eef6ff] px-4 text-xs font-black text-[#0b5b2f] hover:bg-[#e3efff]"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
              {visibleAds.map((ad) => {
                const isOpen =
                  openAdId === ad.id;

                const views = ad.views ?? 0;
                const clicks = ad.clicks ?? 0;

                const isBusy =
                  actionLoading?.endsWith(
                    ad.id
                  ) === true;

                return (
                  <article
                    key={ad.id}
                    className="overflow-hidden rounded-2xl border border-[#eadcc9] bg-[#fbf8f3]"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        void handleToggleAd(ad)
                      }
                      disabled={isBusy}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#f5efe7] disabled:cursor-wait disabled:opacity-70"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="max-w-[250px] truncate text-sm font-black text-[#173321]">
                            {ad.title}
                          </h3>

                          <span
                            className={`rounded-full border px-2 py-1 text-[9px] font-black ${getStatusClass(
                              ad.status
                            )}`}
                          >
                            {getStatusLabel(
                              ad.status
                            )}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-[11px] font-semibold text-[#8b5a2b]">
                          {ad.companies?.name ||
                            'Unknown company'}
                          {' • '}
                          {views} views
                          {' • '}
                          {clicks} clicks
                        </p>
                      </div>

                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-base font-black text-[#0b5b2f] shadow-sm">
                        {isBusy
                          ? '…'
                          : isOpen
                            ? '−'
                            : '+'}
                      </span>
                    </button>

                    {isOpen ? (
                      <div className="border-t border-[#eadcc9] bg-white p-4">
                        <div className="flex justify-center">
                          <AdPreview ad={ad} />
                        </div>

                        <div className="mt-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <h3 className="text-sm font-black text-[#173321]">
                                {ad.title}
                              </h3>

                              <p className="mt-1 text-xs font-bold text-[#0b5b2f]">
                                {ad.companies?.name ||
                                  'Unknown company'}
                              </p>
                            </div>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${getStatusClass(
                                ad.status
                              )}`}
                            >
                              {getStatusLabel(
                                ad.status
                              )}
                            </span>
                          </div>

                          {ad.description ? (
                            <p className="mt-3 text-xs font-semibold leading-5 text-[#6e5e4a]">
                              {ad.description}
                            </p>
                          ) : null}

                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <div className="rounded-xl border border-[#dbeafe] bg-[#f8fbff] p-2 text-center">
                              <p className="text-[9px] font-black uppercase text-[#6e5e4a]">
                                Views
                              </p>

                              <p className="mt-1 text-base font-black text-[#0b5b2f]">
                                {views}
                              </p>
                            </div>

                            <div className="rounded-xl border border-[#dbeafe] bg-[#f8fbff] p-2 text-center">
                              <p className="text-[9px] font-black uppercase text-[#6e5e4a]">
                                Clicks
                              </p>

                              <p className="mt-1 text-base font-black text-[#0b5b2f]">
                                {clicks}
                              </p>
                            </div>

                            <div className="rounded-xl border border-[#dbeafe] bg-[#f8fbff] p-2 text-center">
                              <p className="text-[9px] font-black uppercase text-[#6e5e4a]">
                                CTR
                              </p>

                              <p className="mt-1 text-base font-black text-[#0b5b2f]">
                                {calculateCtr(
                                  views,
                                  clicks
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] font-semibold text-[#6e5e4a]">
                            <p>
                              Placement:{' '}
                              <span className="font-black text-[#173321]">
                                {getPlacementLabel(
                                  ad
                                )}
                              </span>
                            </p>

                            <p>
                              Duration:{' '}
                              <span className="font-black text-[#173321]">
                                {ad.plan_days ||
                                  30}{' '}
                                days
                              </span>
                            </p>

                            <p>
                              Created:{' '}
                              <span className="font-black text-[#173321]">
                                {formatDate(
                                  ad.created_at
                                )}
                              </span>
                            </p>

                            <p>
                              Reviewed:{' '}
                              <span className="font-black text-[#173321]">
                                {formatDate(
                                  ad.reviewed_at
                                )}
                              </span>
                            </p>

                            <p>
                              Starts:{' '}
                              <span className="font-black text-[#173321]">
                                {formatDate(
                                  ad.starts_at
                                )}
                              </span>
                            </p>

                            <p>
                              Ends:{' '}
                              <span className="font-black text-[#173321]">
                                {formatDate(
                                  ad.ends_at
                                )}
                              </span>
                            </p>
                          </div>

                          {ad.rejected_reason ? (
                            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                              Rejection reason:{' '}
                              {ad.rejected_reason}
                            </div>
                          ) : null}

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewAd(ad)
                              }
                              disabled={isBusy}
                              className="rounded-full border border-[#45cfe7] bg-white px-3 py-2 text-[11px] font-black text-[#0b5b2f] hover:bg-[#eef6ff] disabled:opacity-50"
                            >
                              Preview
                            </button>

                            <Link
                              href={getCompanyHref(
                                ad.companies
                              )}
                              className="rounded-full border border-[#d8c3a5] bg-white px-3 py-2 text-[11px] font-black text-[#173321] hover:bg-[#fbf8f3]"
                            >
                              Company
                            </Link>

                            {[
                              'pending_review',
                              'under_review',
                              'approved',
                            ].includes(
                              ad.status || ''
                            ) ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmAdminAction(null);
                                  setRejectReason('');
                                  setConfirmApproveAdId(ad.id);
                                }}
                                disabled={isBusy}
                                className="rounded-full bg-green-600 px-3 py-2 text-[11px] font-black text-white hover:bg-green-700 disabled:opacity-50"
                              >
                                Approve & Publish
                              </button>
                            ) : null}

                            {[
                              'pending_review',
                              'under_review',
                              'approved',
                            ].includes(
                              ad.status || ''
                            ) ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmApproveAdId(null);
                                  setRejectReason('');
                                  setConfirmAdminAction({
                                    adId: ad.id,
                                    action: 'reject',
                                  });
                                }}
                                disabled={isBusy}
                                className="rounded-full bg-red-600 px-3 py-2 text-[11px] font-black text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            ) : null}

                            {ad.status ===
                              'active' &&
                            ad.active === true ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmApproveAdId(null);
                                  setRejectReason('');
                                  setConfirmAdminAction({
                                    adId: ad.id,
                                    action: 'pause',
                                  });
                                }}
                                disabled={isBusy}
                                className="rounded-full bg-slate-700 px-3 py-2 text-[11px] font-black text-white hover:bg-slate-800 disabled:opacity-50"
                              >
                                Pause
                              </button>
                            ) : null}

                            {ad.status ===
                            'paused' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmApproveAdId(null);
                                  setRejectReason('');
                                  setConfirmAdminAction({
                                    adId: ad.id,
                                    action: 'resume',
                                  });
                                }}
                                disabled={isBusy}
                                className="rounded-full bg-[#0b5b2f] px-3 py-2 text-[11px] font-black text-white hover:bg-[#084625] disabled:opacity-50"
                              >
                                Publish Again
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => {
                                setConfirmApproveAdId(null);
                                setRejectReason('');
                                setConfirmAdminAction({
                                  adId: ad.id,
                                  action: showArchived
                                    ? 'restore'
                                    : 'archive',
                                });
                              }}
                              disabled={isBusy}
                              className="rounded-full bg-[#eef6ff] px-3 py-2 text-[11px] font-black text-[#0b5b2f] hover:bg-[#e3efff] disabled:opacity-50"
                            >
                              {showArchived
                                ? 'Restore'
                                : 'Archive'}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setConfirmApproveAdId(null);
                                setRejectReason('');
                                setConfirmAdminAction({
                                  adId: ad.id,
                                  action: 'delete',
                                });
                              }}
                              disabled={isBusy}
                              className="rounded-full border border-red-200 bg-white px-3 py-2 text-[11px] font-black text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>

                          {confirmApproveAdId === ad.id ? (
                            <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-3 py-3 text-center">
                              <p className="text-xs font-bold text-green-800">
                                Approve and publish this advertisement?
                              </p>

                              <button
                                type="button"
                                onClick={() => void handleApprove(ad)}
                                disabled={isBusy}
                                className="mt-2 rounded-full bg-green-600 px-6 py-2 text-xs font-black text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actionLoading === `approve-${ad.id}`
                                  ? 'Publishing...'
                                  : 'OK'}
                              </button>
                            </div>
                          ) : null}

                          {confirmAdminAction?.adId === ad.id &&
                          confirmAdminAction.action === 'reject' ? (
                            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-center">
                              <p className="text-xs font-bold text-red-700">
                                Why is this advertisement being rejected?
                              </p>

                              <input
                                type="text"
                                value={rejectReason}
                                onChange={(event) =>
                                  setRejectReason(event.target.value)
                                }
                                placeholder="Write the rejection reason"
                                className="mt-2 h-10 w-full rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-[#173321] outline-none"
                              />

                              <button
                                type="button"
                                onClick={() => void handleReject(ad)}
                                disabled={isBusy || !rejectReason.trim()}
                                className="mt-2 rounded-full bg-red-600 px-6 py-2 text-xs font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actionLoading === `reject-${ad.id}`
                                  ? 'Rejecting...'
                                  : 'OK'}
                              </button>
                            </div>
                          ) : null}

                          {confirmAdminAction?.adId === ad.id &&
                          confirmAdminAction.action === 'pause' ? (
                            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center">
                              <p className="text-xs font-bold text-slate-700">
                                Pause this published advertisement?
                              </p>

                              <button
                                type="button"
                                onClick={() => void handlePause(ad)}
                                disabled={isBusy}
                                className="mt-2 rounded-full bg-slate-700 px-6 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actionLoading === `pause-${ad.id}`
                                  ? 'Pausing...'
                                  : 'OK'}
                              </button>
                            </div>
                          ) : null}

                          {confirmAdminAction?.adId === ad.id &&
                          confirmAdminAction.action === 'resume' ? (
                            <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-3 py-3 text-center">
                              <p className="text-xs font-bold text-green-800">
                                Publish this advertisement again?
                              </p>

                              <button
                                type="button"
                                onClick={() => void handleResume(ad)}
                                disabled={isBusy}
                                className="mt-2 rounded-full bg-[#0b5b2f] px-6 py-2 text-xs font-black text-white hover:bg-[#084625] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actionLoading === `resume-${ad.id}`
                                  ? 'Publishing...'
                                  : 'OK'}
                              </button>
                            </div>
                          ) : null}

                          {confirmAdminAction?.adId === ad.id &&
                          confirmAdminAction.action === 'archive' ? (
                            <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-center">
                              <p className="text-xs font-bold text-sky-800">
                                Archive this advertisement inside the admin dashboard?
                              </p>

                              <p className="mt-1 text-[10px] font-semibold text-sky-700">
                                Archiving does not pause a published advertisement.
                              </p>

                              <button
                                type="button"
                                onClick={() =>
                                  void handleArchive(ad, true)
                                }
                                disabled={isBusy}
                                className="mt-2 rounded-full bg-sky-600 px-6 py-2 text-xs font-black text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actionLoading === `archive-${ad.id}`
                                  ? 'Archiving...'
                                  : 'OK'}
                              </button>
                            </div>
                          ) : null}

                          {confirmAdminAction?.adId === ad.id &&
                          confirmAdminAction.action === 'restore' ? (
                            <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-center">
                              <p className="text-xs font-bold text-sky-800">
                                Restore this advertisement from the admin archive?
                              </p>

                              <button
                                type="button"
                                onClick={() =>
                                  void handleArchive(ad, false)
                                }
                                disabled={isBusy}
                                className="mt-2 rounded-full bg-sky-600 px-6 py-2 text-xs font-black text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actionLoading === `archive-${ad.id}`
                                  ? 'Restoring...'
                                  : 'OK'}
                              </button>
                            </div>
                          ) : null}

                          {confirmAdminAction?.adId === ad.id &&
                          confirmAdminAction.action === 'delete' ? (
                            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-center">
                              <p className="text-xs font-bold text-red-700">
                                Permanently delete this advertisement?
                              </p>

                              <p className="mt-1 text-[10px] font-semibold text-red-600">
                                This action cannot be undone.
                              </p>

                              <button
                                type="button"
                                onClick={() => void handleDelete(ad)}
                                disabled={isBusy}
                                className="mt-2 rounded-full bg-red-600 px-6 py-2 text-xs font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actionLoading === `delete-${ad.id}`
                                  ? 'Deleting...'
                                  : 'OK'}
                              </button>
                            </div>
                          ) : null}

                          <p className="mt-2 text-[10px] font-semibold text-[#8b5a2b]">
                            Preview does not add views or
                            clicks. Archiving only organizes
                            the admin dashboard and does not
                            pause a published advertisement.
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}

              {visibleAds.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#d8c3a5] bg-[#fbf8f3] p-7 text-center lg:col-span-2">
                  <h3 className="text-base font-black text-[#0b5b2f]">
                    No advertisements found
                  </h3>

                  <p className="mt-2 text-xs font-semibold text-[#6e5e4a]">
                    No advertisements match the selected
                    filter.
                  </p>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </main>

      {previewAd ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Advertisement preview"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setPreviewAd(null);
            }
          }}
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-[#0b5b2f]">
                  Advertisement Preview
                </h2>

                <p className="mt-1 text-xs font-semibold text-[#6e5e4a]">
                  Admin previews are not counted.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPreviewAd(null)
                }
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef6ff] text-lg font-black text-[#0b5b2f] hover:bg-[#e3efff]"
                aria-label="Close preview"
              >
                ×
              </button>
            </div>

            <div className="mt-5 flex justify-center">
              <AdPreview ad={previewAd} />
            </div>

            <button
              type="button"
              onClick={() =>
                setPreviewAd(null)
              }
              className="mt-5 w-full rounded-full bg-[#0b5b2f] px-5 py-2.5 text-sm font-black text-white hover:bg-[#084625]"
            >
              Close Preview
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}