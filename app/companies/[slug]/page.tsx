'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import {
  FaEnvelope,
  FaFacebookF,
  FaGlobe,
  FaInstagram,
  FaLinkedinIn,
  FaPhone,
  FaWhatsapp,
} from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { supabase } from '@/lib/supabase';

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
  if (value === 'not_available') return 'Not Available';

  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDate(value: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getVideoEmbedUrl(value: string | null) {
  if (!value) return null;

  const url = normalizeUrl(value);

  if (!url) return null;

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname.includes('youtube.com')) {
      const videoId = parsedUrl.searchParams.get('v');

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    if (parsedUrl.hostname.includes('youtu.be')) {
      const videoId = parsedUrl.pathname.replace('/', '');

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    if (parsedUrl.hostname.includes('vimeo.com')) {
      const videoId = parsedUrl.pathname.replace('/', '');

      if (videoId) {
        return `https://player.vimeo.com/video/${videoId}`;
      }
    }

    return url;
  } catch {
    return null;
  }
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

export default function PublicCompanyPage() {
  const params = useParams();
  const slugParam = params?.slug;
  const slug = Array.isArray(slugParam)
    ? slugParam[0]
    : String(slugParam ?? '');

  const [company, setCompany] = useState<Company | null>(null);
  const [services, setServices] = useState<CompanyService[]>([]);
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
  const [routeStart, setRouteStart] = useState('');
  const [routeMessage, setRouteMessage] = useState<string | null>(null);

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

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);

  const currentUserReview = currentUser
    ? reviews.find((review) => review.user_id === currentUser.id) ?? null
    : null;

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

    loadAuthState();

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

    loadCompanyPage();

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

    const cleanChannel = sourceChannel.trim() || 'sendio';
    const readableChannel =
      cleanChannel.charAt(0).toUpperCase() + cleanChannel.slice(1);

    const { error } = await supabase.from('company_messages').insert({
      company_id: company.id,
      client_id: currentUser.id,
      name: getClientContactName(),
      email: getClientContactEmail(),
      message: `Client attempted to contact this company by ${readableChannel}.`,
      status: 'new',
      company_seen: false,
      admin_seen: false,
      is_archived: false,
      moderation_status: 'normal',
      source_channel: cleanChannel,
      source_url: sourceUrl,
      event_type: 'contact_click',
    });

    return !error;
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

  function renderProtectedLink(
    label: string,
    url: string | null,
    message: string,
    sourceChannel: string
  ) {
    if (!url) return null;

    return (
      <button
        type="button"
        className={!isLoggedIn ? 'locked-action' : undefined}
        onClick={() =>
          handleProtectedContactClick(url, message, sourceChannel)
        }
      >
        {label}
      </button>
    );
  }

  function renderProtectedIconButton(
    label: string,
    url: string | null,
    message: string,
    sourceChannel: string,
    icon: ReactNode
  ) {
    if (!url) return null;

    return (
      <button
        type="button"
        className={`contact-icon-button ${!isLoggedIn ? 'locked-action' : ''}`}
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

    const { error } = await supabase.from('company_messages').insert({
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
    });

    setMessageSending(false);

    if (error) {
      setMessageStatus(
        'Message could not be sent. Please try another contact option.'
      );
      return;
    }

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
      clientProfile?.full_name?.trim() || currentUser.email?.split('@')[0] || 'User';

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
    if (!companyLocation) return '';

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

  function openDirections(travelmode: string) {
    const cleanOrigin = routeStart.trim();
    const destination = getCompanyLocationAddress();

    if (!cleanOrigin) {
      setRouteMessage('Please enter your starting point.');
      return;
    }

    if (!destination) return;

    setRouteMessage(null);

    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      cleanOrigin
    )}&destination=${encodeURIComponent(destination)}&travelmode=${travelmode}`;

    window.open(url, '_blank', 'noopener,noreferrer');
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
  const introVideoUrl = getVideoEmbedUrl(company?.intro_video ?? null);
  const createdDate = formatDate(company?.created_at ?? null);
  const statusLabel = formatStatus(company?.status ?? null);
  const imageGalleryItems = gallery
    .filter((item) => item.type?.toLowerCase() !== 'video')
    .slice(0, 12);
  const profileImageSlots = Array.from(
    { length: 12 },
    (_, index) => imageGalleryItems[index] ?? null
  );
  const profileVideos = gallery
    .filter((item) => item.type?.toLowerCase() === 'video')
    .slice(0, 12);
  const profileVideoSlots = Array.from(
    { length: 12 },
    (_, index) => profileVideos[index] ?? null
  );
  const whatsappDisplay =
    socialLinks?.whatsapp?.trim() && !socialLinks.whatsapp.startsWith('http')
      ? socialLinks.whatsapp.trim()
      : company?.phone?.trim() ?? null;
  const companyLocationAddress = getCompanyLocationAddress();
  const companyLocationMapUrl = companyLocationAddress
    ? `https://www.google.com/maps?q=${encodeURIComponent(
        companyLocationAddress
      )}&output=embed`
    : null;
  const showcaseCtaUrl = companyShowcase?.cta_url?.trim() || null;
  const activeShowcaseMedia = showcaseMedia[0] ?? null;
  const hasPublicShowcase = Boolean(companyShowcase);
  const hasPublicLocation = Boolean(
    companyLocation && companyLocationAddress && companyLocationMapUrl
  );
  const publicBranchNumbers = [1, 2, 3, 4, 5, 6];
  const publicBranchRows = publicBranchNumbers.map((branchNumber) => {
    const branch =
      companyBranches.find((item) => item.branch_number === branchNumber) ??
      null;

    return { branchNumber, branch };
  });
  const hasPublicBranches = companyBranches.some((branch) =>
    Boolean(
      branch.country?.trim() ||
        branch.city?.trim() ||
        branch.specialty?.trim() ||
        branch.website_url?.trim()
    )
  );

  if (loading) {
    return (
      <main className="public-company-page">
        <div className="top-navigation">
          <Link href="/" className="back-home-button">
            Back to Home
          </Link>
        </div>

        <div className="state-box">Loading company profile...</div>

        <style jsx>{`
          .public-company-page {
            min-height: 100vh;
            background: #ffffff;
            color: #111827;
            padding: 24px 18px 30px;
            font-family: Arial, sans-serif;
          }

          .top-navigation {
            max-width: 1180px;
            margin: 0 auto 18px;
          }

          .back-home-button {
            display: inline-flex;
            align-items: center;
            text-decoration: none;
            color: #111827;
            background: #eef6ff;
            border: 1px solid #dbeafe;
            padding: 9px 14px;
            border-radius: 12px;
            font-weight: 800;
          }

          .state-box {
            max-width: 900px;
            margin: 80px auto;
            background: white;
            border: 1px solid #dbeafe;
            border-radius: 18px;
            padding: 30px;
            text-align: center;
            color: #374151;
          }
        `}</style>
      </main>
    );
  }

  if (notFound || !company) {
    return (
      <main className="public-company-page">
        <div className="top-navigation">
          <Link href="/" className="back-home-button">
            Back to Home
          </Link>
        </div>

        <div className="state-box">
          <h1>Company not found</h1>
          <Link href="/" className="back-link">
            Back to Home
          </Link>
        </div>

        <style jsx>{`
          .public-company-page {
            min-height: 100vh;
            background: #ffffff;
            color: #111827;
            padding: 24px 18px 30px;
            font-family: Arial, sans-serif;
          }

          .top-navigation {
            max-width: 1180px;
            margin: 0 auto 18px;
          }

          .back-home-button {
            display: inline-flex;
            align-items: center;
            text-decoration: none;
            color: #111827;
            background: #eef6ff;
            border: 1px solid #dbeafe;
            padding: 9px 14px;
            border-radius: 12px;
            font-weight: 800;
          }

          .state-box {
            max-width: 900px;
            margin: 80px auto;
            background: white;
            border: 1px solid #dbeafe;
            border-radius: 18px;
            padding: 30px;
            text-align: center;
            color: #374151;
          }

          .back-link {
            display: inline-block;
            margin-top: 15px;
            text-decoration: none;
            color: #111827;
            background: #eef6ff;
            border: 1px solid #dbeafe;
            padding: 9px 14px;
            border-radius: 12px;
            font-weight: 700;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="public-company-page">
      <div className="top-navigation">
        <Link href="/" className="back-home-button">
          Back to Home
        </Link>
      </div>

      <section className="hero">
        <div className="hero-content">
          <div className="logo-box">
            {company.logo ? (
              <Image
                src={company.logo}
                alt={`${company.name} logo`}
                width={160}
                height={160}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                sizes="160px"
              />
            ) : (
              <span>{company.name.charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className="company-main-info">
            <p className="eyebrow">Company Profile</p>
            <h1>{company.name}</h1>
            <p>{company.category || company.city || 'Registered Sendio company'}</p>
          </div>

          <div className="cover-box">
            {company.cover ? (
              <Image
                src={company.cover}
                alt={`${company.name} cover`}
                width={420}
                height={150}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                sizes="(max-width: 768px) 100vw, 420px"
              />
            ) : (
              <span>{company.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
        </div>
      </section>

      <section className="quick-info" aria-label="Company quick info">
        {statusLabel ? <div><strong>Status</strong><span>{statusLabel}</span></div> : null}
        {company.city ? <div><strong>City</strong><span>{company.city}</span></div> : null}
        <div><strong>Rating</strong><span>{company.rating !== null ? Number(company.rating).toFixed(1) : 'New'}</span></div>
        <div><strong>Reviews</strong><span>{company.reviews_count ?? reviews.length}</span></div>
        {company.category ? <div><strong>Category</strong><span>{company.category}</span></div> : null}
      </section>

      <section className="content-grid">
        <div className="main-column">
          {company.description ? (
            <section className="card">
              <h2 className="section-title">About</h2>
              <div className="content-rectangle">
                <p>{company.description}</p>
              </div>
            </section>
          ) : null}

          {introVideoUrl ? (
            <section className="card">
              <h2 className="section-title">Intro Video</h2>
              <div className="video-box">
                <iframe
                  src={introVideoUrl}
                  title={`${company.name} intro video`}
                  allowFullScreen
                />
              </div>
            </section>
          ) : null}

          {services.length > 0 ? (
            <section className="card">
              <h2 className="section-title">Services</h2>
              <div className="compact-list">
                {services.map((service) => (
                  <article key={service.id} className="item-card">
                    <h3>{service.title}</h3>
                    {service.description ? <p>{service.description}</p> : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {projects.length > 0 ? (
            <section className="card">
              <h2 className="section-title">Projects</h2>
              <div className="compact-list">
                {projects.map((project) => (
                  <article key={project.id} className="item-card">
                    <h3>{project.title}</h3>
                    {project.description ? <p>{project.description}</p> : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {articles.length > 0 ? (
            <section className="card">
              <h2 className="section-title">Articles</h2>
              <div className="articles-list">
                {articles.map((article) => (
                  <article key={article.id} className="article-card">
                    <h3>{article.title}</h3>
                    <p>{article.content}</p>

                    {article.created_at ? (
                      <small>{formatDate(article.created_at)}</small>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

        </div>

        <aside className="side-column">
          <section className="card contact-company-card">
            <h2 className="section-title">Company Details</h2>

            <div className="details-list">
              {statusLabel ? (
                <div className="detail-pill">
                  <span>Status</span>
                  <strong>{statusLabel}</strong>
                </div>
              ) : null}

              {company.city ? (
                <div className="detail-pill">
                  <span>City</span>
                  <strong>{company.city}</strong>
                </div>
              ) : null}

              {company.phone ? (
                <div className="detail-pill">
                  <span>Phone</span>
                  <strong>{company.phone}</strong>
                  {renderProtectedIconButton(
                    'Open phone',
                    phoneUrl,
                    'Sign in to unlock calls.',
                    'phone',
                    <FaPhone />
                  )}
                </div>
              ) : null}

              {company.email ? (
                <div className="detail-pill">
                  <span>Email</span>
                  <strong>Email</strong>
                  {renderProtectedIconButton(
                    'Open email',
                    emailUrl,
                    'Sign in to unlock email.',
                    'email',
                    <FaEnvelope />
                  )}
                </div>
              ) : null}

              {websiteUrl ? (
                <div className="detail-pill">
                  <span>Website</span>
                  <strong>Website</strong>
                  {renderProtectedIconButton(
                    'Open website',
                    websiteUrl,
                    'Sign in to unlock this website link.',
                    'website',
                    <FaGlobe />
                  )}
                </div>
              ) : null}

              {whatsappUrl ? (
                <div className="detail-pill">
                  <span>WhatsApp</span>
                  <strong>{whatsappDisplay || 'WhatsApp'}</strong>
                  {renderProtectedIconButton(
                    'Open WhatsApp',
                    whatsappUrl,
                    'Sign in to unlock WhatsApp.',
                    'whatsapp',
                    <FaWhatsapp />
                  )}
                </div>
              ) : null}

              {facebookUrl ? (
                <div className="detail-pill icon-only-pill">
                  <span>Facebook</span>
                  {renderProtectedIconButton(
                    'Open Facebook',
                    facebookUrl,
                    'Sign in to unlock Facebook.',
                    'facebook',
                    <FaFacebookF />
                  )}
                </div>
              ) : null}

              {instagramUrl ? (
                <div className="detail-pill icon-only-pill">
                  <span>Instagram</span>
                  {renderProtectedIconButton(
                    'Open Instagram',
                    instagramUrl,
                    'Sign in to unlock Instagram.',
                    'instagram',
                    <FaInstagram />
                  )}
                </div>
              ) : null}

              {linkedinUrl ? (
                <div className="detail-pill icon-only-pill">
                  <span>LinkedIn</span>
                  {renderProtectedIconButton(
                    'Open LinkedIn',
                    linkedinUrl,
                    'Sign in to unlock LinkedIn.',
                    'linkedin',
                    <FaLinkedinIn />
                  )}
                </div>
              ) : null}

              {xUrl ? (
                <div className="detail-pill icon-only-pill">
                  <span>X</span>
                  {renderProtectedIconButton(
                    'Open X',
                    xUrl,
                    'Sign in to unlock X.',
                    'x',
                    <FaXTwitter />
                  )}
                </div>
              ) : null}

              {company.address ? (
                <div className="detail-pill">
                  <span>Address</span>
                  <strong>{company.address}</strong>
                </div>
              ) : null}

              {company.working_hours ? (
                <div className="detail-pill">
                  <span>Working Hours</span>
                  <strong>{company.working_hours}</strong>
                </div>
              ) : null}

              {createdDate ? (
                <div className="detail-pill">
                  <span>Joined</span>
                  <strong>{createdDate}</strong>
                </div>
              ) : null}

              {isLoggedIn && company.connections !== null ? (
                <div className="detail-pill">
                  <span>Connections</span>
                  <strong>{company.connections}</strong>
                </div>
              ) : null}
            </div>
          </section>

          {features.length > 0 ? (
            <section className="card">
              <h2 className="section-title">Features</h2>
              <ul className="features-list">
                {features.map((feature) => (
                  <li key={feature.id}>{feature.title}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="card">
            <h2 className="section-title">Contact Company</h2>

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
                  rows={5}
                />

                <button type="submit" disabled={messageSending}>
                  {messageSending ? 'Sending...' : 'Send Message'}
                </button>

                {messageStatus ? (
                  <p className="message-status">{messageStatus}</p>
                ) : null}
              </form>
            ) : (
              <div className="locked-contact-box">
                <p>Sign in to contact this company.</p>

                <button
                  type="button"
                  onClick={() =>
                    showLockedMessage('Register to contact this company.')
                  }
                >
                  Unlock Contact
                </button>
              </div>
            )}
          </section>

        </aside>

        {hasPublicBranches ? (
          <section className="public-branches-section">
            <h2 className="section-title">Branches & Partners</h2>

            <div className="public-branches-shell">
              <div className="public-branches-stack">
                {publicBranchRows.map(({ branchNumber, branch }) => {
                  const country = branch?.country?.trim() ?? '';
                  const city = branch?.city?.trim() ?? '';
                  const specialty = branch?.specialty?.trim() ?? '';
                  const branchUrl = normalizeUrl(branch?.website_url ?? null);

                  return (
                    <div key={branchNumber} className="public-branch-row">
                      <div className="public-branch-label">
                        Branch {branchNumber}
                      </div>

                      <span
                        className={`public-branch-field ${
                          country ? 'public-branch-field-filled' : ''
                        }`}
                      >
                        {country || 'Country'}
                      </span>

                      <span
                        className={`public-branch-field ${
                          city ? 'public-branch-field-filled' : ''
                        }`}
                      >
                        {city || 'City'}
                      </span>

                      <span
                        className={`public-branch-field ${
                          specialty ? 'public-branch-field-filled' : ''
                        }`}
                      >
                        {specialty || 'Specialty'}
                      </span>

                      {branchUrl ? (
                        <a
                          href={branchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="public-branch-field public-branch-field-filled"
                        >
                          Link
                        </a>
                      ) : (
                        <span className="public-branch-field">Link</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {hasPublicLocation || companyShowcase ? (
          <section className="public-tools-layout">
            {hasPublicLocation ? (
              <section className="public-tool-card location-public-card">
                <h2 className="section-title">Location & Directions</h2>

                <p>{companyLocationAddress}</p>

                {companyLocation?.directions_note ? (
                  <p>{companyLocation.directions_note}</p>
                ) : null}

                <div className="location-map-box">
                  <iframe
                    src={companyLocationMapUrl ?? ''}
                    title={`${company.name} location map`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>

                <div className="route-form">
                  <input
                    type="text"
                    value={routeStart}
                    onChange={(event) => {
                      setRouteStart(event.target.value);
                      setRouteMessage(null);
                    }}
                    placeholder="Your starting point"
                  />

                  {routeMessage ? (
                    <p className="route-message">{routeMessage}</p>
                  ) : null}

                  <div className="route-buttons">
                    {[
                      ['Car', 'driving'],
                      ['Taxi', 'driving'],
                      ['Bus', 'transit'],
                      ['Train', 'transit'],
                      ['Walk', 'walking'],
                      ['Bike', 'bicycling'],
                    ].map(([label, travelmode]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => openDirections(travelmode)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {companyShowcase ? (
              <section className="public-tool-card showcase-public-card">
                <div className="showcase-heading-row">
                  <span className="showcase-type-badge">
                    {getShowcaseTypeLabel(companyShowcase.showcase_type)}
                  </span>
                  <h2 className="section-title">Company Showcase</h2>
                </div>

                <div className="showcase-public-body">
                  <div className="showcase-public-text">
                    <h3>{companyShowcase.title}</h3>

                    {companyShowcase.description ? (
                      <p>{companyShowcase.description}</p>
                    ) : null}

                    {companyShowcase.cta_text && showcaseCtaUrl ? (
                      <a href={showcaseCtaUrl} target="_blank" rel="noreferrer">
                        {companyShowcase.cta_text}
                      </a>
                    ) : null}
                  </div>

                  {activeShowcaseMedia ? (
                    <div className="showcase-single-media-box">
                      {activeShowcaseMedia.media_type === 'video' ? (
                        <video
                          src={activeShowcaseMedia.media_url}
                          poster={activeShowcaseMedia.thumbnail_url ?? undefined}
                          controls
                          preload="metadata"
                        />
                      ) : (
                        <Image
                          src={activeShowcaseMedia.media_url}
                          alt={activeShowcaseMedia.alt_text || companyShowcase.title}
                          width={520}
                          height={300}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center',
                          }}
                          sizes="(max-width: 900px) 100vw, 520px"
                        />
                      )}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}
          </section>
        ) : null}
      </section>

      <section className="lower-media-layout" aria-label="Profile media and reviews">
        <section className="card media-panel">
          <h2 className="section-title">Profile Images</h2>
          <div className="profile-media-grid">
            {profileImageSlots.map((item, index) => (
              <div
                key={item?.id ?? `profile-image-slot-${index}`}
                className="profile-media-box"
              >
                {item ? (
                  <Image
                    src={item.url}
                    alt={`${company.name} profile image`}
                    width={220}
                    height={220}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    sizes="(max-width: 900px) 33vw, 120px"
                  />
                ) : (
                  <span>Image</span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="card reviews-panel">
          <h2 className="section-title">{currentUserReview ? 'Update Your Review' : 'Add a Review'}</h2>

          {isLoggedIn ? (
            <form onSubmit={handleSubmitReview} className="review-form compact-review-form lower-review-form">
              <div className="star-rating" aria-label="Review rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className={`star-button ${
                      reviewRating >= star ? 'star-button-active' : ''
                    }`}
                    aria-label={`${star} star${star > 1 ? 's' : ''}`}
                  >
                    ★
                  </button>
                ))}

                <span className="rating-value">{reviewRating}/5</span>
              </div>

              <textarea
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                placeholder="Write a short comment..."
                rows={2}
              />

              <button type="submit" disabled={reviewSubmitting} className="review-submit-button">
                {reviewSubmitting
                  ? 'Saving...'
                  : currentUserReview
                    ? 'Update Review'
                    : 'Submit Review'}
              </button>

              {reviewStatus ? (
                <p className="review-status">{reviewStatus}</p>
              ) : null}
            </form>
          ) : (
            <div className="locked-contact-box lower-review-form">
              <p>Sign in to add a rating and review.</p>

              <button
                type="button"
                onClick={() =>
                  showLockedMessage('Register to add a rating and review.')
                }
              >
                Unlock Reviews
              </button>
            </div>
          )}

          <div className="reviews-column-heading">Reviews</div>

          {reviews.length > 0 ? (
            <div className="reviews-list">
              {reviews.map((review) => (
                <article key={review.id} className="review-card">
                  <div className="review-header">
                    <strong>{review.user_name}</strong>
                    <span>{getStars(review.rating)}</span>
                  </div>

                  {review.comment ? <p className="review-comment">{review.comment}</p> : null}

                  {review.created_at ? (
                    <small className="review-date">{formatDate(review.created_at)}</small>
                  ) : null}

                  {review.user_id === currentUser?.id ? (
                    <div className="review-actions">
                      <button
                        type="button"
                        onClick={() => handleDeleteReview(review.id)}
                      >
                        delete
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="review-card">
              <div className="review-header">
                <strong>Values</strong>
                <span>☆☆☆☆☆</span>
              </div>
              <p className="review-comment">No reviews yet.</p>
            </div>
          )}
        </section>

        <section className="card media-panel">
          <h2 className="section-title">Profile Videos</h2>
          <div className="profile-media-grid">
            {profileVideoSlots.map((item, index) => (
              <div
                key={item?.id ?? `profile-video-slot-${index}`}
                className="profile-media-box"
              >
                {item ? (
                  <video src={item.url} controls preload="metadata" />
                ) : (
                  <span>Video</span>
                )}
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="sendio-welcome">
        <div className="welcome-message">
          <p className="eyebrow">SENDIO</p>
          <h2>Built to connect opportunity</h2>
          <p>
            All Sendio services are free. Sendio is an intermediary platform
            that connects clients, companies, workers, and job seekers to
            create better opportunities and support a dignified working life.
          </p>

          <div className="welcome-actions">
            <Link href="/register">Join Sendio</Link>
            <Link href="/services">Explore Services</Link>
          </div>
        </div>

        <Image
          src="/logo.png"
          alt="Sendio logo"
          width={180}
          height={180}
          className="welcome-logo"
          sizes="180px"
        />
      </section>

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

      <style jsx>{`
        .public-company-page {
          --sendio-page-bg: #ffffff;
          --sendio-hero-bg: #e8e1f1;
          --sendio-button-bg: #eef6ff;
          --sendio-button-bg-hover: #e3efff;
          --sendio-border: #dbeafe;
          --sendio-text: #111827;
          --sendio-muted: #374151;
          --sendio-radius: 12px;
          min-height: 100vh;
          background: var(--sendio-page-bg);
          color: var(--sendio-text);
          font-family: Arial, sans-serif;
          padding: 44px 20px 70px;
          overflow-x: hidden;
        }

        .top-navigation,
        .hero,
        .quick-info,
        .content-grid,
        .public-tools-layout,
        .lower-media-layout,
        .sendio-welcome {
          max-width: 1180px;
          margin-left: auto;
          margin-right: auto;
        }

        .top-navigation {
          margin-bottom: 14px;
          padding: 0;
        }

        .back-home-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 32px;
          padding: 7px 12px;
          border-radius: var(--sendio-radius);
          color: var(--sendio-text);
          background: var(--sendio-button-bg);
          border: 1px solid var(--sendio-border);
          text-decoration: none;
          font-size: 12px;
          font-weight: 900;
          box-shadow: none;
        }

        .hero {
          min-height: 167px;
          background: var(--sendio-hero-bg);
          border: 1px solid var(--sendio-border);
          border-radius: 30px;
          padding: 18px 28px;
          box-shadow: 0 18px 44px rgba(17, 24, 39, 0.08);
        }

        .hero-content {
          display: grid;
          grid-template-columns: 86px minmax(0, 1fr) minmax(220px, 420px);
          align-items: center;
          gap: 18px;
          padding: 0;
          margin-top: 0;
        }

        .logo-box {
          width: 86px;
          height: 86px;
          border-radius: 22px;
          background: #ffffff;
          border: 1px solid var(--sendio-border);
          color: var(--sendio-text);
          box-shadow: none;
          font-size: 34px;
          font-weight: 900;
        }

        .company-main-info {
          background: transparent;
          border: 0;
          border-radius: 0;
          padding: 0;
          box-shadow: none;
          min-width: 0;
        }

        .eyebrow {
          margin: 0 0 8px;
          color: var(--sendio-muted);
          font-size: 10px;
          letter-spacing: 0.18em;
          font-weight: 900;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          color: var(--sendio-text);
          font-size: clamp(24px, 3.4vw, 36px);
          line-height: 1.05;
          letter-spacing: 0;
        }

        .company-main-info p:not(.eyebrow) {
          max-width: 620px;
          margin: 10px 0 0;
          color: var(--sendio-muted);
          font-size: 14px;
          line-height: 1.45;
          font-weight: 700;
        }

        .cover-box {
          height: 132px;
          min-width: 0;
          overflow: hidden;
          border-radius: 22px;
          border: 1px solid var(--sendio-border);
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--sendio-muted);
          font-size: 42px;
          font-weight: 900;
        }

        .quick-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 320px));
          justify-content: center;
          gap: 12px;
          margin-top: 18px;
        }

        .quick-info div,
        .detail-pill {
          width: 320px;
          max-width: 100%;
          height: 44px;
          border-radius: 22px;
          background: var(--sendio-button-bg);
          border: 1px solid var(--sendio-border);
          color: var(--sendio-text);
          padding: 0 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          box-shadow: none;
        }

        .quick-info strong,
        .detail-pill span {
          color: var(--sendio-muted);
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .quick-info span,
        .detail-pill strong {
          color: var(--sendio-text);
          font-size: 13px;
          font-weight: 900;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .content-grid {
          margin-top: 24px;
          padding: 0;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          column-gap: 22px;
          row-gap: 20px;
          align-items: start;
        }

        .main-column,
        .side-column {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }

        .main-column,
        .public-branches-section {
          grid-column: 1;
        }

        .side-column {
          grid-column: 2;
          grid-row: 1 / span 2;
        }

        .card {
          background: #ffffff;
          border: 1px solid var(--sendio-border);
          border-radius: 22px;
          padding: 18px;
          box-shadow: 0 14px 34px rgba(17, 24, 39, 0.06);
          min-width: 0;
        }

        .section-title {
          display: inline-flex;
          align-items: center;
          min-height: 34px;
          margin: 0 0 14px;
          padding: 7px 14px;
          background: var(--sendio-button-bg);
          border: 1px solid var(--sendio-border);
          border-radius: 22px;
          color: var(--sendio-text);
          font-size: 13px;
          font-weight: 900;
          line-height: 1;
        }

        .content-rectangle,
        .item-card,
        .article-card {
          width: 530px;
          max-width: 100%;
          min-height: 65px;
          border: 1px solid var(--sendio-border);
          background: #ffffff;
          border-radius: var(--sendio-radius);
          padding: 14px;
        }

        .card p,
        .item-card p,
        .article-card p {
          color: var(--sendio-muted);
          line-height: 1.55;
          font-size: 14px;
        }

        .compact-list,
        .articles-list,
        .reviews-list,
        .details-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .item-card h3,
        .article-card h3 {
          margin: 0 0 6px;
          color: var(--sendio-text);
          font-size: 15px;
        }

        .video-box {
          border-radius: 18px;
          background: #ffffff;
          border: 1px solid var(--sendio-border);
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .gallery-item {
          height: 118px;
          border-radius: var(--sendio-radius);
          overflow: hidden;
          background: #f8fafc;
          border: 1px solid var(--sendio-border);
        }

        .gallery-item video,
        .gallery-item img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #f8fafc;
        }

        .details-list div {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .contact-icon-button {
          width: 30px;
          height: 30px;
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--sendio-border);
          border-radius: 50%;
          background: #ffffff;
          color: var(--sendio-text);
          cursor: pointer;
          font-size: 13px;
        }

        .contact-icon-button.locked-action {
          opacity: 0.72;
        }

        .icon-only-pill {
          justify-content: space-between;
        }

        .features-list {
          gap: 10px;
        }

        .features-list li {
          width: 320px;
          max-width: 100%;
          min-height: 44px;
          border-radius: 22px;
          background: var(--sendio-button-bg);
          border: 1px solid var(--sendio-border);
          color: var(--sendio-text);
          padding: 12px 14px;
          font-size: 13px;
        }

        .review-card {
          border: 1px solid var(--sendio-border);
          background: #ffffff;
          border-radius: var(--sendio-radius);
          padding: 10px;
        }

        .review-header {
          margin-bottom: 6px;
        }

        .review-header strong {
          color: var(--sendio-text);
          font-size: 13px;
        }

        .review-header span {
          color: #f59e0b;
          font-size: 12px;
          letter-spacing: 0;
        }

        .review-comment {
          width: 320px;
          max-width: 100%;
          min-height: 44px;
          margin: 0;
          padding: 12px 14px;
          border-radius: 22px;
          border: 1px solid var(--sendio-border);
          background: var(--sendio-button-bg);
          color: var(--sendio-text);
          font-size: 13px;
          line-height: 1.35;
        }

        .review-date {
          display: inline-flex;
          margin-top: 8px;
          padding: 5px 9px;
          border-radius: 10px;
          background: #dcfce7;
          color: #166534;
          font-size: 11px;
          font-weight: 900;
        }

        .review-actions {
          margin-top: 6px;
        }

        .review-actions button {
          padding: 3px 7px;
          border-radius: 8px;
          background: #fff1f2;
          color: #be123c;
          font-size: 10px;
          text-transform: lowercase;
        }

        .compact-review-form,
        .locked-contact-box {
          border: 1px solid var(--sendio-border);
          background: #ffffff;
          border-radius: var(--sendio-radius);
        }

        .review-form .star-button {
          border-color: var(--sendio-border);
          color: #cbd5e1;
        }

        .review-form .star-button-active {
          color: #f59e0b;
          background: var(--sendio-button-bg);
          border-color: var(--sendio-border);
        }

        .review-form textarea,
        .message-form input,
        .message-form textarea {
          border: 1px solid var(--sendio-border);
          background: #ffffff;
          color: var(--sendio-text);
          border-radius: var(--sendio-radius);
        }

        .review-submit-button,
        .message-form button,
        .locked-contact-box button,
        .unlock-toast a,
        .unlock-toast button {
          border: 1px solid var(--sendio-border);
          background: var(--sendio-button-bg);
          color: var(--sendio-text);
          border-radius: var(--sendio-radius);
          box-shadow: none;
        }

        .profile-video-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .profile-video-box {
          aspect-ratio: 1 / 1;
          border-radius: var(--sendio-radius);
          border: 1px solid var(--sendio-border);
          background: #f8fafc;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--sendio-muted);
          font-size: 11px;
          font-weight: 900;
        }

        .profile-video-box video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #f8fafc;
        }

        .lower-media-layout {
          margin-top: 35px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 400px) minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }

        .media-panel,
        .reviews-panel {
          min-width: 0;
        }

        .profile-media-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          padding: 10px;
          border: 1px solid var(--sendio-border);
          border-radius: 18px;
          background: #f8fafc;
        }

        .profile-media-box {
          aspect-ratio: 1 / 1;
          border-radius: var(--sendio-radius);
          border: 1px solid var(--sendio-border);
          background: #ffffff;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--sendio-muted);
          font-size: 11px;
          font-weight: 900;
          min-width: 0;
        }

        .profile-media-box video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #ffffff;
        }

        .reviews-panel {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .reviews-panel .section-title {
          width: 100%;
          max-width: 400px;
          min-height: 51px;
          justify-content: center;
          margin-bottom: 0;
        }

        .lower-review-form {
          width: 100%;
          max-width: 400px;
          padding: 12px;
        }

        .reviews-column-heading {
          display: inline-flex;
          align-items: center;
          align-self: flex-start;
          min-height: 30px;
          padding: 6px 12px;
          border-radius: 18px;
          border: 1px solid var(--sendio-border);
          background: var(--sendio-button-bg);
          color: var(--sendio-muted);
          font-size: 12px;
          font-weight: 900;
        }

        .reviews-panel .reviews-list {
          gap: 8px;
        }

        .reviews-panel .review-card {
          width: 100%;
          max-width: 400px;
        }

        .sendio-welcome {
          margin-top: 24px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 180px;
          align-items: center;
          gap: 28px;
          padding: 26px 30px;
          border-radius: 30px;
          background: #e8e1f1;
        }

        .welcome-message {
          min-width: 0;
          padding: 20px;
          border: 1px solid var(--sendio-border);
          border-radius: 24px;
          background: #eef6ff;
        }

        .welcome-message h2 {
          margin: 0;
          color: var(--sendio-text);
          font-size: clamp(24px, 3vw, 34px);
          line-height: 1.08;
        }

        .welcome-message p:not(.eyebrow) {
          max-width: 760px;
          margin: 12px 0 0;
          color: var(--sendio-muted);
          font-size: 14px;
          line-height: 1.6;
          font-weight: 700;
        }

        .welcome-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 16px;
        }

        .welcome-actions a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 36px;
          padding: 9px 14px;
          border-radius: var(--sendio-radius);
          border: 1px solid var(--sendio-border);
          background: #ffffff;
          color: var(--sendio-text);
          text-decoration: none;
          font-size: 12px;
          font-weight: 900;
        }

        .welcome-logo {
          width: 180px;
          height: 180px;
          object-fit: contain;
          border: 0;
          filter: drop-shadow(0 18px 30px rgba(17, 24, 39, 0.14));
        }

        .unlock-toast {
          border-color: var(--sendio-border);
          color: var(--sendio-text);
        }

        .unlock-toast p,
        .locked-contact-box p,
        .message-status,
        .review-status,
        .rating-value {
          color: var(--sendio-muted);
        }

        .public-tools-layout {
          grid-column: 1 / -1;
          margin-top: 0;
          width: 100%;
          max-width: 100%;
          margin-left: 0;
          margin-right: 0;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 35px;
          align-items: stretch;
        }

        .public-tool-card {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
          background: #ffffff;
          border: 1px solid var(--sendio-border);
          border-radius: 22px;
          padding: 18px;
          box-shadow: 0 14px 34px rgba(17, 24, 39, 0.06);
        }

        .public-tool-card h3 {
          margin: 0 0 8px;
          color: var(--sendio-text);
          font-size: 17px;
          line-height: 1.25;
        }

        .public-tool-card p {
          margin: 0 0 12px;
          color: var(--sendio-muted);
          font-size: 14px;
          line-height: 1.55;
        }

        .public-tool-card a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 36px;
          margin-top: 12px;
          padding: 9px 14px;
          border-radius: var(--sendio-radius);
          border: 1px solid var(--sendio-border);
          background: var(--sendio-button-bg);
          color: var(--sendio-text);
          text-decoration: none;
          font-size: 12px;
          font-weight: 900;
        }

        .public-tool-card a:hover {
          background: var(--sendio-button-bg-hover);
        }

        .showcase-type-badge {
          display: inline-flex;
          align-items: center;
          min-height: 26px;
          margin-bottom: 10px;
          padding: 5px 10px;
          border-radius: 18px;
          background: #dcfce7;
          color: #166534;
          font-size: 11px;
          font-weight: 900;
        }

        .showcase-public-card {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          height: 578px;
          display: flex;
          flex-direction: column;
        }

        .showcase-heading-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .showcase-heading-row .section-title {
          margin-bottom: 0;
        }

        .showcase-public-body {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 12px;
          align-items: center;
          flex: 1;
        }

        .showcase-public-text {
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }

        .showcase-single-media-box {
          width: 100%;
          max-width: 100%;
          height: 380px;
          overflow: hidden;
          border: 1px solid var(--sendio-border);
          border-radius: 22px;
          background: #f8fafc;
        }

        .showcase-single-media-box img,
        .showcase-single-media-box video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
          background: #f8fafc;
        }

        .location-public-card,
        .public-branches-section {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          background: #ffffff;
          border: 1px solid var(--sendio-border);
          border-radius: 22px;
          padding: 18px;
          box-shadow: 0 14px 34px rgba(17, 24, 39, 0.06);
          min-width: 0;
        }

        .location-public-card {
          height: 578px;
          display: flex;
          flex-direction: column;
        }

        .contact-company-card .message-form {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .contact-company-card .message-form textarea {
          min-height: 76px;
          height: 76px;
          resize: vertical;
        }

        .location-map-box {
          width: 100%;
          flex: 1;
          min-height: 300px;
          height: auto;
          overflow: hidden;
          border-radius: 22px;
          border: 1px solid var(--sendio-border);
          background: #f8fafc;
        }

        .location-map-box iframe {
          width: 100%;
          height: 100%;
          border: 0;
        }

        .route-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 12px;
        }

        .route-form input {
          min-height: 40px;
          border: 1px solid var(--sendio-border);
          background: #ffffff;
          color: var(--sendio-text);
          border-radius: var(--sendio-radius);
          padding: 9px 12px;
          font-size: 13px;
        }

        .route-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .route-buttons button {
          min-height: 34px;
          padding: 7px 12px;
          border: 1px solid var(--sendio-border);
          border-radius: var(--sendio-radius);
          background: var(--sendio-button-bg);
          color: var(--sendio-text);
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .route-buttons button:hover {
          background: var(--sendio-button-bg-hover);
        }

        .route-message {
          margin: -2px 0 0;
          color: var(--sendio-muted);
          font-size: 12px;
          font-weight: 800;
        }

        .public-branches-shell {
          width: 100%;
          overflow: visible;
          background: #e8e1f1;
          border-radius: 22px;
          padding: 14px;
        }

        .public-branches-stack {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .public-branch-row {
          display: grid;
          grid-template-columns: 62px repeat(4, minmax(0, 1fr));
          gap: 6px;
          align-items: center;
        }

        .public-branch-label,
        .public-branch-field {
          height: 32px;
          min-width: 0;
          border-radius: 16px;
          font-size: 9px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .public-branch-label {
          background: #f8f7ff;
          color: #9ca3af;
        }

        .public-branch-field {
          border: 1px solid var(--sendio-border);
          background: #eaf9ea;
          color: var(--sendio-text);
          text-decoration: none;
        }

        .public-branch-field-filled {
          background: #4ec7f5;
        }

        @media (max-width: 900px) {
          .hero-content {
            grid-template-columns: 72px minmax(0, 1fr);
          }

          .cover-box {
            grid-column: 1 / -1;
            width: 100%;
          }

          .content-grid {
            grid-template-columns: 1fr;
          }

          .main-column,
          .side-column,
          .public-branches-section,
          .public-tools-layout {
            grid-column: 1;
          }

          .side-column {
            grid-row: auto;
          }

          .public-tools-layout {
            grid-column: 1;
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .location-public-card,
          .showcase-public-card {
            height: auto;
          }

          .showcase-single-media-box {
            height: 240px;
          }

          .location-map-box {
            flex: none;
            height: 230px;
          }

          .public-branch-row {
            grid-template-columns: 1fr;
          }

          .public-branch-label,
          .public-branch-field {
            width: 100%;
          }

          .lower-media-layout {
            grid-template-columns: 1fr;
          }

          .sendio-welcome {
            grid-template-columns: 1fr;
            justify-items: center;
            text-align: left;
          }
        }

        @media (max-width: 620px) {
          .public-company-page {
            padding: 24px 14px 50px;
          }

          .hero {
            padding: 18px;
          }

          .quick-info {
            grid-template-columns: 1fr;
          }

          .quick-info div,
          .detail-pill,
          .features-list li {
            width: 100%;
          }

          .gallery-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .profile-media-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 6px;
            padding: 8px;
          }

          .sendio-welcome {
            padding: 18px;
          }

          .welcome-message {
            padding: 16px;
          }

          .welcome-logo {
            width: 140px;
            height: 140px;
          }
        }
      `}</style>
    </main>
  );
}
