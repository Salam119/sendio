'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FaEnvelope,
  FaFacebookF,
  FaGlobe,
  FaInstagram,
  FaLinkedinIn,
  FaLocationDot,
  FaPhone,
  FaWhatsapp,
  FaXTwitter,
} from 'react-icons/fa6';
import { supabase } from '@/lib/supabase';
import { createSendioNotification } from '@/lib/notifications';
type Company = {
  id: string;
  user_id: string | null;
  name: string;
  slug: string | null;
  description: string | null;
  logo: string | null;
  cover: string | null;
  category: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  status: string | null;
  working_hours: string | null;
  views: number | null;
  connections: number | null;
  rating: number | null;
  reviews_count: number | null;
  created_at: string | null;
  intro_video: string | null;
};

type CompanyService = {
  id: string;
  company_id: string | null;
  title: string;
  description: string | null;
};

type LinkedServiceCategory = {
  id: string;
  name: string;
  slug: string;
  sort_order: number | null;
};

type CompanyProject = {
  id: string;
  company_id: string | null;
  title: string;
  description: string | null;
};

type CompanyGalleryItem = {
  id: string;
  company_id: string | null;
  url: string;
  type: string | null;
};

type MediaOrientation = 'portrait' | 'landscape' | 'square';

type MediaPreviewLayout = {
  orientation: MediaOrientation;
  width: number;
  height: number;
};

type CompanyFeature = {
  id: string;
  company_id: string | null;
  title: string;
};

type CompanySocialLinks = {
  id: string;
  company_id: string | null;
  whatsapp: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  x: string | null;
  website: string | null;
};

type CompanyReview = {
  id: string;
  company_id: string | null;
  user_id: string | null;
  user_name: string;
  rating: number;
  comment: string | null;
  created_at: string | null;
};

type CompanyArticle = {
  id: string;
  company_id: string | null;
  title: string;
  content: string;
  created_at: string | null;
};

type CompanyLocation = {
  id: string;
  company_id: string;
  address_line: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
  map_title: string | null;
  directions_note: string | null;
  is_public: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type ShowcaseType =
  | 'new_product'
  | 'new_achievement'
  | 'new_project'
  | 'new_opportunity'
  | 'new_service'
  | 'special_offer';

type CompanyShowcase = {
  id: string;
  company_id: string;
  showcase_type: ShowcaseType;
  title: string;
  description: string | null;
  cta_text: string | null;
  cta_url: string | null;
  status: string;
  is_public: boolean;
  display_order: number | null;
  start_at: string | null;
  end_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type CompanyShowcaseMedia = {
  id: string;
  showcase_id: string;
  company_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url: string | null;
  alt_text: string | null;
  display_order: number | null;
  created_at: string | null;
};

type CompanyBranch = {
  id: string;
  company_id: string;
  branch_number: number;
  country: string | null;
  city: string | null;
  specialty: string | null;
  website_url: string | null;
  is_public: boolean;
};

type CurrentUser = {
  id: string;
  email: string | null;
};

type ClientProfile = {
  full_name: string | null;
  user_type: string | null;
};
type CompanyMessageInsertResult = {
  id: string;
};

type ThemeVars = CSSProperties & {
  '--sendio-page-bg': string;
  '--sendio-hero-bg': string;
  '--sendio-soft': string;
  '--sendio-soft-hover': string;
  '--sendio-border': string;
  '--sendio-text': string;
  '--sendio-muted': string;
  '--sendio-accent': string;
};

const THEMES: ThemeVars[] = [
  {
    '--sendio-page-bg': '#ffffff',
    '--sendio-hero-bg': '#e8e1f1',
    '--sendio-soft': '#eef6ff',
    '--sendio-soft-hover': '#e3efff',
    '--sendio-border': '#dbeafe',
    '--sendio-text': '#111827',
    '--sendio-muted': '#374151',
    '--sendio-accent': '#29b9f3',
  },
  {
    '--sendio-page-bg': '#ffffff',
    '--sendio-hero-bg': '#e8f4ff',
    '--sendio-soft': '#f0f9ff',
    '--sendio-soft-hover': '#e0f2fe',
    '--sendio-border': '#bae6fd',
    '--sendio-text': '#0f172a',
    '--sendio-muted': '#334155',
    '--sendio-accent': '#45cfe7',
  },
  {
    '--sendio-page-bg': '#ffffff',
    '--sendio-hero-bg': '#f3ecff',
    '--sendio-soft': '#f7f2ff',
    '--sendio-soft-hover': '#ede4ff',
    '--sendio-border': '#ddd6fe',
    '--sendio-text': '#111827',
    '--sendio-muted': '#4b5563',
    '--sendio-accent': '#8b5cf6',
  },
  {
    '--sendio-page-bg': '#ffffff',
    '--sendio-hero-bg': '#ecfdf5',
    '--sendio-soft': '#f0fdf4',
    '--sendio-soft-hover': '#dcfce7',
    '--sendio-border': '#bbf7d0',
    '--sendio-text': '#111827',
    '--sendio-muted': '#374151',
    '--sendio-accent': '#22c55e',
  },
];

function normalizeUrl(value: string | null) {
  if (!value) return null;

  const cleanValue = value.trim();

  if (!cleanValue) return null;

  if (cleanValue.startsWith('http://') || cleanValue.startsWith('https://')) {
    return cleanValue;
  }

  return `https://${cleanValue}`;
}

function getWhatsappUrl(value: string | null) {
  if (!value) return null;

  const cleanValue = value.trim();

  if (!cleanValue) return null;

  if (cleanValue.startsWith('http://') || cleanValue.startsWith('https://')) {
    return cleanValue;
  }

  const number = cleanValue.replace(/[^\d+]/g, '').replace(/^\+/, '');

  if (!number) return null;

  return `https://wa.me/${number}`;
}

function getPhoneUrl(value: string | null) {
  if (!value) return null;

  const phone = value.trim().replace(/\s/g, '');

  if (!phone) return null;

  return `tel:${phone}`;
}

function getMailUrl(value: string | null) {
  if (!value) return null;

  const email = value.trim();

  if (!email) return null;

  return `mailto:${email}`;
}

function formatStatus(value: string | null) {
  if (!value) return null;

  if (value === 'available') return 'Available';
  if (value === 'busy') return 'Busy';
  if (value === 'closed') return 'Closed';
  if (value === 'not_available') return 'Not Available';

  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getStatusClass(value: string | null) {
  if (value === 'available') return 'status-green';
  if (value === 'busy') return 'status-amber';

  return 'status-red';
}

function formatDate(value: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getStars(rating: number) {
  const safeRating = Math.max(0, Math.min(5, Math.round(rating)));
  return '★'.repeat(safeRating) + '☆'.repeat(5 - safeRating);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

function createMediaPreviewLayout(
  sourceWidth: number,
  sourceHeight: number
): MediaPreviewLayout | null {
  if (sourceWidth <= 0 || sourceHeight <= 0) return null;

  const aspectRatio = sourceWidth / sourceHeight;
  const orientation: MediaOrientation =
    Math.abs(aspectRatio - 1) <= 0.08
      ? 'square'
      : aspectRatio > 1
        ? 'landscape'
        : 'portrait';

  let frameWidth: number;
  let frameHeight: number;

  if (orientation === 'portrait') {
    frameHeight = 740;
    frameWidth = frameHeight * aspectRatio;
  } else if (orientation === 'landscape') {
    frameWidth = 740;
    frameHeight = frameWidth / aspectRatio;
  } else if (aspectRatio >= 1) {
    frameWidth = 560;
    frameHeight = frameWidth / aspectRatio;
  } else {
    frameHeight = 560;
    frameWidth = frameHeight * aspectRatio;
  }

  const availableWidth = Math.max(280, window.innerWidth - 36);
  const availableHeight = Math.max(280, window.innerHeight - 36);
  const scale = Math.min(
    1,
    availableWidth / frameWidth,
    availableHeight / frameHeight
  );

  return {
    orientation,
    width: Math.round(frameWidth * scale),
    height: Math.round(frameHeight * scale),
  };
}

export default function PublicCompanyPage() {
  const params = useParams();
  const router = useRouter();
  const slugParam = params?.slug;
  const slug = Array.isArray(slugParam)
    ? slugParam[0]
    : String(slugParam ?? '');

  const [themeIndex, setThemeIndex] = useState(0);
  const [company, setCompany] = useState<Company | null>(null);
  const [services, setServices] = useState<CompanyService[]>([]);
  const [linkedServiceCategories, setLinkedServiceCategories] = useState<
    LinkedServiceCategory[]
  >([]);
  const [projects, setProjects] = useState<CompanyProject[]>([]);
  const [gallery, setGallery] = useState<CompanyGalleryItem[]>([]);
  const [features, setFeatures] = useState<CompanyFeature[]>([]);
  const [socialLinks, setSocialLinks] = useState<CompanySocialLinks | null>(
    null
  );
  const [reviews, setReviews] = useState<CompanyReview[]>([]);
  const [articles, setArticles] = useState<CompanyArticle[]>([]);
  const [companyLocation, setCompanyLocation] =
    useState<CompanyLocation | null>(null);
  const [companyShowcase, setCompanyShowcase] =
    useState<CompanyShowcase | null>(null);
  const [showcaseMedia, setShowcaseMedia] = useState<CompanyShowcaseMedia[]>(
    []
  );
  const [companyBranches, setCompanyBranches] = useState<CompanyBranch[]>([]);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [unlockNotice, setUnlockNotice] = useState<string | null>(null);

  const [messageName, setMessageName] = useState('');
  const [messageEmail, setMessageEmail] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messageSending, setMessageSending] = useState(false);
  const [messageStatus, setMessageStatus] = useState<string | null>(null);

  const [manualServiceCategoryId, setManualServiceCategoryId] = useState('');

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);

  const [selectedMedia, setSelectedMedia] = useState<CompanyGalleryItem | null>(
    null
  );
  const [mediaPreviewLayout, setMediaPreviewLayout] =
    useState<MediaPreviewLayout | null>(null);

  const currentUserReview = currentUser
    ? reviews.find((review) => review.user_id === currentUser.id) ?? null
    : null;

  const selectedServiceCategoryId =
    manualServiceCategoryId || linkedServiceCategories[0]?.id || '';

  useEffect(() => {
    const timer = window.setInterval(() => {
      setThemeIndex((current) => (current + 1) % THEMES.length);
    }, 120000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadAuthState() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      setIsLoggedIn(Boolean(user));
      setCurrentUser(user ? { id: user.id, email: user.email ?? null } : null);

      if (!user) {
        setClientProfile(null);
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, user_type')
        .eq('id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      const selectedProfile = (profileData as ClientProfile | null) ?? null;
      setClientProfile(selectedProfile);

      await supabase.from('clients').upsert(
        {
          user_id: user.id,
          full_name: selectedProfile?.full_name ?? null,
          email: user.email ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    }

    void loadAuthState();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const user = session?.user ?? null;
        setIsLoggedIn(Boolean(user));
        setCurrentUser(user ? { id: user.id, email: user.email ?? null } : null);

        if (!user) {
          setClientProfile(null);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentUserReview) return;

    const timer = window.setTimeout(() => {
      setReviewRating(currentUserReview.rating);
      setReviewComment(currentUserReview.comment ?? '');
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [currentUserReview]);

  useEffect(() => {
    let isMounted = true;

    async function loadCompanyPage() {
      if (!slug) {
        setLoading(false);
        setNotFound(true);
        return;
      }

      setLoading(true);
      setNotFound(false);

      const companyQuery = supabase.from('companies').select('*');

      const { data: companyData, error: companyError } = isUuid(slug)
        ? await companyQuery.eq('id', slug).maybeSingle()
        : await companyQuery.eq('slug', slug).maybeSingle();

      if (!isMounted) return;

      if (companyError || !companyData) {
        setCompany(null);
        setLoading(false);
        setNotFound(true);
        return;
      }

      const selectedCompany = companyData as Company;

      setCompany(selectedCompany);

      const [
        servicesResult,
        serviceCategoryLinksResult,
        projectsResult,
        galleryResult,
        featuresResult,
        socialLinksResult,
        reviewsResult,
        articlesResult,
        locationResult,
        showcaseResult,
        branchesResult,
      ] = await Promise.all([
        supabase
          .from('company_services')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .order('title', { ascending: true }),

        supabase
          .from('company_service_categories')
          .select('service_category_id')
          .eq('company_id', selectedCompany.id),

        supabase
          .from('company_projects')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .order('title', { ascending: true }),

        supabase
          .from('company_gallery')
          .select('*')
          .eq('company_id', selectedCompany.id),

        supabase
          .from('company_features')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .order('title', { ascending: true }),

        supabase
          .from('company_social_links')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .limit(1),

        supabase
          .from('company_reviews')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('company_articles')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('company_locations')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .eq('is_public', true)
          .limit(1),

        supabase
          .from('company_showcases')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .eq('status', 'active')
          .eq('is_public', true)
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: false })
          .limit(1),

        supabase
          .from('company_branches')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .eq('is_public', true)
          .order('branch_number', { ascending: true }),
      ]);

      if (!isMounted) return;

      const linkedServiceCategoryIds = (
        serviceCategoryLinksResult.data ?? []
      )
        .map((row) => row.service_category_id as string)
        .filter(Boolean);

      let linkedCategoryRows: LinkedServiceCategory[] = [];

      if (linkedServiceCategoryIds.length > 0) {
        const { data: linkedCategoryData, error: linkedCategoryError } =
          await supabase
            .from('service_categories')
            .select('id, name, slug, sort_order')
            .in('id', linkedServiceCategoryIds)
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true });

        if (linkedCategoryError) {
          console.error(
            'COMPANY LINKED SERVICE CATEGORIES ERROR:',
            linkedCategoryError
          );
        } else {
          linkedCategoryRows =
            (linkedCategoryData ?? []) as LinkedServiceCategory[];
        }
      }

      if (!isMounted) return;

      const selectedShowcase =
        (showcaseResult.data?.[0] as CompanyShowcase | undefined) ?? null;

      const mediaResult = selectedShowcase
        ? await supabase
            .from('company_showcase_media')
            .select('*')
            .eq('showcase_id', selectedShowcase.id)
            .order('display_order', { ascending: true })
            .order('created_at', { ascending: true })
        : null;

      if (!isMounted) return;

      setServices((servicesResult.data ?? []) as CompanyService[]);
      setLinkedServiceCategories(linkedCategoryRows);
      setProjects((projectsResult.data ?? []) as CompanyProject[]);
      setGallery((galleryResult.data ?? []) as CompanyGalleryItem[]);
      setFeatures((featuresResult.data ?? []) as CompanyFeature[]);
      setSocialLinks(
        (socialLinksResult.data?.[0] as CompanySocialLinks | undefined) ?? null
      );
      setReviews((reviewsResult.data ?? []) as CompanyReview[]);
      setArticles((articlesResult.data ?? []) as CompanyArticle[]);
      setCompanyLocation(
        (locationResult.data?.[0] as CompanyLocation | undefined) ?? null
      );
      setCompanyShowcase(selectedShowcase);
      setShowcaseMedia((mediaResult?.data ?? []) as CompanyShowcaseMedia[]);
      setCompanyBranches((branchesResult.data ?? []) as CompanyBranch[]);
      setLoading(false);
    }

    void loadCompanyPage();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  async function ensureClientRecord(
    userId: string,
    fullName: string | null,
    email: string | null
  ) {
    await supabase.from('clients').upsert(
      {
        user_id: userId,
        full_name: fullName?.trim() || null,
        email: email?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  }

  function showLockedMessage(message = 'Sign in to unlock this feature.') {
    setUnlockNotice(message);
  }

  function getClientContactName() {
    return (
      clientProfile?.full_name?.trim() ||
      currentUser?.email?.trim() ||
      'Sendio Client'
    );
  }

  function getClientContactEmail() {
    return currentUser?.email?.trim() || 'client@sendio.local';
  }
     function getCompanyContactNotificationDetails(sourceChannel: string) {
    const cleanChannel = sourceChannel.trim().toLowerCase() || 'sendio';

    if (cleanChannel === 'email') {
      return {
        eventType: 'company_contact_email',
        title: 'New email contact',
      };
    }

    if (cleanChannel === 'phone') {
      return {
        eventType: 'company_contact_phone',
        title: 'New phone contact',
      };
    }

    if (cleanChannel === 'whatsapp') {
      return {
        eventType: 'company_contact_whatsapp',
        title: 'New WhatsApp contact',
      };
    }

    if (cleanChannel === 'sendio') {
      return {
        eventType: 'company_contact_message',
        title: 'New Sendio message',
      };
    }

    return {
      eventType: 'company_contact_social',
      title: `New ${cleanChannel} contact`,
    };
  }

  async function createCompanyContactNotification({
    messageId,
    sourceChannel,
    sourceUrl,
    messageBody,
    clientName,
    clientEmail,
  }: {
    messageId: string;
    sourceChannel: string;
    sourceUrl: string | null;
    messageBody: string | null;
    clientName: string;
    clientEmail: string;
  }) {
    if (!company?.user_id || !currentUser) return;

    const notificationDetails =
      getCompanyContactNotificationDetails(sourceChannel);

    await createSendioNotification(supabase, {
      recipientId: company.user_id,
      actorId: currentUser.id,
      recipientType: 'company',
      eventType: notificationDetails.eventType,
      sourceTable: 'company_messages',
      sourceId: messageId,
      title: notificationDetails.title,
      body: messageBody,
      targetUrl: '/dashboard/company/messages',
      metadata: {
        company_id: company.id,
        company_name: company.name,
        source_channel: sourceChannel,
        source_url: sourceUrl,
        client_name: clientName,
        client_email: clientEmail,
      },
    });
  }
  function openContactUrl(url: string) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    window.location.assign(url);
  }

    async function saveCompanyContactActivity(
    sourceChannel: string,
    sourceUrl: string
  ) {
    if (!company || !currentUser) return false;

    const cleanChannel = sourceChannel.trim().toLowerCase() || 'sendio';
    const readableChannel =
      cleanChannel.charAt(0).toUpperCase() + cleanChannel.slice(1);
    const clientName = getClientContactName();
    const clientEmail = getClientContactEmail();
    const messageBody = `Client attempted to contact this company by ${readableChannel}.`;

    const { data, error } = await supabase
      .from('company_messages')
      .insert({
        company_id: company.id,
        client_id: currentUser.id,
        name: clientName,
        email: clientEmail,
        message: messageBody,
        status: 'new',
        company_seen: false,
        admin_seen: false,
        is_archived: false,
        moderation_status: 'normal',
        source_channel: cleanChannel,
        source_url: sourceUrl,
        event_type: 'contact_click',
      })
      .select('id')
      .maybeSingle();

    if (error || !data) {
      return false;
    }
    
    const insertedMessage = data as CompanyMessageInsertResult;

    await createCompanyContactNotification({
      messageId: insertedMessage.id,
      sourceChannel: cleanChannel,
      sourceUrl,
      messageBody,
      clientName,
      clientEmail,
    });

    return true;
  }
  async function handleProtectedContactClick(
    url: string | null,
    lockedMessage: string,
    sourceChannel: string
  ) {
    if (!url) return;

    if (!isLoggedIn || !currentUser) {
      showLockedMessage(lockedMessage);
      return;
    }

    const saved = await saveCompanyContactActivity(sourceChannel, url);

    if (!saved) {
      setUnlockNotice(
        'Contact will open, but Sendio could not save the notification.'
      );
    }

    openContactUrl(url);
  }

  function renderProtectedIconButton(
    label: string,
    url: string | null,
    message: string,
    sourceChannel: string,
    icon: ReactNode,
    variant = ''
  ) {
    if (!url) return null;

    return (
      <button
        type="button"
        className={`icon-action ${variant} ${!isLoggedIn ? 'locked-action' : ''}`}
        aria-label={label}
        title={label}
        onClick={() =>
          handleProtectedContactClick(url, message, sourceChannel)
        }
      >
        {icon}
      </button>
    );
  }

  function handleOpenServiceRequest() {
    if (!company) return;

    if (!isLoggedIn || !currentUser) {
      showLockedMessage('Sign in to request a service from this company.');
      return;
    }

    const selectedCategory =
      linkedServiceCategories.find(
        (category) => category.id === selectedServiceCategoryId
      ) ??
      linkedServiceCategories[0] ??
      null;

    if (!selectedCategory) {
      return;
    }

    const query = new URLSearchParams({
      providerType: 'company',
      providerId: company.id,
    });

    router.push(`/services/${selectedCategory.slug}?${query.toString()}`);
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!company || messageSending) return;

    if (!isLoggedIn) {
      showLockedMessage('Sign in to contact this company.');
      return;
    }

    setMessageStatus(null);

    const cleanName = messageName.trim();
    const cleanEmail = messageEmail.trim();
    const cleanMessage = messageText.trim();

    if (!cleanName || !cleanEmail || !cleanMessage) {
      setMessageStatus('Please fill in all message fields.');
      return;
    }

    if (!currentUser) {
      setMessageStatus('Please sign in again before sending your message.');
      return;
    }

    setMessageSending(true);

       const { data, error } = await supabase
      .from('company_messages')
      .insert({
        company_id: company.id,
        client_id: currentUser.id,
        name: cleanName,
        email: cleanEmail,
        message: cleanMessage,
        status: 'new',
        company_seen: false,
        admin_seen: false,
        is_archived: false,
        moderation_status: 'normal',
        source_channel: 'sendio',
        source_url: null,
        event_type: 'message',
      })
      .select('id')
      .maybeSingle();

    setMessageSending(false);

    if (error || !data) {
      setMessageStatus(
        'Message could not be sent. Please try another contact option.'
      );
      return;
    }
        const insertedMessage = data as CompanyMessageInsertResult;

    await createCompanyContactNotification({
      messageId: insertedMessage.id,
      sourceChannel: 'sendio',
      sourceUrl: null,
      messageBody: cleanMessage,
      clientName: cleanName,
      clientEmail: cleanEmail,
    });
    setMessageName('');
    setMessageEmail('');
    setMessageText('');
    setMessageStatus('Message sent successfully.');
  }

  async function refreshCompanyReviews(companyId: string) {
    const [companyResult, reviewsResult] = await Promise.all([
      supabase.from('companies').select('*').eq('id', companyId).maybeSingle(),

      supabase
        .from('company_reviews')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false }),
    ]);

    if (companyResult.data) {
      setCompany(companyResult.data as Company);
    }

    if (reviewsResult.data) {
      setReviews(reviewsResult.data as CompanyReview[]);
    }
  }

  async function handleSubmitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!company || reviewSubmitting) return;

    if (!currentUser) {
      showLockedMessage('Register to add a rating and review.');
      return;
    }

    if (reviewRating < 1 || reviewRating > 5) {
      setReviewStatus('Rating must be between 1 and 5.');
      return;
    }

    const cleanComment = reviewComment.trim();
    const cleanUserName =
      clientProfile?.full_name?.trim() ||
      currentUser.email?.split('@')[0] ||
      'User';

    setReviewSubmitting(true);
    setReviewStatus(null);

    await ensureClientRecord(currentUser.id, cleanUserName, currentUser.email);

    const existingReview = reviews.find(
      (review) => review.user_id === currentUser.id
    );

    const reviewPayload = {
      user_name: cleanUserName,
      rating: reviewRating,
      comment: cleanComment || null,
    };

    const { error } = existingReview
      ? await supabase
          .from('company_reviews')
          .update(reviewPayload)
          .eq('id', existingReview.id)
          .eq('user_id', currentUser.id)
      : await supabase.from('company_reviews').insert({
          company_id: company.id,
          user_id: currentUser.id,
          ...reviewPayload,
        });

    setReviewSubmitting(false);

    if (error) {
      setReviewStatus(error.message);
      return;
    }

    await refreshCompanyReviews(company.id);

    setReviewStatus(
      existingReview
        ? 'Review updated successfully.'
        : 'Review added successfully.'
    );
  }

  async function handleDeleteReview(reviewId: string) {
    if (!company || !currentUser) {
      showLockedMessage('Sign in to manage your review.');
      return;
    }

    const confirmed = window.confirm('Delete your review?');

    if (!confirmed) return;

    setReviewStatus(null);

    const { error } = await supabase
      .from('company_reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', currentUser.id);

    if (error) {
      setReviewStatus(error.message);
      return;
    }

    setReviewRating(5);
    setReviewComment('');
    await refreshCompanyReviews(company.id);
    setReviewStatus('Review deleted successfully.');
  }

  function getCompanyLocationAddress() {
    if (companyLocation) {
      return [
        companyLocation.address_line,
        companyLocation.postal_code,
        companyLocation.city,
        companyLocation.country,
      ]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(', ');
    }

    return [company?.address, company?.city]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(', ');
  }

  function getShowcaseTypeLabel(type: ShowcaseType) {
    const labels: Record<ShowcaseType, string> = {
      new_product: 'New Product',
      new_achievement: 'New Achievement',
      new_project: 'New Project',
      new_opportunity: 'New Opportunity',
      new_service: 'New Service',
      special_offer: 'Special Offer',
    };

    return labels[type];
  }

  function growReviewTextarea(element: HTMLTextAreaElement) {
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }

  function openMediaPreview(item: CompanyGalleryItem) {
    setMediaPreviewLayout(null);
    setSelectedMedia(item);
  }

  function closeMediaPreview() {
    setSelectedMedia(null);
    setMediaPreviewLayout(null);
  }

  function updateMediaPreviewLayout(width: number, height: number) {
    const nextLayout = createMediaPreviewLayout(width, height);

    if (nextLayout) {
      setMediaPreviewLayout(nextLayout);
    }
  }

  const companyWebsite = normalizeUrl(company?.website ?? null);
  const socialWebsite = normalizeUrl(socialLinks?.website ?? null);
  const websiteUrl = companyWebsite ?? socialWebsite;

  const whatsappUrl =
    getWhatsappUrl(socialLinks?.whatsapp ?? null) ??
    getWhatsappUrl(company?.phone ?? null);

  const phoneUrl = getPhoneUrl(company?.phone ?? null);
  const emailUrl = getMailUrl(company?.email ?? null);
  const facebookUrl = normalizeUrl(socialLinks?.facebook ?? null);
  const instagramUrl = normalizeUrl(socialLinks?.instagram ?? null);
  const linkedinUrl = normalizeUrl(socialLinks?.linkedin ?? null);
  const xUrl = normalizeUrl(socialLinks?.x ?? null);
  const createdDate = formatDate(company?.created_at ?? null);
  const statusLabel = formatStatus(company?.status ?? null);
  const statusClass = getStatusClass(company?.status ?? null);
  const validReviews = reviews.filter((review) => {
  const rating = Number(review.rating);
  return Number.isFinite(rating) && rating > 0;
});

  const calculatedRating = validReviews.length
  ? validReviews.reduce((sum, review) => sum + Number(review.rating), 0) /
    validReviews.length
  : 0;

  const ratingValue = calculatedRating.toFixed(1);
  const reviewsCount = reviews.length;
  const companyLocationAddress = getCompanyLocationAddress();
  const companyMapUrl = companyLocationAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        companyLocationAddress
      )}`
    : null;
  const showcaseCtaUrl = normalizeUrl(companyShowcase?.cta_url ?? null);
  const activeShowcaseMedia = showcaseMedia[0] ?? null;
  const hasPublicShowcase = Boolean(companyShowcase);
  const compactMedia = gallery.slice(0, 2);
  const reviewPreview = currentUserReview ?? reviews[0] ?? null;

  const visibleBranchRows = [1, 2, 3, 4, 5, 6]
    .map((branchNumber) => {
      const branch =
        companyBranches.find((item) => item.branch_number === branchNumber) ??
        null;

      return { branchNumber, branch };
    })
    .filter(({ branch }) =>
      Boolean(
        branch?.country?.trim() ||
          branch?.city?.trim() ||
          branch?.specialty?.trim() ||
          branch?.website_url?.trim()
      )
    );

  if (loading) {
    return (
      <main className="public-company-page" style={THEMES[themeIndex]}>
        <div className="state-shell">
          <Link href="/" className="nav-pill">
            Home
          </Link>
          <div className="state-box">Loading company profile...</div>
        </div>

        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  if (notFound || !company) {
    return (
      <main className="public-company-page" style={THEMES[themeIndex]}>
        <div className="state-shell">
          <Link href="/" className="nav-pill">
            Home
          </Link>

          <div className="state-box">
            <h1>Company not found</h1>
            <Link href="/" className="nav-pill">
              Back to Home
            </Link>
          </div>
        </div>

        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  return (
    <main className="public-company-page" style={THEMES[themeIndex]}>
      <nav className="top-navigation" aria-label="Page navigation">
        <button
          type="button"
          className="nav-pill"
          onClick={() => window.history.back()}
        >
          Back
        </button>

        <button
          type="button"
          className="nav-pill"
          onClick={() => window.history.forward()}
        >
          Next
        </button>

        <Link href="/" className="nav-pill">
          Home
        </Link>
      </nav>

      <section className="hero">
        <div className="hero-left">
          <div className="logo-box">
            {company.logo ? (
              <Image
                src={company.logo}
                unoptimized={company.logo.startsWith('/api/r2/media?')}
                alt={`${company.name} logo`}
                fill
                className="logo-image"
                sizes="104px"
              />
            ) : (
              <span>{company.name.charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className="rating-near-logo">
            <strong>★ {ratingValue}</strong>
            <span>{reviewsCount} reviews</span>
          </div>

          <div className="hero-contact-icons" aria-label="Contact actions">
            {renderProtectedIconButton(
              'WhatsApp',
              whatsappUrl,
              'Sign in to unlock WhatsApp.',
              'whatsapp',
              <FaWhatsapp />,
              'whatsapp-icon'
            )}

            {renderProtectedIconButton(
              'Call',
              phoneUrl,
              'Sign in to unlock calls.',
              'phone',
              <FaPhone />
            )}

            {renderProtectedIconButton(
              'Email',
              emailUrl,
              'Sign in to unlock email.',
              'email',
              <FaEnvelope />
            )}
          </div>
        </div>

        <div className="hero-main">
          <p className="eyebrow">Company Profile</p>

          <div className="hero-title-row">
            <h1>{company.name}</h1>

            {statusLabel ? (
              <span className={`status-badge ${statusClass}`}>
                {statusLabel}
              </span>
            ) : null}
          </div>

          <div className="hero-meta">
            {company.city ? <span>{company.city}</span> : null}
            {company.category ? <span>{company.category}</span> : null}
            {company.working_hours ? <span>{company.working_hours}</span> : null}
          </div>

          {company.description ? (
            <p className="hero-summary">{company.description}</p>
          ) : (
            <p className="hero-summary">
              Registered Sendio company ready to receive client requests.
            </p>
          )}
        </div>

        <aside className="hero-side">
          <div className="social-icons" aria-label="Social and website links">
            {renderProtectedIconButton(
              'Website',
              websiteUrl,
              'Sign in to unlock this website link.',
              'website',
              <FaGlobe />
            )}

            {renderProtectedIconButton(
              'Facebook',
              facebookUrl,
              'Sign in to unlock Facebook.',
              'facebook',
              <FaFacebookF />
            )}

            {renderProtectedIconButton(
              'Instagram',
              instagramUrl,
              'Sign in to unlock Instagram.',
              'instagram',
              <FaInstagram />
            )}

            {renderProtectedIconButton(
              'LinkedIn',
              linkedinUrl,
              'Sign in to unlock LinkedIn.',
              'linkedin',
              <FaLinkedinIn />
            )}

            {renderProtectedIconButton(
              'X',
              xUrl,
              'Sign in to unlock X.',
              'x',
              <FaXTwitter />
            )}

            {renderProtectedIconButton(
              'Map',
              companyMapUrl,
              'Sign in to unlock map directions.',
              'map',
              <FaLocationDot />,
              'map-icon'
            )}
          </div>

          <div className="legal-mini-card">
                 <span>Profile</span>
             <strong>Educational profile</strong>
            <small>Not an official business listing</small>
          </div>
        </aside>
      </section>

      <section className="profile-sections">
        <section className="profile-card-grid">
          <section className="card profile-grid-card">
            <SectionHeading title="Request Service" />

            {isLoggedIn ? (
              linkedServiceCategories.length > 0 ? (
                <div className="service-request-form">
                  <p className="service-request-hint">
                    Choose one of this company&apos;s linked Sendio services.
                  </p>

                  {linkedServiceCategories.length > 1 ? (
                    <select
                      value={selectedServiceCategoryId}
                      onChange={(event) =>
                        setManualServiceCategoryId(event.target.value)
                      }
                      aria-label="Choose service"
                    >
                      {linkedServiceCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="selected-service-category">
                      {linkedServiceCategories[0]?.name}
                    </div>
                  )}

                  <button type="button" onClick={handleOpenServiceRequest}>
                    Continue to Service Request
                  </button>
                </div>
              ) : (
                <div className="locked-box">
                  <p>
                    This company has not linked a Sendio service category yet.
                  </p>
                </div>
              )
            ) : (
              <div className="locked-box">
                <p>Sign in to request a service.</p>

                <button
                  type="button"
                  onClick={() =>
                    showLockedMessage(
                      'Register to request a service from this company.'
                    )
                  }
                >
                  Unlock
                </button>
              </div>
            )}
          </section>

          <section className="card profile-grid-card">
            <SectionHeading title="Sendio Message" />

            {isLoggedIn ? (
              <form onSubmit={handleSendMessage} className="message-form">
                <input
                  type="text"
                  value={messageName}
                  onChange={(event) => setMessageName(event.target.value)}
                  placeholder="Your name"
                />

                <input
                  type="email"
                  value={messageEmail}
                  onChange={(event) => setMessageEmail(event.target.value)}
                  placeholder="Your email"
                />

                <textarea
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  placeholder="Your message"
                  rows={3}
                />

                <button type="submit" disabled={messageSending}>
                  {messageSending ? 'Sending...' : 'Send'}
                </button>

                {messageStatus ? (
                  <p className="status-message">{messageStatus}</p>
                ) : null}
              </form>
            ) : (
              <div className="locked-box">
                <p>Sign in to send a message.</p>

                <button
                  type="button"
                  onClick={() =>
                    showLockedMessage('Register to contact this company.')
                  }
                >
                  Unlock
                </button>
              </div>
            )}
          </section>

          <section className="card profile-grid-card">
            <SectionHeading title="About" />

            <p className="clamped-text">
              {company.description ||
                'This company has not added a public description yet.'}
            </p>
          </section>

          <section className="card profile-grid-card">
            <SectionHeading title="Address" />

            <div className="tiny-fields">
              {company.name ? (
                <div>
                  <span>Name</span>
                  <strong>{company.name}</strong>
                </div>
              ) : null}

              {company.city ? (
                <div>
                  <span>City</span>
                  <strong>{company.city}</strong>
                </div>
              ) : null}

              {companyLocationAddress ? (
                <div>
                  <span>Address</span>
                  <strong>{companyLocationAddress}</strong>
                </div>
              ) : null}

              {company.working_hours ? (
                <div>
                  <span>Working Hours</span>
                  <strong>{company.working_hours}</strong>
                </div>
              ) : null}

              {createdDate ? (
                <div>
                  <span>Joined</span>
                  <strong>{createdDate}</strong>
                </div>
              ) : null}

              <div>
                <span>Legal</span>
                <strong>Registered company</strong>
              </div>
            </div>
          </section>

          {services.length > 0 || linkedServiceCategories.length > 0 ? (
            <section className="card profile-grid-card">
              <SectionHeading
                title="Services"
                count={services.length + linkedServiceCategories.length}
              />

              <div className="chips-wrap compact-scroll">
                {linkedServiceCategories.map((category) => (
                  <span key={`category-${category.id}`}>{category.name}</span>
                ))}

                {services.slice(0, 10).map((service) => (
                  <span key={service.id}>{service.title}</span>
                ))}
              </div>
            </section>
          ) : null}

          {projects.length > 0 ? (
            <section className="card profile-grid-card">
              <SectionHeading title="Projects" count={projects.length} />

              <div className="mini-list compact-scroll">
                {projects.slice(0, 3).map((project) => (
                  <article key={project.id}>
                    <h3>{project.title}</h3>
                    {project.description ? <p>{project.description}</p> : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {compactMedia.length > 0 ? (
            <section className="card profile-grid-card">
              <SectionHeading title="Media" count={compactMedia.length} />

              <div className="two-media-grid compact-media-grid">
                {compactMedia.map((item) => {
                  const isVideo = item.type?.toLowerCase() === 'video';

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="media-square"
                      onClick={() => openMediaPreview(item)}
                      aria-label="Open media"
                    >
                      {isVideo ? (
                        <video src={item.url} preload="metadata" muted />
                      ) : (
                        <Image
                          src={item.url}
                          unoptimized={item.url.startsWith('/api/r2/media?')}
                          alt={`${company.name} media`}
                          fill
                          className="media-image"
                          sizes="120px"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {visibleBranchRows.length > 0 ? (
            <section className="card profile-grid-card">
              <SectionHeading
                title="Branches & Partners"
                count={visibleBranchRows.length}
              />

              <div className="branches-grid compact-scroll">
                {visibleBranchRows.map(({ branchNumber, branch }) => {
                  const country = branch?.country?.trim() ?? '';
                  const city = branch?.city?.trim() ?? '';
                  const specialty = branch?.specialty?.trim() ?? '';
                  const branchUrl = normalizeUrl(branch?.website_url ?? null);

                  return (
                    <article key={branchNumber}>
                      <span>Branch {branchNumber}</span>
                      <strong>{city || country || 'Branch'}</strong>
                      <p>{[specialty, country].filter(Boolean).join(' • ')}</p>

                      {branchUrl ? (
                        <a
                          href={branchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open
                        </a>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          {hasPublicShowcase && companyShowcase ? (
            <section className="card profile-grid-card">
              <div className="showcase-title">
                <span>{getShowcaseTypeLabel(companyShowcase.showcase_type)}</span>
                <SectionHeading title="Showcase" />
              </div>

              <div className="showcase-compact">
                <div>
                  <h3>{companyShowcase.title}</h3>

                  {companyShowcase.description ? (
                    <p>{companyShowcase.description}</p>
                  ) : null}

                  {companyShowcase.cta_text && showcaseCtaUrl ? (
                    <a
                      href={showcaseCtaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {companyShowcase.cta_text}
                    </a>
                  ) : null}
                </div>

                {activeShowcaseMedia ? (
                  <div
                    className="showcase-thumb"
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      openMediaPreview({
                        id: activeShowcaseMedia.id,
                        company_id: activeShowcaseMedia.company_id,
                        url: activeShowcaseMedia.media_url,
                        type: activeShowcaseMedia.media_type,
                      })
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openMediaPreview({
                          id: activeShowcaseMedia.id,
                          company_id: activeShowcaseMedia.company_id,
                          url: activeShowcaseMedia.media_url,
                          type: activeShowcaseMedia.media_type,
                        });
                      }
                    }}
                  >
                    {activeShowcaseMedia.media_type === 'video' ? (
                      <video
                        src={activeShowcaseMedia.media_url}
                        poster={activeShowcaseMedia.thumbnail_url ?? undefined}
                        preload="metadata"
                        muted
                      />
                    ) : (
                      <Image
                        src={activeShowcaseMedia.media_url}
                        unoptimized={activeShowcaseMedia.media_url.startsWith('/api/r2/media?')}
                        alt={activeShowcaseMedia.alt_text || companyShowcase.title}
                        width={96}
                        height={96}
                        className="showcase-image"
                        sizes="96px"
                      />
                    )}
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {features.length > 0 ? (
            <section className="card profile-grid-card">
              <SectionHeading title="Features" count={features.length} />

              <div className="chips-wrap compact-scroll">
                {features.slice(0, 10).map((feature) => (
                  <span key={feature.id}>{feature.title}</span>
                ))}
              </div>
            </section>
          ) : null}

          {articles.length > 0 ? (
            <section className="card profile-grid-card">
              <SectionHeading title="Articles" count={articles.length} />

              <div className="mini-list compact-scroll">
                {articles.slice(0, 2).map((article) => (
                  <article key={article.id}>
                    <h3>{article.title}</h3>
                    <p>{article.content}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="card profile-grid-card">
            <SectionHeading title="Review" count={reviews.length} />

            {isLoggedIn ? (
              <form onSubmit={handleSubmitReview} className="tiny-review-form">
                <div className="tiny-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className={reviewRating >= star ? 'active-star' : ''}
                      aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    >
                      ★
                    </button>
                  ))}

                  <span>{reviewRating}/5</span>
                </div>

                <textarea
                  value={reviewComment}
                  onChange={(event) => {
                    setReviewComment(event.target.value);
                    growReviewTextarea(event.currentTarget);
                  }}
                  placeholder="Write a short review..."
                  rows={1}
                />

                <button type="submit" disabled={reviewSubmitting}>
                  {reviewSubmitting
                    ? 'Saving...'
                    : currentUserReview
                      ? 'Update'
                      : 'Submit'}
                </button>

                {reviewStatus ? (
                  <p className="status-message">{reviewStatus}</p>
                ) : null}
              </form>
            ) : (
              <div className="locked-box">
                <p>Sign in to add a rating.</p>

                <button
                  type="button"
                  onClick={() =>
                    showLockedMessage('Register to add a rating and review.')
                  }
                >
                  Unlock
                </button>
              </div>
            )}

            {reviewPreview ? (
              <div className="one-review">
                <strong>{getStars(reviewPreview.rating)}</strong>
                {reviewPreview.comment ? <p>{reviewPreview.comment}</p> : null}

                {reviewPreview.user_id === currentUser?.id ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteReview(reviewPreview.id)}
                  >
                    delete
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>
        </section>
      </section>

      <section className="sendio-strip">
        <div className="sendio-brand">
          <Image
            src="/logo.png"
            alt="Sendio logo"
            width={38}
            height={38}
            className="sendio-footer-logo"
            sizes="38px"
          />

          <p>
            <strong>Sendio</strong>
            <span>Connects clients with trusted companies.</span>
          </p>
        </div>

        <div className="sendio-footer-actions">
          <Link href="/services">Services</Link>
          <Link href="/register">Join</Link>
        </div>
      </section>

      {selectedMedia ? (
        <div
          className="media-lightbox"
          role="dialog"
          aria-modal="true"
          onClick={closeMediaPreview}
        >
          <div
            className={`media-lightbox-content ${
              mediaPreviewLayout
                ? `is-${mediaPreviewLayout.orientation}`
                : 'is-loading'
            }`}
            style={
              mediaPreviewLayout
                ? {
                    width: `${mediaPreviewLayout.width}px`,
                    height: `${mediaPreviewLayout.height}px`,
                  }
                : undefined
            }
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="lightbox-close"
              onClick={closeMediaPreview}
              aria-label="Close media"
            >
              ×
            </button>

            <div className="lightbox-media-stage">
              {selectedMedia.type?.toLowerCase() === 'video' ? (
                <video
                  src={selectedMedia.url}
                  controls
                  autoPlay
                  playsInline
                  className="lightbox-video"
                  onLoadedMetadata={(event) =>
                    updateMediaPreviewLayout(
                      event.currentTarget.videoWidth,
                      event.currentTarget.videoHeight
                    )
                  }
                />
              ) : (
                <Image
                  src={selectedMedia.url}
                  unoptimized={selectedMedia.url.startsWith('/api/r2/media?')}
                  alt={`${company.name} media preview`}
                  fill
                  quality={90}
                  priority
                  className="lightbox-image"
                  sizes="(max-width: 640px) 100vw, 740px"
                  onLoad={(event) =>
                    updateMediaPreviewLayout(
                      event.currentTarget.naturalWidth,
                      event.currentTarget.naturalHeight
                    )
                  }
                />
              )}
            </div>
          </div>
        </div>
      ) : null}

      {unlockNotice ? (
        <div className="unlock-toast">
          <p>{unlockNotice}</p>

          <div>
            <Link href="/register?type=client">Register</Link>
            <Link href="/login">Sign in</Link>
            <button type="button" onClick={() => setUnlockNotice(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      <style jsx>{pageStyles}</style>
    </main>
  );
}

function SectionHeading({
  title,
  count,
}: {
  title: string;
  count?: number;
}) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {typeof count === 'number' ? <span>{count}</span> : null}
    </div>
  );
}

const pageStyles = `
  .public-company-page {
    --sendio-radius: 22px;
    min-height: 100vh;
    background: var(--sendio-page-bg);
    color: var(--sendio-text);
    font-family: Arial, sans-serif;
    padding: 26px 16px 54px;
    overflow-x: hidden;
    transition: background 0.6s ease;
  }

  .top-navigation,
  .hero,
  .profile-sections,
  .sendio-strip,
  .state-shell {
    width: min(1180px, 100%);
    margin-left: auto;
    margin-right: auto;
  }

  .top-navigation {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  .nav-pill {
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 7px 13px;
    border-radius: 999px;
    border: 1px solid var(--sendio-border);
    background: var(--sendio-soft);
    color: var(--sendio-text);
    font-size: 12px;
    font-weight: 900;
    text-decoration: none;
    cursor: pointer;
  }

  .nav-pill:hover {
    background: var(--sendio-soft-hover);
  }

  .hero {
    display: grid;
    grid-template-columns: 130px minmax(0, 1fr) minmax(180px, 238px);
    gap: 16px;
    align-items: center;
    min-height: 168px;
    padding: 17px;
    border-radius: 30px;
    border: 1px solid var(--sendio-border);
    background: var(--sendio-hero-bg);
    box-shadow: 0 16px 40px rgba(17, 24, 39, 0.08);
    transition: background 0.6s ease, border-color 0.6s ease;
  }

  .hero-left {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .logo-box {
    position: relative;
    width: 104px;
    height: 104px;
    border-radius: 25px;
    overflow: hidden;
    border: 1px solid var(--sendio-border);
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--sendio-muted);
    font-size: 40px;
    font-weight: 900;
  }

  .logo-box :global(.logo-image) {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }

  .rating-near-logo {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    line-height: 1;
  }

  .rating-near-logo strong {
    color: #f59e0b;
    font-size: 14px;
    font-weight: 900;
  }

  .rating-near-logo span {
    color: var(--sendio-muted);
    font-size: 10px;
    font-weight: 900;
  }

  .hero-contact-icons,
  .social-icons {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    justify-content: center;
  }

  .icon-action {
    width: 33px;
    height: 33px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    border: 1px solid var(--sendio-border);
    background: #ffffff;
    color: var(--sendio-text);
    font-size: 14px;
    cursor: pointer;
    transition: transform 0.15s ease, background 0.15s ease;
  }

  .icon-action:hover {
    transform: translateY(-1px);
    background: var(--sendio-soft);
  }

  .whatsapp-icon {
    border-color: #bbf7d0;
    background: #f0fdf4;
    color: #15803d;
  }

  .map-icon {
    border-color: #fecaca;
    background: #fff1f2;
    color: #dc2626;
  }

  .locked-action {
    opacity: 0.68;
  }

  .hero-main {
    min-width: 0;
  }

  .eyebrow {
    margin: 0 0 7px;
    color: var(--sendio-muted);
    font-size: 10px;
    letter-spacing: 0.18em;
    font-weight: 900;
    text-transform: uppercase;
  }

  .hero-title-row {
    display: flex;
    align-items: center;
    gap: 9px;
    flex-wrap: wrap;
  }

  h1 {
    margin: 0;
    color: var(--sendio-text);
    font-size: clamp(25px, 4vw, 40px);
    line-height: 1.02;
    letter-spacing: -0.03em;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    min-height: 25px;
    padding: 5px 10px;
    border-radius: 999px;
    border: 1px solid transparent;
    font-size: 11px;
    font-weight: 900;
  }

  .status-green {
    background: #dcfce7;
    border-color: #bbf7d0;
    color: #166534;
  }

  .status-amber {
    background: #fef3c7;
    border-color: #fde68a;
    color: #92400e;
  }

  .status-red {
    background: #fee2e2;
    border-color: #fecaca;
    color: #991b1b;
  }

  .hero-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 10px;
  }

  .hero-meta span {
    display: inline-flex;
    align-items: center;
    min-height: 27px;
    padding: 5px 10px;
    border-radius: 999px;
    border: 1px solid var(--sendio-border);
    background: #ffffff;
    color: var(--sendio-muted);
    font-size: 12px;
    font-weight: 900;
  }

  .hero-summary {
    max-width: 720px;
    margin: 11px 0 0;
    color: var(--sendio-muted);
    font-size: 13px;
    line-height: 1.55;
    font-weight: 700;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .hero-side {
    display: flex;
    flex-direction: column;
    gap: 11px;
    align-items: stretch;
  }

  .legal-mini-card {
    border: 1px solid var(--sendio-border);
    border-radius: 17px;
    background: rgba(255, 255, 255, 0.82);
    padding: 11px;
  }

  .legal-mini-card span {
    display: block;
    color: var(--sendio-muted);
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.14em;
  }

  .legal-mini-card strong {
    display: block;
    margin-top: 4px;
    color: var(--sendio-text);
    font-size: 12px;
    font-weight: 900;
  }

  .legal-mini-card small {
    display: block;
    margin-top: 5px;
    color: var(--sendio-muted);
    font-size: 11px;
    font-weight: 700;
    line-height: 1.35;
  }

  .profile-sections {
    margin-top: 14px;
  }

  .profile-card-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    align-items: stretch;
  }

  .profile-grid-card {
    min-width: 0;
    height: 318px;
    max-height: 318px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .profile-grid-card .service-request-form,
  .profile-grid-card .message-form,
  .profile-grid-card .tiny-review-form {
    flex: 1;
    min-height: 0;
  }

  .profile-grid-card .compact-scroll,
  .profile-grid-card .tiny-fields,
  .profile-grid-card .mini-list,
  .profile-grid-card .branches-grid {
    overflow: auto;
    min-height: 0;
    padding-right: 2px;
  }

  .profile-grid-card .tiny-fields,
  .profile-grid-card .branches-grid {
    grid-template-columns: 1fr;
  }

  .profile-grid-card .two-media-grid,
  .profile-grid-card .compact-media-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-content: start;
  }

  .profile-grid-card .media-square {
    width: 100%;
    max-height: 126px;
  }

  .profile-grid-card .showcase-compact {
    grid-template-columns: minmax(0, 1fr) 76px;
    overflow: hidden;
  }

  .card {
    border: 1px solid var(--sendio-border);
    border-radius: var(--sendio-radius);
    background: #ffffff;
    padding: 13px;
    box-shadow: 0 10px 25px rgba(17, 24, 39, 0.045);
    min-width: 0;
  }

  :global(.section-heading) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 9px;
  }

  :global(.section-heading h2) {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    margin: 0;
    padding: 6px 11px;
    border-radius: 999px;
    border: 1px solid var(--sendio-border);
    background: var(--sendio-soft);
    color: var(--sendio-text);
    font-size: 12px;
    font-weight: 900;
  }

  :global(.section-heading span) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 25px;
    min-height: 25px;
    padding: 3px 7px;
    border-radius: 999px;
    background: #ffffff;
    border: 1px solid var(--sendio-border);
    color: var(--sendio-muted);
    font-size: 10px;
    font-weight: 900;
  }

  .clamped-text,
  .mini-list p,
  .showcase-compact p,
  .one-review p,
  .locked-box p,
  .status-message {
    color: var(--sendio-muted);
    font-size: 12px;
    font-weight: 700;
    line-height: 1.55;
  }

  .clamped-text {
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .tiny-fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
    gap: 7px;
  }

  .tiny-fields div {
    min-height: 42px;
    border-radius: 15px;
    border: 1px solid var(--sendio-border);
    background: var(--sendio-soft);
    padding: 8px 10px;
    min-width: 0;
  }

  .tiny-fields span {
    display: block;
    color: var(--sendio-muted);
    font-size: 9px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .tiny-fields strong {
    display: block;
    margin-top: 3px;
    color: var(--sendio-text);
    font-size: 11px;
    font-weight: 900;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chips-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .chips-wrap span {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid var(--sendio-border);
    background: var(--sendio-soft);
    color: var(--sendio-text);
    font-size: 11px;
    font-weight: 900;
  }

  .two-media-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .media-square {
    position: relative;
    aspect-ratio: 1 / 1;
    border: 1px solid var(--sendio-border);
    border-radius: 16px;
    overflow: hidden;
    background: #f8fafc;
    padding: 0;
    cursor: pointer;
  }

  .media-square video,
  .media-square :global(.media-image) {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    background: #ffffff;
    pointer-events: none;
  }

  .tiny-review-form,
  .message-form,
  .service-request-form {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .tiny-stars {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .tiny-stars button {
    width: 25px;
    height: 25px;
    border: 1px solid var(--sendio-border);
    border-radius: 999px;
    background: #ffffff;
    color: #cbd5e1;
    font-size: 12px;
    cursor: pointer;
  }

  .tiny-stars button.active-star {
    color: #f59e0b;
    background: var(--sendio-soft);
  }

  .tiny-stars span {
    margin-left: 4px;
    color: var(--sendio-muted);
    font-size: 10px;
    font-weight: 900;
  }

  .tiny-review-form textarea,
  .message-form input,
  .message-form textarea,
  .service-request-form input,
  .service-request-form select,
  .service-request-form textarea {
    width: 100%;
    min-height: 34px;
    max-height: 120px;
    border: 1px solid var(--sendio-border);
    border-radius: 15px;
    background: #ffffff;
    color: var(--sendio-text);
    padding: 8px 10px;
    font-size: 12px;
    font-weight: 700;
    outline: none;
    resize: none;
    overflow: hidden;
  }

  .message-form textarea,
  .service-request-form textarea {
    min-height: 72px;
    resize: vertical;
    overflow: auto;
  }

  .service-request-hint {
    margin: 0;
    color: var(--sendio-muted);
    font-size: 12px;
    font-weight: 700;
    line-height: 1.55;
  }

  .selected-service-category {
    min-height: 36px;
    display: flex;
    align-items: center;
    padding: 8px 10px;
    border: 1px solid var(--sendio-border);
    border-radius: 15px;
    background: var(--sendio-soft);
    color: var(--sendio-text);
    font-size: 12px;
    font-weight: 900;
  }

  .tiny-review-form button[type='submit'],
  .message-form button,
  .service-request-form button,
  .locked-box button {
    min-height: 30px;
    border: 1px solid var(--sendio-border);
    border-radius: 999px;
    background: var(--sendio-soft);
    color: var(--sendio-text);
    font-size: 11px;
    font-weight: 900;
    cursor: pointer;
  }

  .one-review {
    margin-top: 8px;
    border-radius: 15px;
    border: 1px solid var(--sendio-border);
    background: var(--sendio-soft);
    padding: 8px 10px;
  }

  .one-review strong {
    display: block;
    color: #f59e0b;
    font-size: 11px;
    font-weight: 900;
  }

  .one-review p {
    margin: 5px 0 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .one-review button {
    margin-top: 5px;
    border: 0;
    background: transparent;
    color: #be123c;
    font-size: 10px;
    font-weight: 900;
    cursor: pointer;
  }

  .mini-list {
    display: grid;
    gap: 7px;
  }

  .mini-list article {
    border-radius: 15px;
    border: 1px solid var(--sendio-border);
    background: var(--sendio-soft);
    padding: 9px 10px;
  }

  .mini-list h3,
  .showcase-compact h3 {
    margin: 0;
    color: var(--sendio-text);
    font-size: 12px;
    font-weight: 900;
  }

  .mini-list p,
  .showcase-compact p {
    margin: 4px 0 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .showcase-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  .showcase-title > span {
    display: inline-flex;
    min-height: 27px;
    align-items: center;
    padding: 5px 9px;
    border-radius: 999px;
    background: #dcfce7;
    color: #166534;
    font-size: 10px;
    font-weight: 900;
  }

  .showcase-title :global(.section-heading) {
    margin-bottom: 0;
  }

  .showcase-compact {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 82px;
    gap: 8px;
    margin-top: 9px;
    align-items: stretch;
  }

  .showcase-compact a {
    display: inline-flex;
    margin-top: 7px;
    min-height: 28px;
    align-items: center;
    justify-content: center;
    padding: 5px 10px;
    border-radius: 999px;
    border: 1px solid var(--sendio-border);
    background: #ffffff;
    color: var(--sendio-text);
    text-decoration: none;
    font-size: 10px;
    font-weight: 900;
  }

  .showcase-thumb {
    aspect-ratio: 1 / 1;
    border-radius: 15px;
    border: 1px solid var(--sendio-border);
    overflow: hidden;
    background: #f8fafc;
    cursor: pointer;
  }

  .showcase-thumb video,
  .showcase-thumb :global(.showcase-image) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
  }

  .branches-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 8px;
  }

  .branches-grid article {
    border-radius: 15px;
    border: 1px solid var(--sendio-border);
    background: var(--sendio-soft);
    padding: 9px 10px;
    min-width: 0;
  }

  .branches-grid span {
    color: var(--sendio-muted);
    font-size: 9px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .branches-grid strong {
    display: block;
    margin-top: 4px;
    color: var(--sendio-text);
    font-size: 12px;
    font-weight: 900;
  }

  .branches-grid p {
    min-height: 16px;
    margin: 4px 0 0;
    color: var(--sendio-muted);
    font-size: 11px;
    font-weight: 700;
  }

  .branches-grid a {
    display: inline-flex;
    margin-top: 6px;
    min-height: 25px;
    align-items: center;
    justify-content: center;
    padding: 4px 9px;
    border-radius: 999px;
    border: 1px solid var(--sendio-border);
    background: #ffffff;
    color: var(--sendio-text);
    text-decoration: none;
    font-size: 10px;
    font-weight: 900;
  }

  .locked-box {
    border: 1px dashed var(--sendio-border);
    border-radius: 15px;
    background: var(--sendio-soft);
    padding: 9px;
  }

  .locked-box p {
    margin: 0 0 7px;
  }

  .sendio-strip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 12px;
    padding: 13px;
    border-radius: 22px;
    border: 1px solid var(--sendio-border);
    background: var(--sendio-hero-bg);
  }

  .sendio-strip p {
    margin: 0;
    color: var(--sendio-text);
    font-size: 13px;
    font-weight: 900;
  }

  .sendio-strip div {
    display: flex;
    gap: 7px;
  }

  .sendio-strip a {
    min-height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px 11px;
    border-radius: 999px;
    border: 1px solid var(--sendio-border);
    background: #ffffff;
    color: var(--sendio-text);
    text-decoration: none;
    font-size: 11px;
    font-weight: 900;
  }

  .media-lightbox {
    position: fixed;
    inset: 0;
    z-index: 120;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    background: transparent;
    backdrop-filter: none;
  }

  .media-lightbox-content {
    position: relative;
    box-sizing: border-box;
    flex: 0 0 auto;
    max-width: calc(100vw - 36px);
    max-height: calc(100vh - 36px);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 28px;
    background: #050505;
    padding: 10px;
    box-shadow: 0 28px 90px rgba(0, 0, 0, 0.48);
    overflow: hidden;
    transition: width 0.18s ease, height 0.18s ease;
  }

  .media-lightbox-content.is-loading {
    width: min(520px, calc(100vw - 36px), calc(100vh - 36px));
    aspect-ratio: 1 / 1;
  }

  .lightbox-media-stage {
    position: relative;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 20px;
    background: #000000;
  }

  .lightbox-media-stage :global(.lightbox-video),
  .lightbox-media-stage :global(.lightbox-image) {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #000000;
  }

  .lightbox-close {
    position: absolute;
    right: 14px;
    top: 14px;
    z-index: 3;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.94);
    color: #111827;
    font-size: 23px;
    font-weight: 900;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
  }

  .unlock-toast {
    position: fixed;
    left: 50%;
    bottom: 22px;
    z-index: 50;
    transform: translateX(-50%);
    width: min(520px, calc(100% - 28px));
    border: 1px solid var(--sendio-border);
    border-radius: 22px;
    background: #ffffff;
    padding: 14px;
    box-shadow: 0 18px 50px rgba(17, 24, 39, 0.18);
  }

  .unlock-toast p {
    margin: 0 0 10px;
    color: var(--sendio-muted);
    font-size: 13px;
    font-weight: 800;
  }

  .unlock-toast div {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .unlock-toast a,
  .unlock-toast button {
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 7px 12px;
    border-radius: 999px;
    border: 1px solid var(--sendio-border);
    background: var(--sendio-soft);
    color: var(--sendio-text);
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .state-shell {
    min-height: 70vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 14px;
  }

  .state-box {
    border: 1px solid var(--sendio-border);
    border-radius: 24px;
    background: #ffffff;
    padding: 28px;
    text-align: center;
    color: var(--sendio-muted);
    font-size: 14px;
    font-weight: 800;
  }

  .state-box h1 {
    margin-bottom: 12px;
    font-size: 24px;
  }


  @media (max-width: 980px) {
    .hero {
      grid-template-columns: 124px minmax(0, 1fr);
    }

    .hero-side {
      grid-column: 1 / -1;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }

    .profile-card-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

  }

  @media (max-width: 640px) {
    .public-company-page {
      padding: 18px 11px 46px;
    }

    .top-navigation {
      justify-content: center;
    }

    .hero {
      grid-template-columns: 1fr;
      text-align: center;
      padding: 14px;
      gap: 13px;
    }

    .hero-title-row,
    .hero-meta {
      justify-content: center;
    }

    .hero-side {
      flex-direction: column;
    }

    .profile-card-grid {
      grid-template-columns: 1fr;
    }

    .profile-card-grid .card {
      height: auto;
      max-height: none;
      min-height: 240px;
    }

    .showcase-compact {
      grid-template-columns: 1fr;
    }

    .showcase-thumb {
      width: 86px;
      justify-self: center;
    }

    .sendio-strip {
      align-items: flex-start;
      flex-direction: column;
    }
  }


  @media (max-width: 1180px) {
    .profile-card-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 900px) {
    .hero {
      grid-template-columns: 1fr;
      text-align: center;
    }

    .hero-title-row,
    .hero-meta {
      justify-content: center;
    }

    .profile-card-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .public-company-page {
      padding: 14px 10px 36px;
    }

    .profile-card-grid {
      grid-template-columns: 1fr;
    }

    .profile-grid-card {
      height: auto;
      max-height: none;
    }

    .sendio-strip {
      align-items: stretch;
      flex-direction: column;
    }
  }
  @media (max-width: 640px) {
    .media-lightbox {
      padding: 0;
      align-items: center;
      background: #000000;
    }

    .media-lightbox-content,
    .media-lightbox-content.is-loading {
      width: 100vw !important;
      height: 100dvh !important;
      max-width: none;
      max-height: none;
      aspect-ratio: auto;
      border: 0;
      border-radius: 0;
      padding: 0;
      box-shadow: none;
    }

    .lightbox-media-stage {
      border-radius: 0;
    }

    .lightbox-close {
      right: 12px;
      top: 12px;
      width: 38px;
      height: 38px;
    }
  }
`;