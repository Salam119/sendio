'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { supabase } from '@/lib/supabase';

type PlacementType =
  | 'home_slider'
  | 'home_fixed'
  | 'services_slider';

type HomeFixedSlot =
  | 'general'
  | 'household'
  | 'gardening'
  | 'logistics';

type ServicesSliderLevel = 1 | 2 | 3 | 4;

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

  ad_slot: string | null;
  show_home_slider?: boolean | null;
  show_home_fixed?: boolean | null;
  show_services_page?: boolean | null;
  home_fixed_slot?: string | null;
  services_slider_level?: number | null;

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

  rejected_reason?: string | null;
  reviewed_at?: string | null;
  approved_at?: string | null;
};

type PreviewData = {
  title: string;
  description: string | null;
  ctaText: string;
  mediaUrl: string | null;
  isVideo: boolean;
  placementLabel: string;
};

const placementOptions: {
  value: PlacementType;
  label: string;
  description: string;
}[] = [
  {
    value: 'home_slider',
    label: 'Homepage Slider',
    description:
      'Display the advertisement inside the moving slider on the homepage.',
  },
  {
    value: 'home_fixed',
    label: 'Homepage Fixed Card',
    description:
      'Display the advertisement inside one of the four fixed homepage cards.',
  },
  {
    value: 'services_slider',
    label: 'Services Page Slider',
    description:
      'Display the advertisement inside one of the four services-page slider levels.',
  },
];

const homeFixedSlots: {
  value: HomeFixedSlot;
  label: string;
}[] = [
  {
    value: 'general',
    label: 'General Services',
  },
  {
    value: 'household',
    label: 'Household Services',
  },
  {
    value: 'gardening',
    label: 'Gardening & Landscaping',
  },
  {
    value: 'logistics',
    label: 'Logistics & Transport',
  },
];

const servicesSliderLevels: {
  value: ServicesSliderLevel;
  label: string;
}[] = [
  {
    value: 1,
    label: 'Services Slider — Level 1',
  },
  {
    value: 2,
    label: 'Services Slider — Level 2',
  },
  {
    value: 3,
    label: 'Services Slider — Level 3',
  },
  {
    value: 4,
    label: 'Services Slider — Level 4',
  },
];

const adPlans: {
  value: PlanDays;
  label: string;
}[] = [
  {
    value: 7,
    label: '7 days',
  },
  {
    value: 30,
    label: '30 days',
  },
  {
    value: 90,
    label: '90 days',
  },
];

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

function getStatusLabel(status: string | null) {
  if (status === 'active') return 'Published';
  if (status === 'pending_review') return 'Waiting for approval';
  if (status === 'under_review') return 'Under review';
  if (status === 'approved') return 'Approved';
  if (status === 'paused') return 'Temporarily paused';
  if (status === 'rejected') return 'Rejected';
  if (status === 'expired') return 'Expired';

  return 'Draft';
}

function getStatusMessage(ad: CompanyAd) {
  if (ad.status === 'pending_review') {
    return 'Your advertisement has been sent and is waiting for administration approval.';
  }

  if (ad.status === 'under_review') {
    return 'The administration has opened your advertisement and it is now under review.';
  }

  if (ad.status === 'approved') {
    return 'Your advertisement has been approved and is being prepared for publication.';
  }

  if (ad.status === 'active') {
    return 'Your advertisement has been published successfully.';
  }

  if (ad.status === 'paused') {
    return 'Your advertisement has been paused temporarily by the administration.';
  }

  if (ad.status === 'rejected') {
    return ad.rejected_reason
      ? `The advertisement was not approved: ${ad.rejected_reason}`
      : 'The advertisement was not approved. You may review it and send it again.';
  }

  if (ad.status === 'expired') {
    return 'This advertisement campaign has ended.';
  }

  return 'Preview your advertisement, then send it to the administration for approval.';
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

function getPlanDaysValue(
  value: number | null | undefined
): PlanDays {
  if (value === 7 || value === 30 || value === 90) {
    return value;
  }

  return 30;
}

function getAdPlacement(ad: CompanyAd): PlacementType {
  if (ad.show_home_slider === true) {
    return 'home_slider';
  }

  if (ad.show_home_fixed === true) {
    return 'home_fixed';
  }

  if (ad.show_services_page === true) {
    return 'services_slider';
  }

  if (ad.ad_slot) {
    return 'home_fixed';
  }

  return 'home_slider';
}

function getHomeFixedSlotLabel(value: string | null | undefined) {
  const matchingSlot = homeFixedSlots.find(
    (slot) => slot.value === value
  );

  return matchingSlot?.label || 'Homepage Fixed Card';
}

function getPlacementLabelFromValues(
  placement: PlacementType,
  homeFixedSlot: HomeFixedSlot,
  servicesLevel: ServicesSliderLevel
) {
  if (placement === 'home_slider') {
    return 'Homepage Slider';
  }

  if (placement === 'home_fixed') {
    return getHomeFixedSlotLabel(homeFixedSlot);
  }

  return `Services Slider — Level ${servicesLevel}`;
}

function getPlacementLabel(ad: CompanyAd) {
  const placement = getAdPlacement(ad);

  if (placement === 'home_slider') {
    return 'Homepage Slider';
  }

  if (placement === 'home_fixed') {
    return getHomeFixedSlotLabel(
      ad.home_fixed_slot || ad.ad_slot
    );
  }

  return `Services Slider — Level ${
    ad.services_slider_level || 1
  }`;
}

function getAdMediaUrl(ad: CompanyAd) {
  return ad.video_url || ad.image_url || ad.thumbnail_url;
}

function isVideoAd(ad: CompanyAd) {
  return ad.media_type === 'video' || Boolean(ad.video_url);
}

function calculateCtr(views: number, clicks: number) {
  if (views <= 0) return '0.00%';

  return `${((clicks / views) * 100).toFixed(2)}%`;
}

function canSubmitAd(ad: CompanyAd) {
  return ad.status === 'draft' || ad.status === 'rejected';
}

function AdPreviewCard({
  preview,
}: {
  preview: PreviewData;
}) {
  const firstLetter =
    preview.title.trim().charAt(0).toUpperCase() || 'S';

  return (
    <div>
      <div className="relative flex h-[162px] w-[220px] max-w-full flex-col items-center justify-end overflow-hidden rounded-[22px] border-2 border-[#0b5b2f] bg-white p-3 text-center shadow-sm">
        {preview.mediaUrl && preview.isVideo ? (
          <video
            src={preview.mediaUrl}
            muted
            playsInline
            autoPlay
            loop
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}

        {preview.mediaUrl && !preview.isVideo ? (
          <Image
            src={preview.mediaUrl}
            alt={`${preview.title} advertisement preview`}
            fill
            unoptimized
            className="object-cover"
            sizes="220px"
          />
        ) : null}

        {!preview.mediaUrl ? (
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
            {preview.title || 'Advertisement title'}
          </p>

          {preview.description ? (
            <p
              className="mt-1 overflow-hidden text-[10px] font-semibold text-white/90"
              style={{
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
              }}
            >
              {preview.description}
            </p>
          ) : null}

          <div className="mt-2 inline-flex rounded-full bg-white/95 px-3 py-1 text-[10px] font-black text-[#0b5b2f]">
            {preview.ctaText || 'View Company'}
          </div>
        </div>
      </div>

      <p className="mt-2 w-[220px] max-w-full text-center text-[11px] font-bold text-[#8b5a2b]">
        {preview.placementLabel}
      </p>
    </div>
  );
}

export default function CompanyAdsPage() {
  const router = useRouter();

  const [company, setCompany] =
    useState<Company | null>(null);

  const [ads, setAds] = useState<CompanyAd[]>([]);
  const [loading, setLoading] = useState(true);

  const [openPanel, setOpenPanel] =
    useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const [submittingAdId, setSubmittingAdId] =
  useState<string | null>(null);

  const [confirmSubmitAdId, setConfirmSubmitAdId] =
  useState<string | null>(null);

  const [deletingAdId, setDeletingAdId] =
    useState<string | null>(null);
  const [confirmDeleteAdId, setConfirmDeleteAdId] =
   useState<string | null>(null);
  const [previewData, setPreviewData] =
    useState<PreviewData | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [placement, setPlacement] =
    useState<PlacementType>('home_slider');

  const [homeFixedSlot, setHomeFixedSlot] =
    useState<HomeFixedSlot>('general');

  const [servicesSliderLevel, setServicesSliderLevel] =
    useState<ServicesSliderLevel>(1);

  const [planDays, setPlanDays] =
    useState<PlanDays>(30);

  const [ctaText, setCtaText] =
    useState('View Company');

  const [targetUrl, setTargetUrl] = useState('');

  const [mediaFile, setMediaFile] =
    useState<File | null>(null);

  const [mediaPreviewUrl, setMediaPreviewUrl] =
    useState<string | null>(null);

  const mediaFileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [pageError, setPageError] =
    useState<string | null>(null);

  const [pageMessage, setPageMessage] =
    useState<string | null>(null);

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

  const draftPreview = useMemo<PreviewData>(() => {
    return {
      title: title.trim() || 'Your advertisement',
      description: description.trim() || null,
      ctaText: ctaText.trim() || 'View Company',
      mediaUrl: mediaPreviewUrl,
      isVideo: Boolean(
        mediaFile?.type.startsWith('video/')
      ),
      placementLabel: getPlacementLabelFromValues(
        placement,
        homeFixedSlot,
        servicesSliderLevel
      ),
    };
  }, [
    title,
    description,
    ctaText,
    mediaPreviewUrl,
    mediaFile,
    placement,
    homeFixedSlot,
    servicesSliderLevel,
  ]);

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

    const {
      data: companyData,
      error: companyError,
    } = await supabase
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

    const {
      data: adsData,
      error: adsError,
    } = await supabase
      .from('company_ads')
      .select('*')
      .eq('company_id', loadedCompany.id)
      .order('created_at', {
        ascending: false,
      });

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
     // eslint-disable-next-line react-hooks/set-state-in-effect
      setMediaPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(mediaFile);
    setMediaPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [mediaFile]);

  function togglePanel(panelId: string) {
    setPageError(null);
    setPageMessage(null);

    setOpenPanel((currentPanel) =>
      currentPanel === panelId ? null : panelId
    );
  }

  function resetCreateForm() {
    setTitle('');
    setDescription('');
    setPlacement('home_slider');
    setHomeFixedSlot('general');
    setServicesSliderLevel(1);
    setPlanDays(30);
    setCtaText('View Company');
    setTargetUrl('');
    setMediaFile(null);
    setMediaPreviewUrl(null);

    if (mediaFileInputRef.current) {
      mediaFileInputRef.current.value = '';
    }
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setMediaFile(null);
      return;
    }

    if (
      !file.type.startsWith('image/') &&
      !file.type.startsWith('video/')
    ) {
      setPageError(
        'Only image or video files are allowed.'
      );

      setMediaFile(null);
      event.target.value = '';
      return;
    }

    setPageError(null);
    setMediaFile(file);
  }

  function clearSelectedMedia() {
    setMediaFile(null);
    setMediaPreviewUrl(null);

    if (mediaFileInputRef.current) {
      mediaFileInputRef.current.value = '';
    }
  }

  async function uploadAdMedia(
    userId: string,
    companyId: string,
    file: File
  ) {
    const safeName = getSafeFileName(file.name);

    const uniqueFileId = `${Date.now()}-${crypto.randomUUID()}`;

    const filePath =
      `${userId}/${companyId}/` +
      `${uniqueFileId}-${safeName}`;

    const { error: uploadError } =
      await supabase.storage
        .from('ad-media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from('ad-media')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  function openDraftPreview() {
    setPreviewData(draftPreview);
  }

  function openSavedAdPreview(ad: CompanyAd) {
    setPreviewData({
      title: ad.title,
      description: ad.description,
      ctaText: ad.cta_text || 'View Company',
      mediaUrl: getAdMediaUrl(ad),
      isVideo: isVideoAd(ad),
      placementLabel: getPlacementLabel(ad),
    });
  }

  async function handleCreateAd(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setPageError(null);
    setPageMessage(null);

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanCtaText =
      ctaText.trim() || 'View Company';

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
        mediaFile ??
        mediaFileInputRef.current?.files?.[0] ??
        null;

      if (selectedMediaFile) {
        const publicUrl = await uploadAdMedia(
          user.id,
          company.id,
          selectedMediaFile
        );

        if (
          selectedMediaFile.type.startsWith('video/')
        ) {
          videoUrl = publicUrl;
          mediaType = 'video';
        } else {
          imageUrl = publicUrl;
          mediaType = 'image';
        }
      }

      const insertPayload = {
        company_id: company.id,
        created_by: user.id,

        title: cleanTitle,
        description: cleanDescription || null,

        ad_slot:
          placement === 'home_fixed'
            ? homeFixedSlot
            : null,

        show_home_slider:
          placement === 'home_slider',

        show_home_fixed:
          placement === 'home_fixed',

        show_services_page:
          placement === 'services_slider',

        home_fixed_slot:
          placement === 'home_fixed'
            ? homeFixedSlot
            : null,

        services_slider_level:
          placement === 'services_slider'
            ? servicesSliderLevel
            : null,

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

        views: 0,
        clicks: 0,
      };

      const {
        data: createdAd,
        error: insertError,
      } = await supabase
        .from('company_ads')
        .insert(insertPayload)
        .select('*')
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      resetCreateForm();

      await loadCompanyAds();

      if (createdAd?.id) {
        setOpenPanel(createdAd.id);
      } else {
        setOpenPanel(null);
      }

      setPageMessage(
        'Advertisement draft created successfully. Preview it and send it for approval when ready.'
      );
    } catch (error) {
      if (error instanceof Error) {
        setPageError(error.message);
      } else {
        setPageError(
          'Something went wrong while creating the advertisement.'
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitForReview(
    ad: CompanyAd
  ) {
     setConfirmSubmitAdId(null);
    setSubmittingAdId(ad.id);
    setPageError(null);
    setPageMessage(null);

    try {
      const { error } = await supabase.rpc(
        'submit_company_ad_for_review',
        {
          p_ad_id: ad.id,
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      await loadCompanyAds();

      setOpenPanel(ad.id);

      setPageMessage(
        'Your advertisement was sent successfully. It is now waiting for administration approval.'
      );
    } catch (error) {
      if (error instanceof Error) {
        setPageError(error.message);
      } else {
        setPageError(
          'The advertisement could not be sent for approval.'
        );
      }
    } finally {
      setSubmittingAdId(null);
    }
  }

  async function handleDeleteAd(ad: CompanyAd) {
    setConfirmDeleteAdId(null);

    setDeletingAdId(ad.id);
    setPageError(null);
    setPageMessage(null);

    try {
      const { error } = await supabase.rpc(
        'delete_company_ad',
        {
          p_ad_id: ad.id,
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      if (openPanel === ad.id) {
        setOpenPanel(null);
      }

      await loadCompanyAds();

      setPageMessage(
        'Advertisement deleted successfully.'
      );
    } catch (error) {
      if (error instanceof Error) {
        setPageError(error.message);
      } else {
        setPageError(
          'The advertisement could not be deleted.'
        );
      }
    } finally {
      setDeletingAdId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f3ef] p-4 text-[#173321] sm:p-6">
        <div className="mx-auto max-w-5xl rounded-3xl border border-[#e2d3bf] bg-white p-8 text-center shadow-sm">
          <p className="font-bold text-[#4f3b25]">
            Loading advertisements...
          </p>
        </div>
      </main>
    );
  }

  if (!company) {
    return (
      <main className="min-h-screen bg-[#f6f3ef] p-4 text-[#173321] sm:p-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#e2d3bf] bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-[#0b5b2f]">
            Company Profile Required
          </h1>

          <p className="mt-3 text-sm font-semibold text-[#6e5e4a]">
            You need to create your company profile
            before creating advertisements.
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
    <>
      <main className="min-h-screen bg-[#f6f3ef] p-4 text-[#173321] sm:p-6">
        <div className="mx-auto max-w-5xl space-y-5">
          <section className="rounded-3xl border border-[#e2d3bf] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8b5a2b]">
                  Sendio Ads
                </p>

                <h1 className="mt-2 text-2xl font-black text-[#0b5b2f] sm:text-3xl">
                  Ads Management
                </h1>

                <p className="mt-2 max-w-2xl text-sm font-semibold text-[#6e5e4a]">
                  Create, preview and send your
                  advertisements to the administration for
                  approval.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={getCompanyProfileHref(company)}
                  className="rounded-full border border-[#d8c3a5] bg-white px-4 py-2 text-xs font-black text-[#173321] hover:bg-[#fbf8f3]"
                >
                  View Profile
                </Link>

                <Link
                  href="/dashboard/company"
                  className="rounded-full bg-[#0b5b2f] px-4 py-2 text-xs font-black text-white hover:bg-[#084625]"
                >
                  Company Dashboard
                </Link>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#eadcc9] bg-[#fbf8f3] px-4 py-3 text-sm font-semibold text-[#6e5e4a]">
              Current company:{' '}
              <span className="font-black text-[#0b5b2f]">
                {company.name}
              </span>
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

          <section className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-[#dbeafe] bg-white p-3 text-center shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-wide text-[#6e5e4a]">
                Views
              </p>

              <p className="mt-1 text-xl font-black text-[#0b5b2f]">
                {totalViews}
              </p>
            </div>

            <div className="rounded-2xl border border-[#dbeafe] bg-white p-3 text-center shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-wide text-[#6e5e4a]">
                Clicks
              </p>

              <p className="mt-1 text-xl font-black text-[#0b5b2f]">
                {totalClicks}
              </p>
            </div>

            <div className="rounded-2xl border border-[#dbeafe] bg-white p-3 text-center shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-wide text-[#6e5e4a]">
                Click Rate
              </p>

              <p className="mt-1 text-xl font-black text-[#0b5b2f]">
                {calculateCtr(totalViews, totalClicks)}
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-[#e2d3bf] bg-white shadow-sm">
            <button
              type="button"
              onClick={() => togglePanel('new')}
              aria-expanded={openPanel === 'new'}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[#fbf8f3]"
            >
              <div>
                <h2 className="text-base font-black text-[#0b5b2f]">
                  Create New Advertisement
                </h2>

                <p className="mt-1 text-xs font-semibold text-[#6e5e4a]">
                  Open the small preparation form and create
                  one advertisement.
                </p>
              </div>

              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef6ff] text-lg font-black text-[#0b5b2f]">
                {openPanel === 'new' ? '−' : '+'}
              </span>
            </button>

            {openPanel === 'new' ? (
              <form
                onSubmit={handleCreateAd}
                className="border-t border-[#eadcc9] p-5"
              >
                <div className="flex justify-center">
                  <AdPreviewCard preview={draftPreview} />
                </div>

                <div className="mx-auto mt-5 grid max-w-3xl gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-black text-[#173321]">
                      Advertisement Title
                    </label>

                    <input
                      value={title}
                      onChange={(event) =>
                        setTitle(event.target.value)
                      }
                      className="h-10 w-full rounded-xl border border-[#e2d3bf] bg-[#fbf8f3] px-3 text-sm font-semibold outline-none focus:border-[#0b5b2f]"
                      placeholder="Advertisement title"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-black text-[#173321]">
                      Publication Location
                    </label>

                    <select
                      value={placement}
                      onChange={(event) =>
                        setPlacement(
                          event.target
                            .value as PlacementType
                        )
                      }
                      className="h-10 w-full rounded-xl border border-[#e2d3bf] bg-[#fbf8f3] px-3 text-sm font-black outline-none focus:border-[#0b5b2f]"
                    >
                      {placementOptions.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {placement === 'home_fixed' ? (
                    <div>
                      <label className="mb-1.5 block text-xs font-black text-[#173321]">
                        Fixed Card
                      </label>

                      <select
                        value={homeFixedSlot}
                        onChange={(event) =>
                          setHomeFixedSlot(
                            event.target
                              .value as HomeFixedSlot
                          )
                        }
                        className="h-10 w-full rounded-xl border border-[#e2d3bf] bg-[#fbf8f3] px-3 text-sm font-black outline-none focus:border-[#0b5b2f]"
                      >
                        {homeFixedSlots.map((slot) => (
                          <option
                            key={slot.value}
                            value={slot.value}
                          >
                            {slot.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {placement === 'services_slider' ? (
                    <div>
                      <label className="mb-1.5 block text-xs font-black text-[#173321]">
                        Services Slider Level
                      </label>

                      <select
                        value={servicesSliderLevel}
                        onChange={(event) =>
                          setServicesSliderLevel(
                            Number(
                              event.target.value
                            ) as ServicesSliderLevel
                          )
                        }
                        className="h-10 w-full rounded-xl border border-[#e2d3bf] bg-[#fbf8f3] px-3 text-sm font-black outline-none focus:border-[#0b5b2f]"
                      >
                        {servicesSliderLevels.map(
                          (level) => (
                            <option
                              key={level.value}
                              value={level.value}
                            >
                              {level.label}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  ) : null}

                  <div>
                    <label className="mb-1.5 block text-xs font-black text-[#173321]">
                      Duration
                    </label>

                    <select
                      value={planDays}
                      onChange={(event) =>
                        setPlanDays(
                          Number(
                            event.target.value
                          ) as PlanDays
                        )
                      }
                      className="h-10 w-full rounded-xl border border-[#e2d3bf] bg-[#fbf8f3] px-3 text-sm font-black outline-none focus:border-[#0b5b2f]"
                    >
                      {adPlans.map((plan) => (
                        <option
                          key={plan.value}
                          value={plan.value}
                        >
                          {plan.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-black text-[#173321]">
                      Short Description
                    </label>

                    <textarea
                      value={description}
                      onChange={(event) =>
                        setDescription(
                          event.target.value
                        )
                      }
                      rows={2}
                      maxLength={240}
                      className="w-full resize-none rounded-xl border border-[#e2d3bf] bg-[#fbf8f3] px-3 py-2 text-sm font-semibold outline-none focus:border-[#0b5b2f]"
                      placeholder="Short description for the advertisement"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-black text-[#173321]">
                      Button Text
                    </label>

                    <input
                      value={ctaText}
                      onChange={(event) =>
                        setCtaText(event.target.value)
                      }
                      className="h-10 w-full rounded-xl border border-[#e2d3bf] bg-[#fbf8f3] px-3 text-sm font-semibold outline-none focus:border-[#0b5b2f]"
                      placeholder="View Company"
                      maxLength={40}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-black text-[#173321]">
                      Optional Target URL
                    </label>

                    <input
                      value={targetUrl}
                      onChange={(event) =>
                        setTargetUrl(event.target.value)
                      }
                      className="h-10 w-full rounded-xl border border-[#e2d3bf] bg-[#fbf8f3] px-3 text-sm font-semibold outline-none focus:border-[#0b5b2f]"
                      placeholder="Leave empty for company profile"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-black text-[#173321]">
                      Advertisement Image or Video
                    </label>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-[#d8c3a5] bg-[#fbf8f3] p-3">
                      <div className="min-w-0">
                        <p className="max-w-[360px] truncate text-xs font-black text-[#173321]">
                          {mediaFile
                            ? mediaFile.name
                            : 'No media selected'}
                        </p>

                        <p className="mt-1 text-[11px] font-semibold text-[#8b5a2b]">
                          Choose one image or one video.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        {mediaFile ? (
                          <button
                            type="button"
                            onClick={clearSelectedMedia}
                            className="rounded-full border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50"
                          >
                            Clear
                          </button>
                        ) : null}

                        <label
                          htmlFor="ad-media-file"
                          className="cursor-pointer rounded-full bg-sky-500 px-4 py-2 text-xs font-black text-white hover:bg-sky-600"
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
                  </div>
                </div>

                <p className="mx-auto mt-4 max-w-3xl rounded-xl bg-[#eef6ff] px-3 py-2 text-xs font-semibold text-[#374151]">
                  {
                    placementOptions.find(
                      (option) =>
                        option.value === placement
                    )?.description
                  }
                </p>

                <div className="mx-auto mt-4 flex max-w-3xl flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={openDraftPreview}
                    className="rounded-full border border-[#45cfe7] bg-white px-4 py-2 text-xs font-black text-[#0b5b2f] hover:bg-[#eef6ff]"
                  >
                    Preview
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      resetCreateForm();
                      setOpenPanel(null);
                    }}
                    className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-black text-red-600 hover:bg-red-50"
                  >
                    Delete Preparation
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-full bg-[#0b5b2f] px-5 py-2 text-xs font-black text-white hover:bg-[#084625] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving
                      ? 'Creating Advertisement...'
                      : 'Create Advertisement Draft'}
                  </button>
                </div>
              </form>
            ) : null}
          </section>

          <section className="rounded-3xl border border-[#e2d3bf] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-[#0b5b2f]">
                  Your Advertisements
                </h2>

                <p className="mt-1 text-xs font-semibold text-[#6e5e4a]">
                  Only one advertisement opens at a time.
                </p>
              </div>

              <span className="rounded-full bg-[#eef6ff] px-3 py-1 text-xs font-black text-[#0b5b2f]">
                {ads.length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {ads.map((ad) => {
                const isOpen = openPanel === ad.id;
                const views = ad.views ?? 0;
                const clicks = ad.clicks ?? 0;
                const isSubmitting =
                  submittingAdId === ad.id;
                const isDeleting =
                  deletingAdId === ad.id;

                return (
                  <article
                    key={ad.id}
                    className="overflow-hidden rounded-2xl border border-[#eadcc9] bg-[#fbf8f3]"
                  >
                    <button
                      type="button"
                      onClick={() => togglePanel(ad.id)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#f5efe7]"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-black text-[#173321]">
                            {ad.title}
                          </h3>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${getStatusClass(
                              ad.status
                            )}`}
                          >
                            {getStatusLabel(ad.status)}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-[11px] font-semibold text-[#8b5a2b]">
                          {getPlacementLabel(ad)}
                          {' • '}
                          {views} views
                          {' • '}
                          {clicks} clicks
                        </p>
                      </div>

                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-base font-black text-[#0b5b2f] shadow-sm">
                        {isOpen ? '−' : '+'}
                      </span>
                    </button>

                    {isOpen ? (
                      <div className="border-t border-[#eadcc9] bg-white p-4">
                        <div className="flex flex-col items-center gap-5 md:flex-row md:items-start">
                          <AdPreviewCard
                            preview={{
                              title: ad.title,
                              description: ad.description,
                              ctaText:
                                ad.cta_text ||
                                'View Company',
                              mediaUrl: getAdMediaUrl(ad),
                              isVideo: isVideoAd(ad),
                              placementLabel:
                                getPlacementLabel(ad),
                            }}
                          />

                          <div className="w-full min-w-0 flex-1">
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              <div className="rounded-xl border border-[#dbeafe] bg-[#f8fbff] p-2.5">
                                <p className="text-[10px] font-black uppercase text-[#6e5e4a]">
                                  Views
                                </p>

                                <p className="mt-1 text-lg font-black text-[#0b5b2f]">
                                  {views}
                                </p>
                              </div>

                              <div className="rounded-xl border border-[#dbeafe] bg-[#f8fbff] p-2.5">
                                <p className="text-[10px] font-black uppercase text-[#6e5e4a]">
                                  Clicks
                                </p>

                                <p className="mt-1 text-lg font-black text-[#0b5b2f]">
                                  {clicks}
                                </p>
                              </div>

                              <div className="rounded-xl border border-[#dbeafe] bg-[#f8fbff] p-2.5">
                                <p className="text-[10px] font-black uppercase text-[#6e5e4a]">
                                  Click Rate
                                </p>

                                <p className="mt-1 text-lg font-black text-[#0b5b2f]">
                                  {calculateCtr(
                                    views,
                                    clicks
                                  )}
                                </p>
                              </div>

                              <div className="rounded-xl border border-[#dbeafe] bg-[#f8fbff] p-2.5">
                                <p className="text-[10px] font-black uppercase text-[#6e5e4a]">
                                  Duration
                                </p>

                                <p className="mt-1 text-lg font-black text-[#0b5b2f]">
                                  {getPlanDaysValue(
                                    ad.plan_days
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 grid gap-2 text-xs font-semibold text-[#6e5e4a] sm:grid-cols-2">
                              <p>
                                Created:{' '}
                                {formatDate(ad.created_at)}
                              </p>

                              <p>
                                Starts:{' '}
                                {formatDate(ad.starts_at)}
                              </p>

                              <p>
                                Ends:{' '}
                                {formatDate(ad.ends_at)}
                              </p>

                              <p>
                                CTA:{' '}
                                {ad.cta_text ||
                                  'View Company'}
                              </p>
                            </div>

                            <div
                              className={`mt-3 rounded-xl border px-3 py-2 text-xs font-bold ${getStatusClass(
                                ad.status
                              )}`}
                            >
                              {getStatusMessage(ad)}
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                    onClick={() =>
                                   setConfirmSubmitAdId(ad.id)
                                  }
                                className="rounded-full border border-[#45cfe7] bg-white px-4 py-2 text-xs font-black text-[#0b5b2f] hover:bg-[#eef6ff]"
                              >
                                Preview
                              </button>

                              {canSubmitAd(ad) ? (
                                <button
                                  type="button"
                                   onClick={() =>
  setConfirmSubmitAdId(ad.id)
}
                                  disabled={isSubmitting}
                                  className="rounded-full bg-sky-500 px-4 py-2 text-xs font-black text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isSubmitting
                                    ? 'Sending...'
                                    : 'Send for Approval'}
                                </button>
                              ) : null}

                              <button
                                type="button"
                                 onClick={() => {
  setConfirmSubmitAdId(null);
  setConfirmDeleteAdId(ad.id);
}}
                                disabled={isDeleting}
                                className="rounded-full bg-red-600 px-4 py-2 text-xs font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isDeleting
                                  ? 'Deleting...'
                                  : 'Delete'}
                              </button>

                              {ad.status === 'active' ? (
                                <Link
                                  href="/"
                                  className="rounded-full bg-[#0b5b2f] px-4 py-2 text-xs font-black text-white hover:bg-[#084625]"
                                >
                                  View Published Ad
                                </Link>
                              ) : null}
                              </div>

{confirmSubmitAdId === ad.id ? (
  <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-center">
    <p className="text-xs font-bold text-sky-800">
      Send this advertisement for approval?
    </p>

    <button
      type="button"
      onClick={() => void handleSubmitForReview(ad)}
      disabled={isSubmitting}
      className="mt-2 rounded-full bg-sky-500 px-6 py-2 text-xs font-black text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSubmitting ? 'Sending...' : 'OK'}
    </button>
  </div>
) : null}
   {confirmDeleteAdId === ad.id ? (
  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-center">
    <p className="text-xs font-bold text-red-700">
      Delete this advertisement permanently?
    </p>

    <button
      type="button"
      onClick={() => void handleDeleteAd(ad)}
      disabled={isDeleting}
      className="mt-2 rounded-full bg-red-600 px-6 py-2 text-xs font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isDeleting ? 'Deleting...' : 'OK'}
    </button>
  </div>
) : null}
<p className="mt-2 text-[11px] font-semibold text-[#8b5a2b]">
                              {ad.status === 'draft' ||
                              ad.status === 'rejected'
                                ? 'Preview the advertisement and send it for approval.'
                                : getStatusMessage(ad)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}

              {ads.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#d8c3a5] bg-[#fbf8f3] p-7 text-center">
                  <h3 className="text-base font-black text-[#0b5b2f]">
                    No advertisements yet
                  </h3>

                  <p className="mt-2 text-xs font-semibold text-[#6e5e4a]">
                    Open the preparation card above and
                    create your first advertisement.
                  </p>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </main>

      {previewData ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Advertisement preview"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPreviewData(null);
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
                  Preview views are not counted in analytics.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPreviewData(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef6ff] text-lg font-black text-[#0b5b2f] hover:bg-[#e3efff]"
                aria-label="Close preview"
              >
                ×
              </button>
            </div>

            <div className="mt-5 flex justify-center">
              <AdPreviewCard preview={previewData} />
            </div>

            <button
              type="button"
              onClick={() => setPreviewData(null)}
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