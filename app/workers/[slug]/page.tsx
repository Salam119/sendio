'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type WorkerProfile = {
  id: string;
  user_id: string | null;
  name: string;
  slug: string | null;
  profession: string | null;
  description: string | null;
  avatar: string | null;
  cover: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  whatsapp: string | null;
  status: string | null;
  working_hours: string | null;
  experience_years: number | null;
  views: number | null;
  requests_count: number | null;
  rating: number | null;
  reviews_count: number | null;
  created_at: string | null;
};

type WorkerService = {
  id: string;
  worker_id: string | null;
  title: string;
  description: string | null;
  price: string | null;
};

type WorkerSkill = {
  id: string;
  worker_id: string | null;
  title: string;
};

type WorkerGalleryItem = {
  id: string;
  worker_id: string | null;
  url: string;
  type: string | null;
  created_at: string | null;
};

type WorkerSocialLinks = {
  id: string;
  worker_id: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  x: string | null;
  website: string | null;
};

type WorkerReview = {
  id: string;
  worker_id: string | null;
  user_id: string | null;
  user_name: string;
  rating: number;
  comment: string | null;
  created_at: string | null;
};

type ContactChannel =
  | 'whatsapp'
  | 'phone'
  | 'email'
  | 'website'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'x';

type ContactItem = {
  channel: ContactChannel;
  label: string;
  icon: string;
  url: string | null;
  displayValue: string | null;
  lockedMessage: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

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
  if (value === 'unavailable') return 'Unavailable';

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
    month: 'short',
    day: 'numeric',
  });
}

function getStars(rating: number) {
  const safeRating = Math.max(0, Math.min(5, Math.round(rating)));
  return '★'.repeat(safeRating) + '☆'.repeat(5 - safeRating);
}

function formatProfileNumber(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';

  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export default function PublicWorkerProfilePage() {
  const params = useParams();
  const slugParam = params?.slug;
  const slug = Array.isArray(slugParam)
    ? slugParam[0]
    : String(slugParam ?? '');

  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [services, setServices] = useState<WorkerService[]>([]);
  const [skills, setSkills] = useState<WorkerSkill[]>([]);
  const [gallery, setGallery] = useState<WorkerGalleryItem[]>([]);
  const [socialLinks, setSocialLinks] = useState<WorkerSocialLinks | null>(
    null
  );
  const [reviews, setReviews] = useState<WorkerReview[]>([]);

  const [contactClicksCount, setContactClicksCount] = useState<number | null>(
    null
  );
  const [revealedContact, setRevealedContact] = useState<ContactChannel | null>(
    null
  );

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [unlockNotice, setUnlockNotice] = useState<string | null>(null);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [requestName, setRequestName] = useState('');
  const [requestEmail, setRequestEmail] = useState('');
  const [requestPhone, setRequestPhone] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestSending, setRequestSending] = useState(false);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);

  const isLoggedIn = Boolean(currentUserId);

  const currentUserReview = currentUserId
    ? reviews.find((review) => review.user_id === currentUserId) ?? null
    : null;

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (!user) {
        setCurrentUserId(null);
        setCurrentUserName('');
        setCurrentUserEmail('');
        return;
      }

      setCurrentUserId(user.id);
      setCurrentUserEmail(user.email ?? '');

      let name =
        typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name.trim()
          : '';

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (profileData?.full_name?.trim()) {
        name = profileData.full_name.trim();
      }

      if (!name && user.email) {
        name = user.email.split('@')[0];
      }

      setCurrentUserName(name || 'User');
    }

    loadCurrentUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session?.user) {
          setCurrentUserId(null);
          setCurrentUserName('');
          setCurrentUserEmail('');
          return;
        }

        setCurrentUserId(session.user.id);
        setCurrentUserEmail(session.user.email ?? '');

        let name =
          typeof session.user.user_metadata?.full_name === 'string'
            ? session.user.user_metadata.full_name.trim()
            : '';

        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileData?.full_name?.trim()) {
          name = profileData.full_name.trim();
        }

        if (!name && session.user.email) {
          name = session.user.email.split('@')[0];
        }

        setCurrentUserName(name || 'User');
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadWorkerProfile() {
      if (!slug) {
        setLoading(false);
        setNotFound(true);
        return;
      }

      setLoading(true);
      setNotFound(false);
      setContactClicksCount(null);
      setRevealedContact(null);

      let workerData: WorkerProfile | null = null;

      if (isUuid(slug)) {
        const { data: workerById } = await supabase
          .from('workers')
          .select('*')
          .eq('id', slug)
          .maybeSingle();

        if (workerById) {
          workerData = workerById as WorkerProfile;
        }

        if (!workerData) {
          const { data: workerByUserId } = await supabase
            .from('workers')
            .select('*')
            .eq('user_id', slug)
            .maybeSingle();

          if (workerByUserId) {
            workerData = workerByUserId as WorkerProfile;
          }
        }

        if (!workerData) {
          const { data: workerBySlug } = await supabase
            .from('workers')
            .select('*')
            .eq('slug', slug)
            .maybeSingle();

          if (workerBySlug) {
            workerData = workerBySlug as WorkerProfile;
          }
        }
      } else {
        const { data: workerBySlug } = await supabase
          .from('workers')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (workerBySlug) {
          workerData = workerBySlug as WorkerProfile;
        }
      }

      if (!isMounted) return;

      if (!workerData) {
        setWorker(null);
        setLoading(false);
        setNotFound(true);
        return;
      }

      const selectedWorker = workerData;

      setWorker(selectedWorker);

      const [
        servicesResult,
        skillsResult,
        galleryResult,
        socialLinksResult,
        reviewsResult,
        contactClicksResult,
      ] = await Promise.all([
        supabase
          .from('worker_services')
          .select('*')
          .eq('worker_id', selectedWorker.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('worker_skills')
          .select('*')
          .eq('worker_id', selectedWorker.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('worker_gallery')
          .select('*')
          .eq('worker_id', selectedWorker.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('worker_social_links')
          .select('*')
          .eq('worker_id', selectedWorker.id)
          .maybeSingle(),

        supabase
          .from('worker_reviews')
          .select('*')
          .eq('worker_id', selectedWorker.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('worker_requests')
          .select('id', { count: 'exact', head: true })
          .eq('worker_id', selectedWorker.id)
          .eq('event_type', 'contact_click'),
      ]);

      if (!isMounted) return;

      setServices((servicesResult.data ?? []) as WorkerService[]);
      setSkills((skillsResult.data ?? []) as WorkerSkill[]);
      setGallery((galleryResult.data ?? []) as WorkerGalleryItem[]);
      setSocialLinks(
        (socialLinksResult.data as WorkerSocialLinks | null) ?? null
      );
      setReviews((reviewsResult.data ?? []) as WorkerReview[]);
      setContactClicksCount(
        contactClicksResult.error ? null : contactClicksResult.count ?? 0
      );
      setLoading(false);
    }

    loadWorkerProfile();

    return () => {
      isMounted = false;
    };
  }, [slug]);

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

  function showLockedMessage(message = 'Sign in to unlock this feature.') {
    setRevealedContact(null);
    setUnlockNotice(message);
  }

  async function ensureClientRecord(
    userId: string,
    fullName: string,
    email: string
  ) {
    await supabase.from('clients').upsert(
      {
        user_id: userId,
        full_name: fullName || null,
        email: email || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  }

  function openContactUrl(url: string) {
    const isExternalUrl =
      url.startsWith('http://') || url.startsWith('https://');

    if (isExternalUrl) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    window.location.assign(url);
  }

  async function handleContactClick(
    label: string,
    url: string,
    channel: ContactChannel
  ) {
    if (!worker) return;

    if (!currentUserId) {
      showLockedMessage('Sign in to unlock this feature.');
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      showLockedMessage('Sign in to unlock this feature.');
      return;
    }

    const clientName =
      currentUserName.trim() ||
      (typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name.trim()
        : '') ||
      user.email?.split('@')[0] ||
      'User';

    const clientEmail = currentUserEmail.trim() || user.email || '';

    if (!clientEmail) {
      setUnlockNotice('Your account email is missing. Please update your profile.');
      return;
    }

    await ensureClientRecord(user.id, clientName, clientEmail);

    const { error } = await supabase.from('worker_requests').insert({
      worker_id: worker.id,
      client_id: user.id,
      name: clientName,
      email: clientEmail,
      phone: null,
      message: `Client attempted to contact this worker by ${label}.`,
      status: 'new',
      worker_seen: false,
      admin_seen: false,
      is_archived: false,
      moderation_status: 'normal',
      source_channel: channel,
      source_url: url,
      event_type: 'contact_click',
    });

    if (!error) {
      setContactClicksCount((currentCount) =>
        typeof currentCount === 'number' ? currentCount + 1 : currentCount
      );
    }

    setRevealedContact(channel);
    openContactUrl(url);
  }

  async function refreshWorkerReviews(workerId: string) {
    const [workerResult, reviewsResult] = await Promise.all([
      supabase.from('workers').select('*').eq('id', workerId).maybeSingle(),

      supabase
        .from('worker_reviews')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false }),
    ]);

    if (workerResult.data) {
      setWorker(workerResult.data as WorkerProfile);
    }

    if (reviewsResult.data) {
      setReviews(reviewsResult.data as WorkerReview[]);
    }
  }

  async function handleSendRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!worker || requestSending) return;

    if (!currentUserId) {
      showLockedMessage('Register to request this service.');
      return;
    }

    setRequestStatus(null);

    const cleanName = requestName.trim();
    const cleanEmail = requestEmail.trim();
    const cleanPhone = requestPhone.trim();
    const cleanMessage = requestMessage.trim();

    if (!cleanName || !cleanEmail || !cleanMessage) {
      setRequestStatus('Please fill in your name, email, and message.');
      return;
    }

    setRequestSending(true);

    await ensureClientRecord(currentUserId, cleanName, cleanEmail);

    const { error } = await supabase.from('worker_requests').insert({
      worker_id: worker.id,
      client_id: currentUserId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone || null,
      message: cleanMessage,
      status: 'new',
      worker_seen: false,
      admin_seen: false,
      is_archived: false,
      moderation_status: 'normal',
      source_channel: 'sendio',
      source_url: null,
      event_type: 'request',
    });

    setRequestSending(false);

    if (error) {
      setRequestStatus(
        'Request could not be sent. Please try another contact option.'
      );
      return;
    }

    setWorker((currentWorker) =>
      currentWorker
        ? {
            ...currentWorker,
            requests_count:
              typeof currentWorker.requests_count === 'number'
                ? currentWorker.requests_count + 1
                : 1,
          }
        : currentWorker
    );

    setRequestName('');
    setRequestEmail('');
    setRequestPhone('');
    setRequestMessage('');
    setRequestStatus('Request sent successfully.');
  }

  async function handleSubmitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!worker || reviewSubmitting) return;

    if (!currentUserId) {
      showLockedMessage('Register to add a rating and review.');
      return;
    }

    if (reviewRating < 1 || reviewRating > 5) {
      setReviewStatus('Rating must be between 1 and 5.');
      return;
    }

    const cleanComment = reviewComment.trim();
    const cleanUserName = currentUserName.trim() || 'User';

    setReviewSubmitting(true);
    setReviewStatus(null);

    const existingReview = reviews.find(
      (review) => review.user_id === currentUserId
    );

    const reviewPayload = {
      user_name: cleanUserName,
      rating: reviewRating,
      comment: cleanComment || null,
    };

    const { error } = existingReview
      ? await supabase
          .from('worker_reviews')
          .update(reviewPayload)
          .eq('id', existingReview.id)
          .eq('user_id', currentUserId)
      : await supabase.from('worker_reviews').insert({
          worker_id: worker.id,
          user_id: currentUserId,
          ...reviewPayload,
        });

    setReviewSubmitting(false);

    if (error) {
      setReviewStatus(error.message);
      return;
    }

    await refreshWorkerReviews(worker.id);

    setReviewStatus(
      existingReview
        ? 'Review updated successfully.'
        : 'Review added successfully.'
    );
  }

  async function handleDeleteReview(reviewId: string) {
    if (!worker) return;

    if (!currentUserId) {
      showLockedMessage('Sign in to manage your review.');
      return;
    }

    const confirmed = window.confirm('Delete your review?');

    if (!confirmed) return;

    setReviewStatus(null);

    const { error } = await supabase
      .from('worker_reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', currentUserId);

    if (error) {
      setReviewStatus(error.message);
      return;
    }

    setReviewRating(5);
    setReviewComment('');
    await refreshWorkerReviews(worker.id);
    setReviewStatus('Review deleted successfully.');
  }

  const websiteUrl =
    normalizeUrl(worker?.website ?? null) ??
    normalizeUrl(socialLinks?.website ?? null);

  const whatsappUrl = getWhatsappUrl(worker?.whatsapp ?? null);
  const phoneUrl = getPhoneUrl(worker?.phone ?? null);
  const emailUrl = getMailUrl(worker?.email ?? null);

  const facebookUrl = normalizeUrl(socialLinks?.facebook ?? null);
  const instagramUrl = normalizeUrl(socialLinks?.instagram ?? null);
  const linkedinUrl = normalizeUrl(socialLinks?.linkedin ?? null);
  const xUrl = normalizeUrl(socialLinks?.x ?? null);

  const statusLabel = formatStatus(worker?.status ?? null);
  const createdDate = formatDate(worker?.created_at ?? null);
  const featuredMedia = gallery[0] ?? null;
  const compactServices = services.slice(0, 4);
  const visibleSkills = skills.slice(0, 6);
  const ratingValue =
    typeof worker?.rating === 'number' && !Number.isNaN(worker.rating)
      ? worker.rating
      : 0;
  const isAvailable = worker?.status === 'available';

  const contactItems: ContactItem[] = [
    {
      channel: 'phone',
      label: 'Phone',
      icon: '☎',
      url: phoneUrl,
      displayValue: worker?.phone ?? null,
      lockedMessage: 'Sign in to unlock calls.',
    },
    {
      channel: 'email',
      label: 'Email',
      icon: '✉',
      url: emailUrl,
      displayValue: worker?.email ?? null,
      lockedMessage: 'Sign in to unlock email.',
    },
    {
      channel: 'whatsapp',
      label: 'WhatsApp',
      icon: '◉',
      url: whatsappUrl,
      displayValue: worker?.whatsapp ?? null,
      lockedMessage: 'Sign in to unlock WhatsApp.',
    },
    {
      channel: 'website',
      label: 'Website',
      icon: '⌂',
      url: websiteUrl,
      displayValue: websiteUrl,
      lockedMessage: 'Sign in to unlock this website link.',
    },
    {
      channel: 'facebook',
      label: 'Facebook',
      icon: 'f',
      url: facebookUrl,
      displayValue: facebookUrl,
      lockedMessage: 'Sign in to unlock Facebook.',
    },
    {
      channel: 'instagram',
      label: 'Instagram',
      icon: '◎',
      url: instagramUrl,
      displayValue: instagramUrl,
      lockedMessage: 'Sign in to unlock Instagram.',
    },
    {
      channel: 'linkedin',
      label: 'LinkedIn',
      icon: 'in',
      url: linkedinUrl,
      displayValue: linkedinUrl,
      lockedMessage: 'Sign in to unlock LinkedIn.',
    },
    {
      channel: 'x',
      label: 'X',
      icon: '𝕏',
      url: xUrl,
      displayValue: xUrl,
      lockedMessage: 'Sign in to unlock X.',
    },
  ];

  const activeContactItems = contactItems.filter((item) => item.url);
  const selectedContactItem =
    contactItems.find((item) => item.channel === revealedContact) ?? null;

  function renderContactIcon(item: ContactItem) {
    if (!item.url) return null;

    return (
      <button
        key={item.channel}
        type="button"
        className={`contact-icon-button ${
          !isLoggedIn ? 'contact-icon-locked' : ''
        }`}
        aria-label={item.label}
        title={item.label}
        onClick={() => {
          if (!item.url) return;

          if (!isLoggedIn) {
            showLockedMessage(item.lockedMessage);
            return;
          }

          handleContactClick(item.label, item.url, item.channel);
        }}
      >
        <span>{item.icon}</span>
      </button>
    );
  }

  if (loading) {
    return (
      <main className="public-worker-page">
        <div className="top-navigation">
          <Link href="/" className="back-home-button">
            ← Back to Home
          </Link>
        </div>

        <div className="state-box">Loading worker profile...</div>

        <style jsx>{`
          .public-worker-page {
            min-height: 100vh;
            background: #ffffff;
            color: #111827;
            padding: 24px 18px 30px;
            font-family: Arial, sans-serif;
          }

          .top-navigation {
            max-width: 1060px;
            margin: 0 auto 16px;
          }

          .back-home-button {
            display: inline-flex;
            align-items: center;
            text-decoration: none;
            color: #1d4ed8;
            background: #eef6ff;
            border: 1px solid #dbeafe;
            padding: 10px 16px;
            border-radius: 999px;
            font-weight: 800;
          }

          .state-box {
            max-width: 760px;
            margin: 70px auto;
            background: #ffffff;
            border: 1px solid #dbeafe;
            border-radius: 18px;
            padding: 28px;
            text-align: center;
            color: #374151;
          }
        `}</style>
      </main>
    );
  }

  if (notFound || !worker) {
    return (
      <main className="public-worker-page">
        <div className="top-navigation">
          <Link href="/" className="back-home-button">
            ← Back to Home
          </Link>
        </div>

        <div className="state-box">
          <h1>Worker not found</h1>
          <Link href="/" className="back-link">
            Back to Home
          </Link>
        </div>

        <style jsx>{`
          .public-worker-page {
            min-height: 100vh;
            background: #ffffff;
            color: #111827;
            padding: 24px 18px 30px;
            font-family: Arial, sans-serif;
          }

          .top-navigation {
            max-width: 1060px;
            margin: 0 auto 16px;
          }

          .back-home-button,
          .back-link {
            display: inline-flex;
            align-items: center;
            text-decoration: none;
            color: #1d4ed8;
            background: #eef6ff;
            border: 1px solid #dbeafe;
            padding: 10px 16px;
            border-radius: 999px;
            font-weight: 800;
          }

          .state-box {
            max-width: 760px;
            margin: 70px auto;
            background: #ffffff;
            border: 1px solid #dbeafe;
            border-radius: 18px;
            padding: 28px;
            text-align: center;
            color: #374151;
          }

          .back-link {
            margin-top: 15px;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="public-worker-page">
      <div className="top-navigation">
        <Link href="/" className="back-home-button">
          ← Back to Home
        </Link>
      </div>

      <section className="worker-hero">
        <div className="hero-left">
          <div className="avatar-zone">
            <div className="avatar-box">
              {worker.avatar ? (
                <Image
                  src={worker.avatar}
                  alt={`${worker.name} avatar`}
                  width={170}
                  height={170}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  sizes="170px"
                  priority
                />
              ) : (
                <span>{worker.name.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div
              className={`availability-chip ${
                isAvailable ? 'availability-on' : 'availability-off'
              }`}
            >
              <span />
              {isAvailable ? 'Available' : 'Unavailable'}
            </div>
          </div>

          <div className="hero-main-info">
            <p className="city-line">{worker.city || 'Local worker'}</p>
            <h1>{worker.name}</h1>

            <div className="profession-line">
              {worker.profession ? <span>{worker.profession}</span> : null}
              {statusLabel ? <span>{statusLabel}</span> : null}
            </div>

            <div className="rating-strip" aria-label="Worker rating">
              <span>{getStars(ratingValue)}</span>
            </div>

            <div className="hero-stats">
              <div className="hero-stat">
                <span className="stat-icon">👁</span>
                <small>Views</small>
                <strong>{formatProfileNumber(worker.views)}</strong>
              </div>

              <div className="hero-stat">
                <span className="stat-icon">☎</span>
                <small>Contacts</small>
                <strong>{formatProfileNumber(contactClicksCount)}</strong>
              </div>

              <div className="hero-stat">
                <span className="stat-icon">💼</span>
                <small>Requests</small>
                <strong>{formatProfileNumber(worker.requests_count)}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-message">
          <span className="hero-badge">Sendio Worker</span>
          <h2>Ready to help you with trusted local service.</h2>
          <p>
            Review the profile, choose a contact icon, and connect when you are
            ready.
          </p>
        </div>
      </section>

      {activeContactItems.length > 0 ? (
        <section className="contact-zone">
          <div className="contact-strip">
            {activeContactItems.map((item) => renderContactIcon(item))}
          </div>

          {selectedContactItem?.displayValue && isLoggedIn ? (
            <div className="contact-reveal-panel">
              <span>{selectedContactItem.label}</span>
              <strong>{selectedContactItem.displayValue}</strong>
              <button type="button" onClick={() => setRevealedContact(null)}>
                Close
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="content-grid">
        <div className="main-column">
          {featuredMedia ? (
            <section className="card featured-card">
              <div className="section-heading compact-heading">
                <h2>Achievements</h2>
              </div>

              <div className="featured-media-frame">
                {featuredMedia.type === 'video' ? (
                  <video src={featuredMedia.url} controls />
                ) : (
                  <Image
                    src={featuredMedia.url}
                    alt={`${worker.name} achievement`}
                    width={774}
                    height={348}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    sizes="387px"
                  />
                )}
              </div>
            </section>
          ) : null}

          {compactServices.length > 0 ? (
            <section className="card services-card">
              <div className="section-heading compact-heading">
                <h2>Services</h2>
              </div>

              <div className="compact-services-list">
                {compactServices.map((service) => (
                  <article key={service.id} className="service-pill">
                    <span>{service.title}</span>
                    {service.price ? <strong>{service.price}</strong> : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {visibleSkills.length > 0 ? (
            <section className="card skills-card">
              <div className="section-heading compact-heading">
                <h2>Skills</h2>
              </div>

              <div className="compact-skills-list">
                {visibleSkills.map((skill) => (
                  <span key={skill.id}>{skill.title}</span>
                ))}
              </div>
            </section>
          ) : null}

          <section className="card compact-reviews-card">
            <div className="section-heading compact-heading">
              <h2>Reviews</h2>
            </div>

            {isLoggedIn ? (
              <form onSubmit={handleSubmitReview} className="compact-review-form">
                <div className="small-star-picker" aria-label="Review rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className={reviewRating >= star ? 'star-active' : ''}
                      aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <textarea
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  placeholder="Write a short comment..."
                  rows={2}
                />

                <div className="review-form-footer">
                  <button type="submit" disabled={reviewSubmitting}>
                    {reviewSubmitting
                      ? 'Saving...'
                      : currentUserReview
                        ? 'Update'
                        : 'Add'}
                  </button>

                  {reviewStatus ? <p>{reviewStatus}</p> : null}
                </div>
              </form>
            ) : (
              <div className="login-review-box">
                <p>Sign in to add a rating and review.</p>

                <button
                  type="button"
                  onClick={() =>
                    showLockedMessage('Register to rate and review this worker.')
                  }
                >
                  Unlock
                </button>
              </div>
            )}

            <div className="compact-reviews-list">
              {reviews.map((review) => (
                <article key={review.id} className="compact-review-card">
                  <div className="compact-review-top">
                    <strong>{review.user_name}</strong>

                    <span>{getStars(review.rating)}</span>

                    {review.created_at ? (
                      <small>{formatDate(review.created_at)}</small>
                    ) : null}
                  </div>

                  {review.comment ? <p>{review.comment}</p> : null}

                  {review.user_id === currentUserId ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteReview(review.id)}
                      className="delete-review-button"
                    >
                      Delete
                    </button>
                  ) : null}
                </article>
              ))}

              {reviews.length === 0 ? (
                <p className="empty-review-text">No reviews yet.</p>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="side-column">
          <section className="card request-card">
            <div className="section-heading">
              <h2>Request Service</h2>
            </div>

            {isLoggedIn ? (
              <form onSubmit={handleSendRequest} className="request-form">
                <input
                  type="text"
                  value={requestName}
                  onChange={(event) => setRequestName(event.target.value)}
                  placeholder="Your name"
                />

                <input
                  type="email"
                  value={requestEmail}
                  onChange={(event) => setRequestEmail(event.target.value)}
                  placeholder="Your email"
                />

                <input
                  type="text"
                  value={requestPhone}
                  onChange={(event) => setRequestPhone(event.target.value)}
                  placeholder="Your phone"
                />

                <textarea
                  value={requestMessage}
                  onChange={(event) => setRequestMessage(event.target.value)}
                  placeholder="Describe what you need"
                  rows={5}
                />

                <button type="submit" disabled={requestSending}>
                  {requestSending ? 'Sending...' : 'Send Request'}
                </button>

                {requestStatus ? (
                  <p className="request-status">{requestStatus}</p>
                ) : null}
              </form>
            ) : (
              <div className="locked-request-box">
                <p>Sign in to request this service.</p>

                <button
                  type="button"
                  onClick={() =>
                    showLockedMessage('Register to request this service.')
                  }
                >
                  Unlock Request
                </button>
              </div>
            )}
          </section>

          <section className="card details-card">
            <div className="section-heading">
              <h2>Worker Details</h2>
            </div>

            <div className="details-grid">
              {worker.profession ? (
                <div>
                  <span>Profession</span>
                  <strong>{worker.profession}</strong>
                </div>
              ) : null}

              {worker.city ? (
                <div>
                  <span>City</span>
                  <strong>{worker.city}</strong>
                </div>
              ) : null}

              {worker.address ? (
                <div>
                  <span>Address</span>
                  <strong>{worker.address}</strong>
                </div>
              ) : null}

              {worker.working_hours ? (
                <div>
                  <span>Working Hours</span>
                  <strong>{worker.working_hours}</strong>
                </div>
              ) : null}

              {statusLabel ? (
                <div>
                  <span>Status</span>
                  <strong>{statusLabel}</strong>
                </div>
              ) : null}

              {worker.experience_years !== null ? (
                <div>
                  <span>Experience</span>
                  <strong>{worker.experience_years} years</strong>
                </div>
              ) : null}

              {createdDate ? (
                <div>
                  <span>Joined</span>
                  <strong>{createdDate}</strong>
                </div>
              ) : null}

              {worker.requests_count !== null ? (
                <div>
                  <span>Requests</span>
                  <strong>{worker.requests_count}</strong>
                </div>
              ) : null}
            </div>
          </section>
        </aside>
      </section>

      <footer className="worker-footer">
        <div className="footer-brand">
          <Image
            src="/logo.png"
            alt="Sendio logo"
            width={34}
            height={34}
            style={{ width: 34, height: 34, objectFit: 'contain' }}
          />
          <strong>Sendio</strong>
        </div>

        <p>
          Sendio connects clients with independent workers. Each worker is
          responsible for their own service, pricing, communication, and final
          agreement with the client.
        </p>
      </footer>

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
        .public-worker-page {
          /*
            SENDIO PUBLIC WORKER PROFILE CONTROL PANEL
            عدّل الألوان والقياسات من هنا فقط عند الحاجة.
          */

          --shell-width: 1060px;
          --page-side-padding: 18px;

          --hero-min-height: 238px;
          --hero-radius: 28px;
          --avatar-size: 108px;
          --contact-strip-height: 45px;

          --featured-media-width: 100%;
          --featured-media-height: 340px;

          --service-card-width: 335px;
          --service-card-height: 42px;

          --footer-min-height: 86px;

          --page-bg: #ffffff;
          --hero-bg: #e8e1f1;
          --soft-hero-bg: #f7f3ff;
          --card-bg: #ffffff;
          --soft-card-bg: #f8fafc;
          --button-bg: #eef6ff;
          --button-hover: #e3efff;
          --primary-blue: #2563eb;
          --primary-blue-dark: #1d4ed8;
          --border: #dbeafe;
          --text: #111827;
          --muted: #374151;
          --soft-muted: #6b7280;
          --star: #f59e0b;

          --available-bg: #dcfce7;
          --available-text: #166534;
          --available-dot: #22c55e;

          --unavailable-bg: #fee2e2;
          --unavailable-text: #991b1b;
          --unavailable-dot: #ef4444;

          min-height: 100vh;
          background: var(--page-bg);
          color: var(--text);
          font-family: Arial, sans-serif;
          padding: 18px 0 26px;
          overflow-x: hidden;
        }

        .top-navigation {
          max-width: var(--shell-width);
          margin: 0 auto 12px;
          padding: 0 var(--page-side-padding);
        }

        .back-home-button {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
          color: var(--primary-blue-dark);
          background: var(--button-bg);
          border: 1px solid var(--border);
          padding: 9px 14px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 900;
          box-shadow: 0 8px 18px rgba(37, 99, 235, 0.1);
          transition: 0.2s ease;
        }

        .back-home-button:hover {
          background: var(--button-hover);
          transform: translateY(-1px);
        }

        .worker-hero {
          width: calc(100% - var(--page-side-padding) * 2);
          max-width: var(--shell-width);
          min-height: var(--hero-min-height);
          margin: 0 auto;
          border-radius: var(--hero-radius);
          border: 1px solid var(--border);
          background: linear-gradient(
            135deg,
            var(--hero-bg),
            var(--soft-hero-bg)
          );
          box-shadow: 0 18px 38px rgba(17, 24, 39, 0.08);
          padding: 24px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 310px;
          gap: 22px;
          align-items: center;
        }

        .hero-left {
          display: flex;
          align-items: center;
          gap: 20px;
          min-width: 0;
        }

        .avatar-zone {
          width: 128px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .avatar-box {
          width: var(--avatar-size);
          height: var(--avatar-size);
          border-radius: 50%;
          background: var(--card-bg);
          border: 5px solid rgba(255, 255, 255, 0.86);
          box-shadow: 0 16px 30px rgba(17, 24, 39, 0.16);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary-blue);
          font-size: 38px;
          font-weight: 900;
        }

        .availability-chip {
          min-width: 86px;
          height: 24px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 900;
          box-shadow: 0 8px 16px rgba(17, 24, 39, 0.08);
        }

        .availability-chip span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.72);
        }

        .availability-on {
          background: var(--available-bg);
          color: var(--available-text);
        }

        .availability-on span {
          background: var(--available-dot);
        }

        .availability-off {
          background: var(--unavailable-bg);
          color: var(--unavailable-text);
        }

        .availability-off span {
          background: var(--unavailable-dot);
        }

        .hero-main-info {
          min-width: 0;
        }

        .city-line {
          margin: 0 0 5px;
          color: var(--muted);
          font-size: 13px;
          font-weight: 900;
        }

        h1 {
          margin: 0;
          color: var(--text);
          font-size: 34px;
          line-height: 1.08;
          letter-spacing: -0.8px;
        }

        .profession-line {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 8px;
        }

        .profession-line span {
          background: rgba(255, 255, 255, 0.7);
          color: var(--muted);
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 900;
        }

        .rating-strip {
          width: fit-content;
          min-height: 22px;
          margin-top: 8px;
          border-radius: 999px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          padding: 3px 9px;
          display: inline-flex;
          align-items: center;
        }

        .rating-strip span {
          color: var(--star);
          font-size: 13px;
          letter-spacing: 1px;
          line-height: 1;
        }

        .hero-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          margin-top: 13px;
        }

        .hero-stat {
          width: 68px;
          min-height: 63px;
          border-radius: 18px;
          background: var(--button-bg);
          border: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          position: relative;
        }

        .stat-icon {
          font-size: 17px;
          line-height: 1;
        }

        .hero-stat small {
          color: var(--soft-muted);
          font-size: 9px;
          font-weight: 900;
        }

        .hero-stat strong {
          min-width: 24px;
          height: 20px;
          border-radius: 999px;
          background: var(--card-bg);
          border: 1px solid var(--border);
          color: var(--text);
          font-size: 10px;
          font-weight: 900;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 5px;
        }

        .hero-message {
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.74);
          border: 1px solid var(--border);
          padding: 18px;
          min-height: 150px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          box-shadow: 0 12px 24px rgba(17, 24, 39, 0.06);
        }

        .hero-badge {
          width: fit-content;
          border-radius: 999px;
          background: var(--button-bg);
          border: 1px solid var(--border);
          color: var(--primary-blue-dark);
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 900;
        }

        .hero-message h2 {
          margin: 11px 0 6px;
          color: var(--text);
          font-size: 21px;
          line-height: 1.2;
          letter-spacing: -0.3px;
        }

        .hero-message p {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.5;
          font-weight: 700;
        }

        .contact-zone {
          width: calc(100% - var(--page-side-padding) * 2);
          max-width: var(--shell-width);
          margin: 12px auto 0;
        }

        .contact-strip {
          width: min(100%, 535px);
          min-height: var(--contact-strip-height);
          border-radius: 999px;
          background: var(--card-bg);
          border: 1px solid var(--border);
          box-shadow: 0 10px 22px rgba(37, 99, 235, 0.08);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          overflow-x: auto;
        }

        .contact-icon-button {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--button-bg);
          color: var(--primary-blue-dark);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 13px;
          font-weight: 900;
          flex: 0 0 auto;
          transition: 0.2s ease;
        }

        .contact-icon-button:hover {
          background: var(--button-hover);
          transform: translateY(-1px);
        }

        .contact-icon-button span {
          line-height: 1;
        }

        .contact-icon-locked {
          background: #f3f4f6;
          color: #6b7280;
        }

        .contact-reveal-panel {
          width: min(100%, 535px);
          margin-top: 8px;
          border-radius: 16px;
          background: var(--card-bg);
          border: 1px solid #bfdbfe;
          box-shadow: 0 10px 20px rgba(37, 99, 235, 0.08);
          padding: 9px 11px;
          display: flex;
          align-items: center;
          gap: 9px;
          overflow: hidden;
        }

        .contact-reveal-panel span {
          color: var(--soft-muted);
          font-size: 11px;
          font-weight: 900;
        }

        .contact-reveal-panel strong {
          color: var(--text);
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }

        .contact-reveal-panel button {
          border: 0;
          border-radius: 999px;
          background: var(--button-bg);
          color: var(--primary-blue-dark);
          padding: 6px 9px;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .content-grid {
          width: calc(100% - var(--page-side-padding) * 2);
          max-width: var(--shell-width);
          margin: 14px auto 0;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 330px;
          gap: 16px;
          align-items: start;
        }

        .main-column,
        .side-column {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 22px;
          padding: 15px;
          box-shadow: 0 10px 22px rgba(17, 24, 39, 0.045);
        }

        .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 11px;
        }

        .section-heading h2 {
          margin: 0;
          color: var(--text);
          font-size: 19px;
          letter-spacing: -0.3px;
        }

        .compact-heading {
          margin-bottom: 9px;
        }

        .compact-heading h2 {
          font-size: 17px;
        }

        .featured-card {
          width: 100%;
          max-width: 100%;
        }

        .featured-media-frame {
          width: 100%;
          max-width: 100%;
          height: var(--featured-media-height);
          border-radius: 18px;
          background: var(--soft-card-bg);
          border: 1px solid var(--border);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
.featured-media-frame img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
  background: var(--soft-card-bg);
}

.featured-media-frame video {
  width: auto;
  max-width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
  background: #ffffff;
}
        
        }

        .compact-services-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: min(100%, var(--service-card-width));
        }

        .service-pill {
          width: 100%;
          min-height: var(--service-card-height);
          border-radius: 15px;
          background: var(--button-bg);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 8px 11px;
          overflow: hidden;
        }

        .service-pill span {
          color: var(--text);
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .service-pill strong {
          color: var(--primary-blue);
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .compact-skills-list {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .compact-skills-list span {
          border-radius: 999px;
          background: var(--soft-card-bg);
          border: 1px solid #e5e7eb;
          color: var(--muted);
          padding: 6px 9px;
          font-size: 11px;
          font-weight: 900;
        }

        .request-card {
          position: sticky;
          top: 14px;
        }

        .request-form {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .request-form input,
        .request-form textarea {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 10px 11px;
          font-size: 13px;
          outline: none;
          color: var(--text);
          background: var(--soft-card-bg);
          resize: vertical;
        }

        .request-form input:focus,
        .request-form textarea:focus {
          border-color: var(--primary-blue);
          background: var(--card-bg);
        }

        .request-form button,
        .locked-request-box button {
          border: 0;
          background: var(--primary-blue);
          color: white;
          border-radius: 999px;
          padding: 11px 14px;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .request-form button:hover,
        .locked-request-box button:hover {
          background: var(--primary-blue-dark);
        }

        .request-form button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .request-status {
          margin: 0;
          font-size: 12px;
          color: var(--muted);
          font-weight: 800;
        }

        .locked-request-box {
          border: 1px dashed var(--border);
          background: var(--soft-card-bg);
          border-radius: 18px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 11px;
        }

        .locked-request-box p {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
          font-weight: 800;
        }

        .details-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .details-grid div {
          min-height: 47px;
          border-radius: 15px;
          background: var(--soft-card-bg);
          border: 1px solid #e5e7eb;
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 3px;
        }

        .details-grid span {
          color: var(--soft-muted);
          font-size: 10px;
          font-weight: 900;
        }

        .details-grid strong {
          color: var(--text);
          font-size: 12px;
          line-height: 1.35;
          font-weight: 900;
        }

        .compact-review-form {
          border: 1px solid var(--border);
          background: var(--soft-card-bg);
          border-radius: 16px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 10px;
        }

        .small-star-picker {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .small-star-picker button {
          width: 21px;
          height: 21px;
          border: 1px solid #fed7aa;
          border-radius: 8px;
          background: #fff7ed;
          color: #d1d5db;
          padding: 0;
          font-size: 13px;
          line-height: 1;
          cursor: pointer;
        }

        .small-star-picker button.star-active {
          color: var(--star);
        }

        .compact-review-form textarea {
          width: 100%;
          min-height: 50px;
          border: 1px solid var(--border);
          border-radius: 13px;
          padding: 9px 10px;
          font-size: 12px;
          outline: none;
          color: var(--text);
          background: var(--card-bg);
          resize: vertical;
        }

        .review-form-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .review-form-footer button,
        .login-review-box button {
          border: 0;
          background: var(--primary-blue);
          color: white;
          border-radius: 999px;
          padding: 7px 12px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .review-form-footer button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .review-form-footer p {
          margin: 0;
          color: var(--muted);
          font-size: 11px;
          font-weight: 800;
        }

        .login-review-box {
          border: 1px solid var(--border);
          background: var(--soft-card-bg);
          border-radius: 15px;
          padding: 10px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .login-review-box p {
          margin: 0;
          color: var(--muted);
          font-size: 12px;
          font-weight: 800;
        }

        .compact-reviews-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .compact-review-card {
          position: relative;
          border: 1px solid #e5e7eb;
          background: var(--soft-card-bg);
          border-radius: 15px;
          padding: 9px 10px;
        }

        .compact-review-top {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 5px;
        }

        .compact-review-top strong {
          color: var(--text);
          font-size: 12px;
          font-weight: 900;
        }

        .compact-review-top span {
          color: var(--star);
          font-size: 10px;
          letter-spacing: 0.5px;
        }

        .compact-review-top small {
          color: var(--soft-muted);
          font-size: 10px;
          font-weight: 800;
        }

        .compact-review-card p {
          margin: 0;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.45;
        }

        .delete-review-button {
          margin-top: 7px;
          border: 0;
          background: var(--unavailable-bg);
          color: #b91c1c;
          border-radius: 999px;
          padding: 5px 9px;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
        }

        .empty-review-text {
          margin: 0;
          color: var(--soft-muted);
          font-size: 12px;
          font-weight: 800;
        }

        .worker-footer {
          width: calc(100% - var(--page-side-padding) * 2);
          max-width: var(--shell-width);
          min-height: var(--footer-min-height);
          margin: 14px auto 0;
          border-radius: 22px;
          border: 1px solid var(--border);
          background: var(--soft-card-bg);
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .footer-brand {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          flex-shrink: 0;
        }

        .footer-brand strong {
          color: var(--text);
          font-size: 18px;
          font-weight: 900;
        }

        .worker-footer p {
          margin: 0;
          max-width: 690px;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.5;
          font-weight: 700;
          text-align: right;
        }

        .unlock-toast {
          position: fixed;
          right: 22px;
          bottom: 22px;
          z-index: 50;
          max-width: 360px;
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 16px;
          box-shadow: 0 18px 40px rgba(17, 24, 39, 0.16);
        }

        .unlock-toast p {
          margin: 0 0 12px;
          color: var(--muted);
          font-weight: 900;
          line-height: 1.5;
        }

        .unlock-toast div {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .unlock-toast a,
        .unlock-toast button {
          border: 0;
          text-decoration: none;
          background: var(--primary-blue);
          color: white;
          border-radius: 999px;
          padding: 9px 12px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .unlock-toast button {
          background: var(--soft-muted);
        }

        @media (max-width: 900px) {
          .worker-hero {
            grid-template-columns: 1fr;
            padding: 20px;
          }

          .hero-message {
            min-height: auto;
          }

          .content-grid {
            grid-template-columns: 1fr;
          }

          .request-card {
            position: static;
          }

          .contact-strip,
          .contact-reveal-panel {
            width: 100%;
          }

          .featured-card,
          .services-card {
            width: 100%;
          }

          .featured-media-frame,
          .compact-services-list {
            width: 100%;
            max-width: none;
          }

          .worker-footer {
            align-items: flex-start;
            flex-direction: column;
          }

          .worker-footer p {
            text-align: left;
          }
        }

        @media (max-width: 620px) {
          .public-worker-page {
            --avatar-size: 92px;
            --hero-min-height: 220px;
            --featured-media-height: 164px;
          }

          .worker-hero {
            padding: 16px;
            border-radius: 22px;
          }

          .hero-left {
            align-items: flex-start;
            flex-direction: column;
            gap: 13px;
          }

          .avatar-zone {
            width: auto;
            align-items: flex-start;
          }

          h1 {
            font-size: 28px;
          }

          .hero-stats {
            width: 100%;
          }

          .hero-stat {
            flex: 1;
            min-width: 72px;
          }

          .unlock-toast {
            right: 14px;
            left: 14px;
            bottom: 14px;
            max-width: none;
          }
        }
      `}</style>
    </main>
  );
}