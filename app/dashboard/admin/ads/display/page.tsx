'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type HeroLayout =
  | 'single'
  | 'split_2'
  | 'feature_left_3'
  | 'feature_right_3'
  | 'equal_3'
  | 'grid_4'
  | 'grid_6';

type CompanyInfo = {
  id: string;
  name: string;
  slug: string | null;
};

type DisplayAd = {
  id: string;
  title: string;
  description: string | null;
  media_type: string | null;
  image_url: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  active: boolean | null;
  status: string | null;
  starts_at: string | null;
  ends_at: string | null;
  archived_by_admin: boolean | null;
  companies: CompanyInfo | null;
};

type RawDisplayAd = Omit<DisplayAd, 'companies'> & {
  companies: CompanyInfo | CompanyInfo[] | null;
};

type HeroSettings = {
  enabled: boolean;
  layout: HeroLayout;
};

type HeroSlot = {
  slot_index: number;
  ad_id: string | null;
  is_enabled: boolean;
};

type ServiceLayer = {
  level: 1 | 2 | 3 | 4;
  enabled: boolean;
};

type ServiceSlot = {
  level: 1 | 2 | 3 | 4;
  slot_index: number;
  ad_id: string | null;
  is_enabled: boolean;
};

const HERO_LAYOUTS: Array<{
  id: HeroLayout;
  label: string;
  slots: number;
}> = [
  { id: 'single', label: '1 screen', slots: 1 },
  { id: 'split_2', label: '2 screens', slots: 2 },
  { id: 'feature_left_3', label: '3 — large left', slots: 3 },
  { id: 'feature_right_3', label: '3 — large right', slots: 3 },
  { id: 'equal_3', label: '3 equal', slots: 3 },
  { id: 'grid_4', label: '4 screens', slots: 4 },
  { id: 'grid_6', label: '6 screens', slots: 6 },
];

function normalizeCompany(
  company: CompanyInfo | CompanyInfo[] | null
) {
  if (Array.isArray(company)) {
    return company[0] ?? null;
  }

  return company;
}

function getMediaUrl(ad: DisplayAd) {
  return ad.video_url || ad.image_url || ad.thumbnail_url || null;
}

function isVideoAd(ad: DisplayAd) {
  return ad.media_type === 'video' || Boolean(ad.video_url);
}

function isCurrentlyPublished(ad: DisplayAd) {
  if (ad.active !== true || ad.status !== 'active') return false;
  if (ad.archived_by_admin === true) return false;

  const now = new Date();

  if (ad.starts_at) {
    const startsAt = new Date(ad.starts_at);

    if (!Number.isNaN(startsAt.getTime()) && startsAt > now) {
      return false;
    }
  }

  if (ad.ends_at) {
    const endsAt = new Date(ad.ends_at);

    if (!Number.isNaN(endsAt.getTime()) && endsAt <= now) {
      return false;
    }
  }

  return true;
}

function getHeroSlotCount(layout: HeroLayout) {
  return HERO_LAYOUTS.find((item) => item.id === layout)?.slots ?? 1;
}

function AdThumbnail({ ad }: { ad: DisplayAd }) {
  const mediaUrl = getMediaUrl(ad);

  return (
    <div className="relative h-24 w-full overflow-hidden rounded-xl bg-zinc-100">
      {mediaUrl && isVideoAd(ad) ? (
        <video
          src={mediaUrl}
          muted
          playsInline
          autoPlay
          loop
          className="h-full w-full object-cover"
        />
      ) : null}

      {mediaUrl && !isVideoAd(ad) ? (
        <Image
          src={mediaUrl}
          alt={`${ad.title} advertisement`}
          fill
          unoptimized
          className="object-cover"
          sizes="320px"
        />
      ) : null}

      {!mediaUrl ? (
        <div className="flex h-full items-center justify-center text-3xl font-black text-zinc-500">
          {ad.title.charAt(0).toUpperCase() || 'S'}
        </div>
      ) : null}
    </div>
  );
}

export default function AdDisplayDashboardPage() {
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [ads, setAds] = useState<DisplayAd[]>([]);
  const [heroSettings, setHeroSettings] = useState<HeroSettings>({
    enabled: false,
    layout: 'single',
  });
  const [heroSlots, setHeroSlots] = useState<HeroSlot[]>([]);
  const [serviceLayers, setServiceLayers] = useState<ServiceLayer[]>([]);
  const [serviceSlots, setServiceSlots] = useState<ServiceSlot[]>([]);
  const [openServiceLevel, setOpenServiceLevel] = useState<number | null>(1);
  const [previewAd, setPreviewAd] = useState<DisplayAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const publishedAds = useMemo(() => {
    return ads.filter(isCurrentlyPublished);
  }, [ads]);

  const adById = useMemo(() => {
    return new Map(ads.map((ad) => [ad.id, ad]));
  }, [ads]);

  async function writeAuditLog(
    action: string,
    description: string,
    targetId?: string | null
  ) {
    if (!currentUserId) return;

    await supabase.from('admin_audit_logs').insert({
      actor_id: currentUserId,
      actor_role: 'super_admin',
      action,
      target_table: 'ad_display',
      target_id: targetId || null,
      description,
    });
  }

  async function loadData(showLoader = true) {
    if (showLoader) setLoading(true);

    setError('');

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      router.replace('/login');
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileError || profile?.role !== 'super_admin') {
      router.replace('/dashboard/admin');
      return;
    }

    setCurrentUserId(authData.user.id);

    const [
      adsResult,
      heroSettingsResult,
      heroSlotsResult,
      serviceLayersResult,
      serviceSlotsResult,
    ] = await Promise.all([
      supabase
        .from('company_ads')
        .select(`
          id,
          title,
          description,
          media_type,
          image_url,
          video_url,
          thumbnail_url,
          active,
          status,
          starts_at,
          ends_at,
          archived_by_admin,
          companies (
            id,
            name,
            slug
          )
        `)
        .order('created_at', { ascending: false }),
      supabase
        .from('home_hero_settings')
        .select('enabled, layout')
        .eq('id', 1)
        .maybeSingle(),
      supabase
        .from('home_hero_slots')
        .select('slot_index, ad_id, is_enabled')
        .order('slot_index', { ascending: true }),
      supabase
        .from('services_ad_layers')
        .select('level, enabled')
        .order('level', { ascending: true }),
      supabase
        .from('services_ad_slots')
        .select('level, slot_index, ad_id, is_enabled')
        .order('level', { ascending: true })
        .order('slot_index', { ascending: true }),
    ]);

    const firstError =
      adsResult.error ||
      heroSettingsResult.error ||
      heroSlotsResult.error ||
      serviceLayersResult.error ||
      serviceSlotsResult.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    const normalizedAds = (
      (adsResult.data ?? []) as unknown as RawDisplayAd[]
    ).map((ad) => ({
      ...ad,
      companies: normalizeCompany(ad.companies),
    }));

    setAds(normalizedAds);

    if (heroSettingsResult.data) {
      setHeroSettings({
        enabled: heroSettingsResult.data.enabled === true,
        layout:
          (heroSettingsResult.data.layout as HeroLayout) || 'single',
      });
    }

    setHeroSlots((heroSlotsResult.data ?? []) as HeroSlot[]);
    setServiceLayers(
      (serviceLayersResult.data ?? []) as ServiceLayer[]
    );
    setServiceSlots((serviceSlotsResult.data ?? []) as ServiceSlot[]);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveHeroSettings(patch: Partial<HeroSettings>) {
    const nextSettings = { ...heroSettings, ...patch };

    setSavingKey('hero-settings');
    setNotice('');
    setError('');

    const { error: updateError } = await supabase
      .from('home_hero_settings')
      .update({
        enabled: nextSettings.enabled,
        layout: nextSettings.layout,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (updateError) {
      setError(updateError.message);
      setSavingKey(null);
      return;
    }

    setHeroSettings(nextSettings);
    setNotice(
      nextSettings.enabled
        ? 'Hero display updated. Saved screen assignments were kept.'
        : 'Hero display stopped. All screen assignments were kept.'
    );
    setSavingKey(null);

    await writeAuditLog(
      'hero_display_settings',
      `Hero enabled=${nextSettings.enabled}, layout=${nextSettings.layout}.`
    );
  }

  async function saveHeroSlot(
    slotIndex: number,
    patch: Partial<HeroSlot>
  ) {
    const current = heroSlots.find(
      (slot) => slot.slot_index === slotIndex
    );

    if (!current) return;

    const nextSlot = { ...current, ...patch };
    const key = `hero-${slotIndex}`;

    setSavingKey(key);
    setNotice('');
    setError('');

    const { error: updateError } = await supabase
      .from('home_hero_slots')
      .update({
        ad_id: nextSlot.ad_id,
        is_enabled: nextSlot.is_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('slot_index', slotIndex);

    if (updateError) {
      setError(updateError.message);
      setSavingKey(null);
      return;
    }

    setHeroSlots((currentSlots) =>
      currentSlots.map((slot) =>
        slot.slot_index === slotIndex ? nextSlot : slot
      )
    );
    setNotice(`Hero screen ${slotIndex} updated.`);
    setSavingKey(null);

    await writeAuditLog(
      'hero_screen_update',
      `Updated Hero screen ${slotIndex}.`,
      nextSlot.ad_id
    );
  }

  async function saveServiceLayer(
    level: 1 | 2 | 3 | 4,
    enabled: boolean
  ) {
    const key = `layer-${level}`;

    setSavingKey(key);
    setNotice('');
    setError('');

    const { error: updateError } = await supabase
      .from('services_ad_layers')
      .update({
        enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('level', level);

    if (updateError) {
      setError(updateError.message);
      setSavingKey(null);
      return;
    }

    setServiceLayers((layers) =>
      layers.map((layer) =>
        layer.level === level ? { ...layer, enabled } : layer
      )
    );
    setNotice(
      enabled
        ? `Services advertising level ${level} enabled.`
        : `Services advertising level ${level} stopped. Its card assignments were kept.`
    );
    setSavingKey(null);

    await writeAuditLog(
      'services_layer_update',
      `Services advertising level ${level} enabled=${enabled}.`
    );
  }

  async function saveServiceSlot(
    level: 1 | 2 | 3 | 4,
    slotIndex: number,
    patch: Partial<ServiceSlot>
  ) {
    const current = serviceSlots.find(
      (slot) =>
        slot.level === level && slot.slot_index === slotIndex
    );

    if (!current) return;

    const nextSlot = { ...current, ...patch };
    const key = `service-${level}-${slotIndex}`;

    setSavingKey(key);
    setNotice('');
    setError('');

    const { error: updateError } = await supabase
      .from('services_ad_slots')
      .update({
        ad_id: nextSlot.ad_id,
        is_enabled: nextSlot.is_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('level', level)
      .eq('slot_index', slotIndex);

    if (updateError) {
      setError(updateError.message);
      setSavingKey(null);
      return;
    }

    setServiceSlots((slots) =>
      slots.map((slot) =>
        slot.level === level && slot.slot_index === slotIndex
          ? nextSlot
          : slot
      )
    );
    setNotice(`Level ${level}, card ${slotIndex} updated.`);
    setSavingKey(null);

    await writeAuditLog(
      'services_card_update',
      `Updated services level ${level}, card ${slotIndex}.`,
      nextSlot.ad_id
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f3ef] p-6">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-8 text-center font-bold text-[#173321]">
          Loading advertisement display controls...
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[#f6f3ef] p-4 text-[#173321] sm:p-6">
        <div className="mx-auto max-w-7xl space-y-5">
          <section className="rounded-3xl border border-[#e2d3bf] bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8b5a2b]">
                  Super Admin
                </p>
                <h1 className="mt-2 text-2xl font-black text-[#0b5b2f] sm:text-3xl">
                  Advertisement Display Dashboard
                </h1>
                <p className="mt-2 max-w-3xl text-sm font-semibold text-[#6e5e4a]">
                  Control every Hero screen and every advertising card in the four Services levels independently. Stopping a section never deletes its saved advertisements.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/dashboard/admin/ads"
                  className="rounded-full border border-[#d8c3a5] bg-white px-4 py-2 text-xs font-black"
                >
                  Ads Control
                </Link>
                <Link
                  href="/dashboard/admin"
                  className="rounded-full bg-[#0b5b2f] px-4 py-2 text-xs font-black text-white"
                >
                  Admin Dashboard
                </Link>
                <Link
                  href="/"
                  className="rounded-full bg-black px-4 py-2 text-xs font-black text-white"
                >
                  Homepage
                </Link>
                <Link
                  href="/services"
                  className="rounded-full bg-black px-4 py-2 text-xs font-black text-white"
                >
                  Services Page
                </Link>
              </div>
            </div>

            {error ? (
              <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </p>
            ) : null}

            {notice ? (
              <p className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
                {notice}
              </p>
            ) : null}
          </section>

          <section className="rounded-3xl border border-[#e2d3bf] bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-black text-[#0b5b2f]">
                  Homepage Hero
                </h2>
                <p className="mt-1 text-xs font-semibold text-[#6e5e4a]">
                  Layout changes are immediate. Assignments in screens 1–6 always remain saved.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  void saveHeroSettings({
                    enabled: !heroSettings.enabled,
                  })
                }
                disabled={savingKey === 'hero-settings'}
                className={`rounded-full px-5 py-2 text-xs font-black text-white disabled:opacity-50 ${
                  heroSettings.enabled ? 'bg-green-600' : 'bg-red-600'
                }`}
              >
                {heroSettings.enabled ? 'Hero On' : 'Hero Off'}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {HERO_LAYOUTS.map((layout) => (
                <button
                  type="button"
                  key={layout.id}
                  onClick={() =>
                    void saveHeroSettings({
                      enabled: true,
                      layout: layout.id,
                    })
                  }
                  disabled={savingKey === 'hero-settings'}
                  className={`rounded-full px-4 py-2 text-xs font-black disabled:opacity-50 ${
                    heroSettings.enabled &&
                    heroSettings.layout === layout.id
                      ? 'bg-[#0b5b2f] text-white'
                      : 'border border-[#d8c3a5] bg-white'
                  }`}
                >
                  {layout.label}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {heroSlots.map((slot) => {
                const assignedAd = slot.ad_id
                  ? adById.get(slot.ad_id) ?? null
                  : null;
                const activeInLayout =
                  slot.slot_index <= getHeroSlotCount(heroSettings.layout);
                const key = `hero-${slot.slot_index}`;

                return (
                  <article
                    key={slot.slot_index}
                    className={`rounded-2xl border p-4 ${
                      activeInLayout && heroSettings.enabled
                        ? 'border-[#0b5b2f] bg-[#f3fbf6]'
                        : 'border-[#eadcc9] bg-[#fbf8f3]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-black">
                        Hero Screen {slot.slot_index}
                      </h3>
                      <button
                        type="button"
                        onClick={() =>
                          void saveHeroSlot(slot.slot_index, {
                            is_enabled: !slot.is_enabled,
                          })
                        }
                        disabled={savingKey === key}
                        className={`rounded-full px-3 py-1.5 text-[10px] font-black text-white disabled:opacity-50 ${
                          slot.is_enabled ? 'bg-green-600' : 'bg-slate-500'
                        }`}
                      >
                        {slot.is_enabled ? 'On' : 'Off'}
                      </button>
                    </div>

                    {assignedAd ? (
                      <div className="mt-3">
                        <AdThumbnail ad={assignedAd} />
                        <p className="mt-2 truncate text-sm font-black">
                          {assignedAd.title}
                        </p>
                        <p className="truncate text-[11px] font-semibold text-[#6e5e4a]">
                          {assignedAd.companies?.name || 'Unknown company'}
                          {!isCurrentlyPublished(assignedAd)
                            ? ' • Not currently published'
                            : ''}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 flex h-24 items-center justify-center rounded-xl border border-dashed border-[#d8c3a5] text-xs font-bold text-[#8b5a2b]">
                        No advertisement assigned
                      </div>
                    )}

                    <select
                      value={slot.ad_id ?? ''}
                      onChange={(event) =>
                        void saveHeroSlot(slot.slot_index, {
                          ad_id: event.target.value || null,
                          is_enabled: event.target.value
                            ? true
                            : slot.is_enabled,
                        })
                      }
                      disabled={savingKey === key}
                      className="mt-3 h-10 w-full rounded-xl border border-[#d8c3a5] bg-white px-3 text-xs font-bold outline-none disabled:opacity-50"
                    >
                      <option value="">Choose published advertisement</option>
                      {assignedAd && !isCurrentlyPublished(assignedAd) ? (
                        <option value={assignedAd.id}>
                          {assignedAd.title} — unavailable
                        </option>
                      ) : null}
                      {publishedAds.map((ad) => (
                        <option key={ad.id} value={ad.id}>
                          {ad.title} — {ad.companies?.name || 'Unknown company'}
                        </option>
                      ))}
                    </select>

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => assignedAd && setPreviewAd(assignedAd)}
                        disabled={!assignedAd}
                        className="flex-1 rounded-full border border-[#45cfe7] bg-white px-3 py-2 text-[11px] font-black disabled:opacity-40"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void saveHeroSlot(slot.slot_index, {
                            ad_id: null,
                          })
                        }
                        disabled={!slot.ad_id || savingKey === key}
                        className="flex-1 rounded-full border border-red-200 bg-white px-3 py-2 text-[11px] font-black text-red-600 disabled:opacity-40"
                      >
                        Clear
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-[#e2d3bf] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-[#0b5b2f]">
              Services Page Advertising Cards
            </h2>
            <p className="mt-1 text-xs font-semibold text-[#6e5e4a]">
              Four independent levels. Each level has 14 independently controlled cards.
            </p>

            <div className="mt-5 space-y-4">
              {serviceLayers.map((layer) => {
                const layerSlots = serviceSlots
                  .filter((slot) => slot.level === layer.level)
                  .sort((a, b) => a.slot_index - b.slot_index);
                const isOpen = openServiceLevel === layer.level;

                return (
                  <article
                    key={layer.level}
                    className="overflow-hidden rounded-2xl border border-[#eadcc9]"
                  >
                    <div className="flex flex-col justify-between gap-3 bg-[#fbf8f3] p-4 sm:flex-row sm:items-center">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenServiceLevel(isOpen ? null : layer.level)
                        }
                        className="text-left"
                      >
                        <h3 className="font-black text-[#173321]">
                          Services Level {layer.level}
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-[#6e5e4a]">
                          {layerSlots.filter((slot) => slot.ad_id).length} assigned cards
                        </p>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void saveServiceLayer(
                              layer.level,
                              !layer.enabled
                            )
                          }
                          disabled={savingKey === `layer-${layer.level}`}
                          className={`rounded-full px-4 py-2 text-xs font-black text-white disabled:opacity-50 ${
                            layer.enabled ? 'bg-green-600' : 'bg-red-600'
                          }`}
                        >
                          {layer.enabled ? 'Level On' : 'Level Off'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenServiceLevel(isOpen ? null : layer.level)
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-white font-black"
                        >
                          {isOpen ? '−' : '+'}
                        </button>
                      </div>
                    </div>

                    {isOpen ? (
                      <div className="grid gap-3 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {layerSlots.map((slot) => {
                          const assignedAd = slot.ad_id
                            ? adById.get(slot.ad_id) ?? null
                            : null;
                          const key = `service-${layer.level}-${slot.slot_index}`;

                          return (
                            <div
                              key={`${layer.level}-${slot.slot_index}`}
                              className="rounded-2xl border border-[#eadcc9] bg-[#fbf8f3] p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <strong className="text-xs">
                                  Card {slot.slot_index}
                                </strong>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void saveServiceSlot(
                                      layer.level,
                                      slot.slot_index,
                                      {
                                        is_enabled: !slot.is_enabled,
                                      }
                                    )
                                  }
                                  disabled={savingKey === key}
                                  className={`rounded-full px-2.5 py-1 text-[9px] font-black text-white disabled:opacity-50 ${
                                    slot.is_enabled
                                      ? 'bg-green-600'
                                      : 'bg-slate-500'
                                  }`}
                                >
                                  {slot.is_enabled ? 'On' : 'Off'}
                                </button>
                              </div>

                              {assignedAd ? (
                                <div className="mt-2">
                                  <AdThumbnail ad={assignedAd} />
                                  <p className="mt-2 truncate text-xs font-black">
                                    {assignedAd.title}
                                  </p>
                                </div>
                              ) : (
                                <div className="mt-2 flex h-24 items-center justify-center rounded-xl border border-dashed border-[#d8c3a5] text-[10px] font-bold text-[#8b5a2b]">
                                  Empty card
                                </div>
                              )}

                              <select
                                value={slot.ad_id ?? ''}
                                onChange={(event) =>
                                  void saveServiceSlot(
                                    layer.level,
                                    slot.slot_index,
                                    {
                                      ad_id: event.target.value || null,
                                      is_enabled: event.target.value
                                        ? true
                                        : slot.is_enabled,
                                    }
                                  )
                                }
                                disabled={savingKey === key}
                                className="mt-2 h-9 w-full rounded-xl border border-[#d8c3a5] bg-white px-2 text-[10px] font-bold outline-none disabled:opacity-50"
                              >
                                <option value="">Choose advertisement</option>
                                {assignedAd && !isCurrentlyPublished(assignedAd) ? (
                                  <option value={assignedAd.id}>
                                    {assignedAd.title} — unavailable
                                  </option>
                                ) : null}
                                {publishedAds.map((ad) => (
                                  <option key={ad.id} value={ad.id}>
                                    {ad.title} — {ad.companies?.name || 'Unknown'}
                                  </option>
                                ))}
                              </select>

                              <div className="mt-2 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    assignedAd && setPreviewAd(assignedAd)
                                  }
                                  disabled={!assignedAd}
                                  className="flex-1 rounded-full border border-[#45cfe7] bg-white px-2 py-1.5 text-[9px] font-black disabled:opacity-40"
                                >
                                  Preview
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void saveServiceSlot(
                                      layer.level,
                                      slot.slot_index,
                                      { ad_id: null }
                                    )
                                  }
                                  disabled={!slot.ad_id || savingKey === key}
                                  className="flex-1 rounded-full border border-red-200 bg-white px-2 py-1.5 text-[9px] font-black text-red-600 disabled:opacity-40"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      {previewAd ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPreviewAd(null);
            }
          }}
        >
          <div className="relative h-[min(720px,88vh)] w-[min(1100px,96vw)] overflow-hidden rounded-3xl bg-black">
            <button
              type="button"
              onClick={() => setPreviewAd(null)}
              className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl font-black text-black"
              aria-label="Close preview"
            >
              ×
            </button>

            {isVideoAd(previewAd) && previewAd.video_url ? (
              <video
                src={previewAd.video_url}
                controls
                autoPlay
                playsInline
                className="h-full w-full object-contain"
              />
            ) : getMediaUrl(previewAd) ? (
              <Image
                src={getMediaUrl(previewAd) as string}
                alt={`${previewAd.title} preview`}
                fill
                unoptimized
                className="object-contain"
                sizes="96vw"
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
