'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type AdSlot = 'slider' | 'general' | 'household' | 'gardening' | 'logistics';

type PlanDays = 7 | 30 | 90;

type Company = {
  id: string;
  name: string;
  slug: string | null;
};

type CompanyAd = {
  id: string;
  company_id: string | null;
  title: string;
  description: string | null;
  ad_slot: AdSlot | string | null;
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
  plan_days: number | null;
  price_cents: number | null;
  currency: string | null;
  payment_provider: string | null;
  payment_reference: string | null;
  payment_session_id: string | null;
  payment_error: string | null;
};

const adSlots: { value: AdSlot; label: string; description: string }[] = [
  {
    value: 'slider',
    label: 'Homepage Slider Only',
    description: 'General paid ad shown only in the homepage ads slider',
  },
  {
    value: 'general',
    label: 'General',
    description: 'General maintenance and mixed services',
  },
  {
    value: 'household',
    label: 'Household',
    description: 'Cleaning, home services, and domestic support',
  },
  {
    value: 'gardening',
    label: 'Gardening',
    description: 'Landscaping, gardening, and outdoor services',
  },
  {
    value: 'logistics',
    label: 'Logistics',
    description: 'Delivery, transport, moving, and logistics',
  },
];

const adPlans: { value: PlanDays; label: string; description: string }[] = [
  {
    value: 7,
    label: '7 days',
    description: 'Short campaign duration',
  },
  {
    value: 30,
    label: '30 days',
    description: 'Standard monthly campaign duration',
  },
  {
    value: 90,
    label: '90 days',
    description: 'Long campaign duration',
  },
];

function getStatusClass(status: string | null) {
  if (status === 'active') return 'bg-green-100 text-green-800';
  if (status === 'payment_pending') return 'bg-amber-100 text-amber-800';
  if (status === 'paused') return 'bg-slate-100 text-slate-800';
  if (status === 'rejected') return 'bg-red-100 text-red-800';
  if (status === 'expired') return 'bg-zinc-100 text-zinc-700';

  return 'bg-[#f1e6d8] text-[#8b5a2b]';
}

function getPaymentClass(paymentStatus: string | null) {
  if (paymentStatus === 'paid') return 'bg-green-100 text-green-800';
  if (paymentStatus === 'pending') return 'bg-amber-100 text-amber-800';
  if (paymentStatus === 'failed') return 'bg-red-100 text-red-800';
  if (paymentStatus === 'refunded') return 'bg-slate-100 text-slate-800';

  return 'bg-[#f1e6d8] text-[#8b5a2b]';
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

function getCompanyProfileHref(company: Company) {
  const identifier = company.slug?.trim() || company.id;

  return `/companies/${encodeURIComponent(identifier)}`;
}

function getSafeFileName(fileName: string) {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-');
}

function getSlotDisplayName(adSlot: string | null) {
  if (!adSlot) return 'Homepage Slider Only';
  if (adSlot === 'general') return 'General';
  if (adSlot === 'household') return 'Household';
  if (adSlot === 'gardening') return 'Gardening';
  if (adSlot === 'logistics') return 'Logistics';

  return adSlot;
}

function getPlanDaysValue(value: number | null | undefined): PlanDays {
  if (value === 7 || value === 30 || value === 90) return value;

  return 30;
}

function getPriceDisplay(priceCents: number | null, currency: string | null) {
  if (!priceCents || priceCents <= 0) {
    return 'Not set yet';
  }

  return `${(priceCents / 100).toFixed(2)} ${currency || 'EUR'}`;
}

export default function CompanyAdsPage() {
  const router = useRouter();

  const [company, setCompany] = useState<Company | null>(null);
  const [ads, setAds] = useState<CompanyAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [adSlot, setAdSlot] = useState<AdSlot>('slider');
  const [planDays, setPlanDays] = useState<PlanDays>(30);
  const [ctaText, setCtaText] = useState('View Company');
  const [targetUrl, setTargetUrl] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);

  const mediaFileInputRef = useRef<HTMLInputElement | null>(null);

  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  async function loadCompanyAds() {
    setLoading(true);
    setPageError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace('/login');
      return;
    }

    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('id, name, slug')
      .eq('user_id', user.id)
      .maybeSingle();

    if (companyError) {
      setPageError(companyError.message);
      setLoading(false);
      return;
    }

    if (!companyData) {
      setCompany(null);
      setAds([]);
      setLoading(false);
      return;
    }

    const loadedCompany = companyData as Company;
    setCompany(loadedCompany);

    const { data: adsData, error: adsError } = await supabase
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
        plan_days,
        price_cents,
        currency,
        payment_provider,
        payment_reference,
        payment_session_id,
        payment_error
      `
      )
      .eq('company_id', loadedCompany.id)
      .order('created_at', { ascending: false });

    if (adsError) {
      setPageError(adsError.message);
      setLoading(false);
      return;
    }

    setAds((adsData as CompanyAd[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCompanyAds();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mediaFile) {
      const timer = window.setTimeout(() => {
        setMediaPreviewUrl(null);
      }, 0);

      return () => {
        window.clearTimeout(timer);
      };
    }

    const objectUrl = URL.createObjectURL(mediaFile);

    const timer = window.setTimeout(() => {
      setMediaPreviewUrl(objectUrl);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(objectUrl);
    };
  }, [mediaFile]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setMediaFile(null);
      return;
    }

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setPageError('Only image or video files are allowed.');
      setMediaFile(null);
      return;
    }

    setPageError(null);
    setMediaFile(file);
  }

  async function uploadAdMedia(userId: string, companyId: string, file: File) {
    const safeName = getSafeFileName(file.name);
    const filePath = `${userId}/${companyId}/${file.lastModified}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('ad-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from('ad-media').getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleCreateAd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPageError(null);
    setPageMessage(null);

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanCtaText = ctaText.trim() || 'View Company';
    const cleanTargetUrl = targetUrl.trim();

    if (!cleanTitle) {
      setPageError('Ad title is required.');
      return;
    }

    if (!company) {
      setPageError('Company profile was not found.');
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace('/login');
        return;
      }

      let imageUrl: string | null = null;
      let videoUrl: string | null = null;
      let mediaType = 'logo';

      const selectedMediaFile =
        mediaFile ?? mediaFileInputRef.current?.files?.[0] ?? null;

      if (selectedMediaFile) {
        const publicUrl = await uploadAdMedia(
          user.id,
          company.id,
          selectedMediaFile
        );

        if (selectedMediaFile.type.startsWith('video/')) {
          videoUrl = publicUrl;
          mediaType = 'video';
        } else {
          imageUrl = publicUrl;
          mediaType = 'image';
        }
      }

      const { error: insertError } = await supabase.from('company_ads').insert({
        company_id: company.id,
        created_by: user.id,
        title: cleanTitle,
        description: cleanDescription || null,
        ad_slot: adSlot === 'slider' ? null : adSlot,
        media_type: mediaType,
        image_url: imageUrl,
        video_url: videoUrl,
        cta_text: cleanCtaText,
        target_url: cleanTargetUrl || null,
        active: false,
        status: 'draft',
        payment_status: 'unpaid',
        plan_days: planDays,
        price_cents: 0,
        currency: 'EUR',
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setTitle('');
      setDescription('');
      setAdSlot('slider');
      setPlanDays(30);
      setCtaText('View Company');
      setTargetUrl('');
      setMediaFile(null);
      setMediaPreviewUrl(null);

      if (mediaFileInputRef.current) {
        mediaFileInputRef.current.value = '';
      }

      await loadCompanyAds();

      setPageMessage(
        'Ad draft created successfully. Use Test Payment / Activate Ad to activate it.'
      );
    } catch (error) {
      if (error instanceof Error) {
        setPageError(error.message);
      } else {
        setPageError('Something went wrong while creating the ad.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleContinueToPayment(ad: CompanyAd) {
    if (!company) return;

    const selectedPlanDays = getPlanDaysValue(ad.plan_days);

    const confirmPayment = window.confirm(
      `This is a test payment simulation for development. No real money will be charged. Activate this ad for ${selectedPlanDays} days?`
    );

    if (!confirmPayment) return;

    setPageError(null);
    setPageMessage(null);

    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setDate(endsAt.getDate() + selectedPlanDays);

    const paymentReference = `test_${ad.id}_${now.getTime()}`;

    const { error } = await supabase
      .from('company_ads')
      .update({
        active: true,
        status: 'active',
        payment_status: 'paid',
        paid_at: now.toISOString(),
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        plan_days: selectedPlanDays,
        price_cents: 0,
        currency: ad.currency || 'EUR',
        payment_provider: 'test',
        payment_reference: paymentReference,
        payment_session_id: null,
        payment_error: null,
      })
      .eq('id', ad.id)
      .eq('company_id', company.id);

    if (error) {
      setPageError(error.message);
      return;
    }

    await loadCompanyAds();

    setPageMessage(
      'Test payment completed. Your ad is now active and should appear on the homepage.'
    );
  }

  async function handleDeleteAd(adId: string) {
    if (!company) return;

    const confirmDelete = window.confirm(
      'Delete this ad draft? This action cannot be undone.'
    );

    if (!confirmDelete) return;

    setPageError(null);
    setPageMessage(null);

    const { error } = await supabase
      .from('company_ads')
      .delete()
      .eq('id', adId)
      .eq('company_id', company.id);

    if (error) {
      setPageError(error.message);
      return;
    }

    await loadCompanyAds();

    setPageMessage('Ad deleted successfully.');
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f3ef] p-6 text-[#173321]">
        <div className="mx-auto max-w-6xl rounded-3xl border border-[#e2d3bf] bg-white p-8 text-center shadow-sm">
          <p className="font-bold text-[#4f3b25]">Loading ads...</p>
        </div>
      </main>
    );
  }

  if (!company) {
    return (
      <main className="min-h-screen bg-[#f6f3ef] p-6 text-[#173321]">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#e2d3bf] bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-[#0b5b2f]">
            Company Profile Required
          </h1>

          <p className="mt-3 text-sm font-semibold text-[#6e5e4a]">
            You need to create your company profile before creating ads.
          </p>

          <Link
            href="/dashboard/company"
            className="mt-6 inline-flex rounded-full bg-[#0b5b2f] px-5 py-3 text-sm font-black text-white hover:bg-[#084625]"
          >
            Back to Company Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f3ef] p-6 text-[#173321]">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-[#e2d3bf] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8b5a2b]">
                Sendio Ads
              </p>

              <h1 className="mt-2 text-3xl font-black text-[#0b5b2f]">
                Ads Management
              </h1>

              <p className="mt-2 text-sm font-semibold text-[#6e5e4a]">
                Create paid homepage ads for the main slider or category slots.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={getCompanyProfileHref(company)}
                className="rounded-full border border-[#d8c3a5] bg-white px-4 py-2 text-sm font-black text-[#173321] hover:bg-[#fbf8f3]"
              >
                View Website
              </Link>

              <Link
                href="/dashboard/company"
                className="rounded-full bg-[#0b5b2f] px-4 py-2 text-sm font-black text-white hover:bg-[#084625]"
              >
                Company Dashboard
              </Link>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[#eadcc9] bg-[#fbf8f3] p-4 text-sm font-semibold text-[#6e5e4a]">
            Current company:{' '}
            <span className="font-black text-[#0b5b2f]">{company.name}</span>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
            Development note: Test Payment / Activate Ad is currently a test
            payment simulation. No real money is charged. Later it will be
            replaced with a real payment provider.
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

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <form
            onSubmit={handleCreateAd}
            className="rounded-3xl border border-[#e2d3bf] bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-black text-[#0b5b2f]">
              Create New Ad
            </h2>

            <p className="mt-2 text-sm font-semibold text-[#6e5e4a]">
              This creates a draft. The ad appears on the homepage only after
              activation.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-black text-[#173321]">
                  Ad Title
                </label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-2xl border border-[#e2d3bf] bg-[#fbf8f3] px-4 py-3 text-sm font-semibold outline-none focus:border-[#0b5b2f]"
                  placeholder="Example: Premium Garden Service"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-[#173321]">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-[#e2d3bf] bg-[#fbf8f3] px-4 py-3 text-sm font-semibold outline-none focus:border-[#0b5b2f]"
                  placeholder="Short description for the advertisement"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-[#173321]">
                  Homepage Placement
                </label>
                <select
                  value={adSlot}
                  onChange={(event) => setAdSlot(event.target.value as AdSlot)}
                  className="w-full rounded-2xl border border-[#e2d3bf] bg-[#fbf8f3] px-4 py-3 text-sm font-black outline-none focus:border-[#0b5b2f]"
                >
                  {adSlots.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs font-semibold text-[#8b5a2b]">
                  {adSlots.find((slot) => slot.value === adSlot)?.description}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-[#173321]">
                  Ad Duration
                </label>
                <select
                  value={planDays}
                  onChange={(event) =>
                    setPlanDays(Number(event.target.value) as PlanDays)
                  }
                  className="w-full rounded-2xl border border-[#e2d3bf] bg-[#fbf8f3] px-4 py-3 text-sm font-black outline-none focus:border-[#0b5b2f]"
                >
                  {adPlans.map((plan) => (
                    <option key={plan.value} value={plan.value}>
                      {plan.label}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs font-semibold text-[#8b5a2b]">
                  {adPlans.find((plan) => plan.value === planDays)?.description}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-[#173321]">
                  CTA Text
                </label>
                <input
                  value={ctaText}
                  onChange={(event) => setCtaText(event.target.value)}
                  className="w-full rounded-2xl border border-[#e2d3bf] bg-[#fbf8f3] px-4 py-3 text-sm font-semibold outline-none focus:border-[#0b5b2f]"
                  placeholder="View Company"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-[#173321]">
                  Optional Target URL
                </label>
                <input
                  value={targetUrl}
                  onChange={(event) => setTargetUrl(event.target.value)}
                  className="w-full rounded-2xl border border-[#e2d3bf] bg-[#fbf8f3] px-4 py-3 text-sm font-semibold outline-none focus:border-[#0b5b2f]"
                  placeholder="Leave empty to open company profile"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-[#173321]">
                  Image or Video
                </label>

                <div className="rounded-2xl border border-dashed border-[#d8c3a5] bg-[#fbf8f3] p-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 px-2">
                      <p className="truncate text-sm font-black text-[#173321]">
                        {mediaFile ? mediaFile.name : 'No file selected'}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-[#8b5a2b]">
                        Choose an image or video for this advertisement
                      </p>
                    </div>

                    <label
                      htmlFor="ad-media-file"
                      className="shrink-0 cursor-pointer rounded-full bg-sky-500 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-sky-600"
                    >
                      Upload
                    </label>
                  </div>

                  <input
                    id="ad-media-file"
                    ref={mediaFileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {mediaFile ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-bold text-[#0b5b2f]">
                      Selected: {mediaFile.name}
                    </p>

                    {mediaPreviewUrl && mediaFile.type.startsWith('image/') ? (
                      <div className="h-[120px] w-[150px] max-w-full overflow-hidden rounded-2xl border border-[#eadcc9] bg-[#fbf8f3]">
                        <img
                          src={mediaPreviewUrl}
                          alt="Selected ad preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : null}

                    {mediaPreviewUrl && mediaFile.type.startsWith('video/') ? (
                      <div className="h-[120px] w-[150px] max-w-full overflow-hidden rounded-2xl border border-[#eadcc9] bg-black">
                        <video
                          src={mediaPreviewUrl}
                          controls
                          muted
                          playsInline
                          className="h-full w-full object-contain"
                        >
                          Your browser cannot preview this video format.
                        </video>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-full bg-[#0b5b2f] px-5 py-3 text-sm font-black text-white hover:bg-[#084625] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Creating Ad...' : 'Create Ad Draft'}
              </button>
            </div>
          </form>

          <section className="rounded-3xl border border-[#e2d3bf] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-[#0b5b2f]">Your Ads</h2>

            <p className="mt-2 text-sm font-semibold text-[#6e5e4a]">
              Active paid ads appear automatically in the homepage slider and,
              if selected, in the category slot.
            </p>

            <div className="mt-5 space-y-4">
              {ads.map((ad) => {
                const isVideo =
                  ad.media_type === 'video' || Boolean(ad.video_url);
                const mediaUrl =
                  ad.video_url || ad.image_url || ad.thumbnail_url;
                const durationDays = getPlanDaysValue(ad.plan_days);
                const isPaid = ad.payment_status === 'paid';

                return (
                  <article
                    key={ad.id}
                    className="rounded-3xl border border-[#eadcc9] bg-[#fbf8f3] p-4"
                  >
                    <div className="grid gap-4 md:grid-cols-[150px_1fr]">
                      <div className="h-[120px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b5b2f] to-[#c49a6c]">
                        {mediaUrl && isVideo ? (
                          <video
                            src={mediaUrl}
                            muted
                            playsInline
                            controls
                            className="h-full w-full object-contain bg-black"
                          />
                        ) : null}

                        {mediaUrl && !isVideo ? (
                          <img
                            src={mediaUrl}
                            alt={`${ad.title} advertisement`}
                            className="h-full w-full object-cover"
                          />
                        ) : null}

                        {!mediaUrl ? (
                          <div className="flex h-full w-full items-center justify-center text-4xl font-black text-white">
                            {ad.title.charAt(0).toUpperCase()}
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-black text-[#173321]">
                              {ad.title}
                            </h3>

                            <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#8b5a2b]">
                              Placement: {getSlotDisplayName(ad.ad_slot)}
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
                          </div>
                        </div>

                        {ad.description ? (
                          <p className="mt-3 text-sm font-semibold text-[#6e5e4a]">
                            {ad.description}
                          </p>
                        ) : null}

                        <div className="mt-4 grid gap-2 text-xs font-bold text-[#6e5e4a] md:grid-cols-2">
                          <p>Created: {formatDate(ad.created_at)}</p>
                          <p>Duration: {durationDays} days</p>
                          <p>
                            Price:{' '}
                            {getPriceDisplay(ad.price_cents, ad.currency)}
                          </p>
                          <p>CTA: {ad.cta_text || 'View Company'}</p>
                          <p>Views: {ad.views ?? 0}</p>
                          <p>Clicks: {ad.clicks ?? 0}</p>
                          <p>Starts: {formatDate(ad.starts_at)}</p>
                          <p>Ends: {formatDate(ad.ends_at)}</p>
                          <p>Provider: {ad.payment_provider || '—'}</p>
                          <p>Reference: {ad.payment_reference || '—'}</p>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          {ad.target_url ? (
                            <a
                              href={ad.target_url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-[#d8c3a5] bg-white px-4 py-2 text-xs font-black text-[#173321] hover:bg-[#fbf8f3]"
                            >
                              Open Target URL
                            </a>
                          ) : (
                            <Link
                              href={getCompanyProfileHref(company)}
                              className="rounded-full border border-[#d8c3a5] bg-white px-4 py-2 text-xs font-black text-[#173321] hover:bg-[#fbf8f3]"
                            >
                              Open Company Profile
                            </Link>
                          )}

                          {!isPaid ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleContinueToPayment(ad)}
                                className="rounded-full bg-sky-500 px-4 py-2 text-xs font-black text-white hover:bg-sky-600"
                              >
                                Test Payment / Activate Ad
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteAd(ad.id)}
                                className="rounded-full bg-red-600 px-4 py-2 text-xs font-black text-white hover:bg-red-700"
                              >
                                Delete Draft
                              </button>
                            </>
                          ) : (
                            <Link
                              href="/"
                              className="rounded-full bg-[#0b5b2f] px-4 py-2 text-xs font-black text-white hover:bg-[#084625]"
                            >
                              View on Homepage
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}

              {ads.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#d8c3a5] bg-[#fbf8f3] p-8 text-center">
                  <h3 className="text-lg font-black text-[#0b5b2f]">
                    No ads yet
                  </h3>

                  <p className="mt-2 text-sm font-semibold text-[#6e5e4a]">
                    Create your first advertisement draft using the form.
                  </p>
                </div>
              ) : null}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}