'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { createSendioNotification } from '@/lib/notifications';
import { isR2MediaUrl } from '@/lib/r2-media-client';
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

type LinkedServiceCategory = {
  id: string;
  name: string;
  slug: string;
  sort_order: number | null;
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

type MediaOrientation = 'portrait' | 'landscape' | 'square';

type MediaPreviewLayout = {
  orientation: MediaOrientation;
  width: number;
  height: number;
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

type WorkerCv = {
  id: string;
  worker_id: string | null;
  cv_mode: 'manual' | 'file' | string | null;
  cv_file_url: string | null;
  cv_file_name: string | null;
  cv_file_type: string | null;
  cv_file_mime_type: string | null;
  cv_file_uploaded_at: string | null;
  first_name: string | null;
  last_name: string | null;
  age: string | number | null;
  nationality: string | null;
  profession: string | null;
  specialty: string | null;
  experience: string | null;
  work_type: string | null;
  availability: string | null;
  working_hours: string | null;
  education: string | null;
  certificates: string | null;
  licenses: string | null;
  training: string | null;
  languages: string | null;
  skills: string | null;
  tools_equipment: string | null;
  previous_work: string | null;
  work_areas: string | null;
  professional_summary: string | null;
  full_address: string | null;
  phone: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ContactChannel =
  | 'whatsapp'
  | 'phone'
  | 'email'
  | 'website'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'x'
  | 'maps';

type ContactItem = {
  channel: ContactChannel;
  label: string;
  icon: string;
  url: string | null;
  displayValue: string | null;
  lockedMessage: string;
};
  type WorkerRequestInsertResult = {
  id: string;
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

function getMapsUrl(value: string | null) {
  if (!value) return null;

  const address = value.trim();

  if (!address) return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address
  )}`;
}

function hasText(value: string | number | null | undefined) {
  if (value === null || value === undefined) return false;

  return String(value).trim().length > 0;
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

export default function PublicWorkerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const slugParam = params?.slug;
  const slug = Array.isArray(slugParam)
    ? slugParam[0]
    : String(slugParam ?? '');

  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [services, setServices] = useState<WorkerService[]>([]);
  const [linkedServiceCategories, setLinkedServiceCategories] = useState<
    LinkedServiceCategory[]
  >([]);
  const [skills, setSkills] = useState<WorkerSkill[]>([]);
  const [gallery, setGallery] = useState<WorkerGalleryItem[]>([]);
  const [socialLinks, setSocialLinks] = useState<WorkerSocialLinks | null>(
    null
  );
  const [reviews, setReviews] = useState<WorkerReview[]>([]);
  const [workerCv, setWorkerCv] = useState<WorkerCv | null>(null);
  const [isCvOpen, setIsCvOpen] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<WorkerGalleryItem | null>(null);
  const [mediaPreviewLayout, setMediaPreviewLayout] =
    useState<MediaPreviewLayout | null>(null);

  const [contactClicksCount, setContactClicksCount] = useState<number | null>(
    null
  );
  const [profileViewsCount, setProfileViewsCount] = useState<number | null>(null);
  const [workerRequestsCount, setWorkerRequestsCount] = useState<number | null>(
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

  const [manualServiceCategoryId, setManualServiceCategoryId] = useState('');

  const isLoggedIn = Boolean(currentUserId);

  const currentUserReview = currentUserId
    ? reviews.find((review) => review.user_id === currentUserId) ?? null
    : null;

  const selectedServiceCategoryId = linkedServiceCategories.some(
    (category) => category.id === manualServiceCategoryId
  )
    ? manualServiceCategoryId
    : linkedServiceCategories[0]?.id || '';

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
      setProfileViewsCount(null);
      setWorkerRequestsCount(null);
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
        setWorkerCv(null);
        setLoading(false);
        setNotFound(true);
        return;
      }

      const selectedWorker = workerData;

      setWorker(selectedWorker);

      const [
        servicesResult,
        serviceCategoryLinksResult,
        skillsResult,
        galleryResult,
        socialLinksResult,
        reviewsResult,
        contactClicksResult,
        workerRequestsResult,
        workerCvResult,
      ] = await Promise.all([
        supabase
          .from('worker_services')
          .select('*')
          .eq('worker_id', selectedWorker.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('worker_service_categories')
          .select('service_category_id')
          .eq('worker_id', selectedWorker.id),

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

        supabase
          .from('worker_requests')
          .select('id', { count: 'exact', head: true })
          .eq('worker_id', selectedWorker.id)
          .eq('event_type', 'request'),

        supabase
          .from('worker_cv')
          .select('*')
          .eq('worker_id', selectedWorker.id)
          .maybeSingle(),
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
            'WORKER LINKED SERVICE CATEGORIES ERROR:',
            linkedCategoryError
          );
        } else {
          linkedCategoryRows =
            (linkedCategoryData ?? []) as LinkedServiceCategory[];
        }
      }

      if (!isMounted) return;

      setServices((servicesResult.data ?? []) as WorkerService[]);
      setLinkedServiceCategories(linkedCategoryRows);
      setSkills((skillsResult.data ?? []) as WorkerSkill[]);
      setGallery((galleryResult.data ?? []) as WorkerGalleryItem[]);
      setSocialLinks(
        (socialLinksResult.data as WorkerSocialLinks | null) ?? null
      );
      setReviews((reviewsResult.data ?? []) as WorkerReview[]);
      setWorkerCv((workerCvResult.data as WorkerCv | null) ?? null);
      setContactClicksCount(
        contactClicksResult.error ? null : contactClicksResult.count ?? 0
      );
      setWorkerRequestsCount(
        workerRequestsResult.error
          ? selectedWorker.requests_count ?? null
          : workerRequestsResult.count ?? 0
      );

      const nextViews = (selectedWorker.views ?? 0) + 1;
      setProfileViewsCount(nextViews);
      setWorker((currentWorker) =>
        currentWorker ? { ...currentWorker, views: nextViews } : currentWorker
      );
      await supabase
        .from('workers')
        .update({ views: nextViews })
        .eq('id', selectedWorker.id);

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
      function getWorkerContactNotificationDetails(channel: ContactChannel) {
    if (channel === 'email') {
      return {
        eventType: 'worker_contact_email',
        title: 'New email contact',
      };
    }

    if (channel === 'phone') {
      return {
        eventType: 'worker_contact_phone',
        title: 'New phone contact',
      };
    }

    if (channel === 'whatsapp') {
      return {
        eventType: 'worker_contact_whatsapp',
        title: 'New WhatsApp contact',
      };
    }

    if (channel === 'maps') {
      return {
        eventType: 'worker_contact_social',
        title: 'New map contact',
      };
    }

    if (channel === 'website') {
      return {
        eventType: 'worker_contact_social',
        title: 'New website contact',
      };
    }

    return {
      eventType: 'worker_contact_social',
      title: `New ${channel} contact`,
    };
  }

  async function createWorkerContactNotification({
    requestId,
    channel,
    sourceUrl,
    messageBody,
    clientName,
    clientEmail,
  }: {
    requestId: string;
    channel: ContactChannel | 'sendio';
    sourceUrl: string | null;
    messageBody: string | null;
    clientName: string;
    clientEmail: string;
  }) {
    if (!worker?.user_id || !currentUserId) return false;

    const notificationDetails =
      channel === 'sendio'
        ? {
            eventType: 'worker_contact_message',
            title: 'New Sendio request',
          }
        : getWorkerContactNotificationDetails(channel);

    return createSendioNotification(supabase, {
      recipientId: worker.user_id,
      actorId: currentUserId,
      recipientType: 'worker',
      eventType: notificationDetails.eventType,
      sourceTable: 'worker_requests',
      sourceId: requestId,
      title: notificationDetails.title,
      body: messageBody,
      targetUrl: '/dashboard/worker/requests',
      metadata: {
        worker_id: worker.id,
        worker_name: worker.name,
        source_channel: channel,
        source_url: sourceUrl,
        client_name: clientName,
        client_email: clientEmail,
      },
    });
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

        const messageBody = `Client attempted to contact this worker by ${label}.`;

    const { data, error } = await supabase
      .from('worker_requests')
      .insert({
        worker_id: worker.id,
        client_id: user.id,
        name: clientName,
        email: clientEmail,
        phone: null,
        message: messageBody,
        status: 'new',
        worker_seen: false,
        admin_seen: false,
        is_archived: false,
        moderation_status: 'normal',
        source_channel: channel,
        source_url: url,
        event_type: 'contact_click',
      })
      .select('id')
      .maybeSingle();

    if (!error && data) {
      const insertedRequest = data as WorkerRequestInsertResult;

      await createWorkerContactNotification({
        requestId: insertedRequest.id,
        channel,
        sourceUrl: url,
        messageBody,
        clientName,
        clientEmail,
      });

      setContactClicksCount((currentCount) =>
        typeof currentCount === 'number' ? currentCount + 1 : currentCount
      );
    } else {
      setUnlockNotice(
        'Contact will open, but Sendio could not save the notification.'
      );
    }

    setRevealedContact(channel);
    openContactUrl(url);
  }

  function handleOpenServiceRequest() {
    if (!worker) return;

    if (!currentUserId) {
      showLockedMessage('Register to request this service.');
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
      providerType: 'worker',
      providerId: worker.id,
    });

    router.push(`/services/${selectedCategory.slug}?${query.toString()}`);
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

  function openMediaPreview(item: WorkerGalleryItem) {
    setMediaPreviewLayout(null);
    setPreviewMedia(item);
  }

  function closeMediaPreview() {
    setPreviewMedia(null);
    setMediaPreviewLayout(null);
  }

  function updateMediaPreviewLayout(width: number, height: number) {
    const nextLayout = createMediaPreviewLayout(width, height);

    if (nextLayout) {
      setMediaPreviewLayout(nextLayout);
    }
  }

  const websiteUrl =
    normalizeUrl(worker?.website ?? null) ??
    normalizeUrl(socialLinks?.website ?? null);

  const whatsappUrl = getWhatsappUrl(worker?.whatsapp ?? null);
  const phoneUrl = getPhoneUrl(worker?.phone ?? null);
  const emailUrl = getMailUrl(worker?.email ?? null);
  const mapsUrl = getMapsUrl(worker?.address ?? null);

  const facebookUrl = normalizeUrl(socialLinks?.facebook ?? null);
  const instagramUrl = normalizeUrl(socialLinks?.instagram ?? null);
  const linkedinUrl = normalizeUrl(socialLinks?.linkedin ?? null);
  const xUrl = normalizeUrl(socialLinks?.x ?? null);

  const statusLabel = formatStatus(worker?.status ?? null);

  const achievementMedia =
    gallery.find((item) => item.url !== worker?.avatar) ?? null;
 
const ratingValue =
  reviews.length > 0
    ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
    : typeof worker?.rating === 'number' && !Number.isNaN(worker.rating)
      ? worker.rating
      : 0;
  const isAvailable = worker?.status === 'available';
  const safeProfileViewsCount = profileViewsCount ?? worker?.views ?? 0;
  const safeWorkerRequestsCount =
    workerRequestsCount ?? worker?.requests_count ?? 0;

  const cvFileUrl = workerCv?.cv_file_url?.trim() || null;
  const cvMode = workerCv?.cv_mode ?? null;
  const manualCvRows = workerCv
    ? [
        ['Personal Information', [workerCv.first_name, workerCv.last_name].filter(Boolean).join(' ')],
        ['Age', workerCv.age],
        ['Nationality', workerCv.nationality],
        ['Profession', workerCv.profession],
        ['Specialty', workerCv.specialty],
        ['Experience', workerCv.experience],
        ['Work Type', workerCv.work_type],
        ['Availability', workerCv.availability],
        ['Working Hours', workerCv.working_hours],
        ['Education', workerCv.education],
        ['Certificates', workerCv.certificates],
        ['Licenses', workerCv.licenses],
        ['Training', workerCv.training],
        ['Languages', workerCv.languages],
        ['Skills', workerCv.skills],
        ['Tools & Equipment', workerCv.tools_equipment],
        ['Previous Work', workerCv.previous_work],
        ['Work Areas', workerCv.work_areas],
        ['Professional Summary', workerCv.professional_summary],
        ['Contact Address', workerCv.full_address],
        ['Phone', workerCv.phone],
      ].filter(([, value]) => hasText(value))
    : [];
  const hasManualCv = manualCvRows.length > 0;
  const hasFileCv = Boolean(cvFileUrl);
  const shouldShowFileCv = hasFileCv && cvMode !== 'manual';
  const shouldShowManualCv = hasManualCv && !shouldShowFileCv;
  const hasAnyCv = Boolean(shouldShowFileCv || shouldShowManualCv);

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
      channel: 'maps',
      label: 'Google Maps',
      icon: '📍',
      url: mapsUrl,
      displayValue: worker?.address ?? null,
      lockedMessage: 'Sign in to unlock Google Maps.',
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
                  unoptimized={isR2MediaUrl(worker.avatar)}
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
                <strong>{formatProfileNumber(safeProfileViewsCount)}</strong>
              </div>

              <div className="hero-stat">
                <span className="stat-icon">☎</span>
                <small>Contacts</small>
                <strong>{formatProfileNumber(contactClicksCount)}</strong>
              </div>

              <div className="hero-stat">
                <span className="stat-icon">💼</span>
                <small>Requests</small>
                <strong>{formatProfileNumber(safeWorkerRequestsCount)}</strong>
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

      <section className="worker-profile-shell refined-profile-shell">
        <div className="profile-layer profile-layer-one">
          <section className="card profile-card request-card compact-request-card">
            <div className="section-heading compact-heading">
              <h2>1. Request Service</h2>
              <span>Free request</span>
            </div>

            {isLoggedIn ? (
              linkedServiceCategories.length > 0 ? (
                <div className="request-form mini-request-form">
                  <p className="request-service-hint">
                    Choose one of this worker&apos;s linked Sendio services.
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
                <div className="locked-request-box compact-locked-box">
                  <p>
                    This worker has not linked a Sendio service category yet.
                  </p>
                </div>
              )
            ) : (
              <div className="locked-request-box compact-locked-box">
                <p>Sign in to request this worker for free.</p>

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

          <section className="card profile-card cv-card">
            <div className="section-heading compact-heading">
              <h2>2. CV</h2>
              <span>{hasAnyCv ? 'Available' : 'Waiting'}</span>
            </div>

            <div className="cv-preview-frame">
              <div className="cv-file-icon">PDF</div>
              <strong>{workerCv?.cv_file_name || 'Worker CV'}</strong>
              <span>
                {shouldShowFileCv
                  ? 'CV file is ready to open.'
                  : shouldShowManualCv
                    ? 'Manual CV is ready to read.'
                    : 'No CV added yet.'}
              </span>
            </div>

            <div className="cv-actions cv-actions-balanced">
              {shouldShowFileCv && cvFileUrl ? (
                <a
                  href={cvFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="cv-button cv-button-green"
                >
                  CV PDF
                </a>
              ) : (
                <button type="button" className="cv-button cv-button-red" disabled>
                  CV PDF
                </button>
              )}

              <button
                type="button"
                className={`cv-button ${
                  shouldShowManualCv ? 'cv-button-green' : 'cv-button-red'
                }`}
                disabled={!shouldShowManualCv}
                onClick={() => setIsCvOpen((current) => !current)}
              >
                {isCvOpen ? 'Close CV' : 'Read CV'}
              </button>
            </div>

            {isCvOpen && shouldShowManualCv ? (
              <div className="manual-cv-panel">
                {manualCvRows.map(([label, value]) => (
                  <div key={String(label)} className="manual-cv-row">
                    <span>{label}</span>
                    <strong>{String(value)}</strong>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="card profile-card adresse-card">
            <div className="section-heading compact-heading">
              <h2>3. Address</h2>
            </div>

            <div className="adresse-list profile-info-list">
              <div>
                <span>Name</span>
                <strong>{worker.name}</strong>
              </div>

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
            </div>
          </section>
        </div>

        <div className="profile-layer profile-layer-two">
          <section className="card profile-card services-card compact-card-box">
            <div className="section-heading compact-heading">
              <h2>4. Services</h2>
              <span>{services.length}</span>
            </div>

            {services.length > 0 ? (
              <div className="compact-services-list">
                {services.slice(0, 8).map((service) => (
                  <article key={service.id} className="service-pill">
                    <span>{service.title}</span>
                    {service.price ? <strong>{service.price}</strong> : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-small-text">No services yet.</p>
            )}
          </section>

          <section className="card profile-card skills-card compact-card-box">
            <div className="section-heading compact-heading">
              <h2>5. Skills</h2>
              <span>{skills.length}</span>
            </div>

            {skills.length > 0 ? (
              <div className="compact-skills-list refined-skills-list">
                {skills.slice(0, 12).map((skill) => (
                  <span key={skill.id}>{skill.title}</span>
                ))}
              </div>
            ) : (
              <p className="empty-small-text">No skills yet.</p>
            )}
          </section>

          <section className="card profile-card achievement-card compact-card-box">
            <div className="section-heading compact-heading">
              <h2>6. Achievements</h2>
              <span>{gallery.length}</span>
            </div>

            {gallery.length > 0 ? (
              <div className="achievement-media-grid">
                {gallery.slice(0, 6).map((item) => (
                  <button
                    type="button"
                    className="achievement-media-tile"
                    onClick={() => openMediaPreview(item)}
                    key={item.id}
                  >
                    {item.type === 'video' ? (
                      <>
                        <video src={item.url} muted playsInline />
                        <span className="achievement-play-mark">▶</span>
                      </>
                    ) : (
                      <Image
                        src={item.url}
                        unoptimized={isR2MediaUrl(item.url)}
                        alt={`${worker.name} achievement`}
                        fill
                        className="achievement-mini-image"
                        sizes="130px"
                      />
                    )}
                  </button>
                ))}
              </div>
            ) : achievementMedia ? (
              <button
                type="button"
                className="achievement-mini-frame"
                onClick={() => openMediaPreview(achievementMedia)}
              >
                {achievementMedia.type === 'video' ? (
                  <video src={achievementMedia.url} muted playsInline />
                ) : (
                  <Image
                    src={achievementMedia.url}
                    unoptimized={isR2MediaUrl(achievementMedia.url)}
                    alt={`${worker.name} achievement`}
                    fill
                    className="achievement-mini-image"
                    sizes="160px"
                  />
                )}
              </button>
            ) : (
              <div className="achievement-mini-empty">No media</div>
            )}
          </section>
        </div>

        <div className="profile-layer profile-layer-three">
          <section className="card profile-card compact-reviews-card">
            <div className="section-heading compact-heading">
              <h2>7. Reviews</h2>
              <span>{reviews.length}</span>
            </div>

            <div className="review-summary-line">
              <strong>{ratingValue.toFixed(1)}</strong>
              <span>{getStars(ratingValue)}</span>
            </div>

            {isLoggedIn ? (
              <form onSubmit={handleSubmitReview} className="compact-review-form refined-review-form">
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
                  placeholder="Short review..."
                  rows={2}
                />

                <div className="review-form-footer">
                  <button type="submit" disabled={reviewSubmitting}>
                    {reviewSubmitting ? 'Saving...' : currentUserReview ? 'Update' : 'Add'}
                  </button>

                  {reviewStatus ? <p>{reviewStatus}</p> : null}
                </div>
              </form>
            ) : (
              <div className="login-review-box compact-login-review-box">
                <p>Sign in to add stars.</p>

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

            <div className="compact-reviews-list refined-reviews-list">
              {reviews.slice(0, 3).map((review) => (
                <article key={review.id} className="compact-review-card">
                  <div className="compact-review-top">
                    <strong>{review.user_name}</strong>
                    <span>{getStars(review.rating)}</span>
                    {review.created_at ? <small>{formatDate(review.created_at)}</small> : null}
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

          <section className="card profile-card work-info-card">
            <div className="section-heading compact-heading">
              <h2>8. Work Info</h2>
              <span>Live</span>
            </div>

            <div className="work-info-list">
              <div>
                <span>Profession</span>
                <strong>{worker.profession || 'Not added'}</strong>
              </div>

              <div>
                <span>Status</span>
                <strong>{statusLabel || 'Not added'}</strong>
              </div>

              <div>
                <span>Working Hours</span>
                <strong>{worker.working_hours || 'Not added'}</strong>
              </div>

              <div>
                <span>Experience</span>
                <strong>
                  {typeof worker.experience_years === 'number'
                    ? `${worker.experience_years} years`
                    : 'Not added'}
                </strong>
              </div>

              <div>
                <span>Availability</span>
                <strong>{isAvailable ? 'Available' : 'Unavailable'}</strong>
              </div>

              <div>
                <span>Views</span>
                <strong>{formatProfileNumber(safeProfileViewsCount)}</strong>
              </div>

              <div>
                <span>Requests</span>
                <strong>{formatProfileNumber(safeWorkerRequestsCount)}</strong>
              </div>

              <div>
                <span>Contacts</span>
                <strong>{formatProfileNumber(contactClicksCount)}</strong>
              </div>
            </div>
          </section>

          <section className="card profile-card contact-social-card">
            <div className="section-heading compact-heading">
              <h2>9. Contact & Social</h2>
              <span>{activeContactItems.length}</span>
            </div>

            {activeContactItems.length > 0 ? (
              <div className="contact-social-grid">
                {activeContactItems.map((item) => (
                  <button
                    key={item.channel}
                    type="button"
                    className={`contact-social-action ${
                      item.channel === 'maps' ? 'contact-social-maps' : ''
                    } ${!isLoggedIn ? 'contact-social-locked' : ''}`}
                    onClick={() => {
                      if (!item.url) return;

                      if (!isLoggedIn) {
                        showLockedMessage(item.lockedMessage);
                        return;
                      }

                      handleContactClick(item.label, item.url, item.channel);
                    }}
                  >
                    <span className="contact-social-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-small-text">No contact links yet.</p>
            )}

            {selectedContactItem?.displayValue && isLoggedIn ? (
              <div className="contact-reveal-panel contact-card-reveal-panel">
                <span>{selectedContactItem.label}</span>
                <strong>{selectedContactItem.displayValue}</strong>
                <button type="button" onClick={() => setRevealedContact(null)}>
                  Close
                </button>
              </div>
            ) : null}
          </section>
        </div>
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
          Request trusted local service for free with Sendio. Sendio helps you
          connect, compare, and start your service request with confidence.
        </p>
      </footer>

      {previewMedia ? (
        <div
          className="media-preview-overlay"
          role="dialog"
          aria-modal="true"
          onClick={closeMediaPreview}
        >
          <div
            className={`media-preview-box ${
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
              className="media-preview-close"
              onClick={closeMediaPreview}
              aria-label="Close media"
            >
              ×
            </button>

            <div className="media-preview-frame">
              {previewMedia.type?.toLowerCase() === 'video' ? (
                <video
                  src={previewMedia.url}
                  controls
                  autoPlay
                  playsInline
                  onLoadedMetadata={(event) =>
                    updateMediaPreviewLayout(
                      event.currentTarget.videoWidth,
                      event.currentTarget.videoHeight
                    )
                  }
                />
              ) : (
                <Image
                  src={previewMedia.url}
                  unoptimized={isR2MediaUrl(previewMedia.url)}
                  alt="Achievement preview"
                  fill
                  quality={90}
                  priority
                  className="media-preview-image"
                  sizes="(max-width: 620px) 100vw, 740px"
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

        .contact-icon-maps {
          background: #fee2e2;
          color: #dc2626;
          border-color: #fecaca;
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

        .worker-profile-shell {
          width: calc(100% - var(--page-side-padding) * 2);
          max-width: var(--shell-width);
          margin: 14px auto 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .profile-layer {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          align-items: stretch;
        }

        .card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 22px;
          padding: 13px;
          box-shadow: 0 10px 22px rgba(17, 24, 39, 0.045);
          min-width: 0;
        }

        .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 9px;
        }

        .section-heading h2 {
          margin: 0;
          color: var(--text);
          font-size: 16px;
          letter-spacing: -0.2px;
        }

        .section-heading span {
          border-radius: 999px;
          background: var(--button-bg);
          border: 1px solid var(--border);
          color: var(--primary-blue-dark);
          padding: 4px 8px;
          font-size: 10px;
          font-weight: 900;
        }

        .compact-request-card {
          min-height: 218px;
        }

        .request-form,
        .mini-request-form {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .request-two-fields {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
        }

        .request-form input,
        .request-form select,
        .request-form textarea {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 13px;
          padding: 8px 9px;
          font-size: 12px;
          outline: none;
          color: var(--text);
          background: var(--soft-card-bg);
          resize: vertical;
        }

        .request-form textarea {
          min-height: 54px;
        }

        .request-form input:focus,
        .request-form select:focus,
        .request-form textarea:focus {
          border-color: var(--primary-blue);
          background: var(--card-bg);
        }

        .request-service-hint {
          margin: 0;
          color: var(--muted);
          font-size: 12px;
          font-weight: 800;
          line-height: 1.45;
        }

        .selected-service-category {
          min-height: 36px;
          display: flex;
          align-items: center;
          padding: 8px 10px;
          border: 1px solid var(--border);
          border-radius: 13px;
          background: var(--soft-card-bg);
          color: var(--text);
          font-size: 12px;
          font-weight: 900;
        }

        .request-form button,
        .locked-request-box button {
          border: 0;
          background: var(--primary-blue);
          color: white;
          border-radius: 999px;
          padding: 9px 12px;
          font-size: 12px;
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

        .request-status-box {
          margin: 2px 0 0;
          border-radius: 14px;
          padding: 9px 10px;
          font-size: 11px;
          line-height: 1.45;
          font-weight: 900;
        }

        .request-status-success {
          border: 1px solid #bbf7d0;
          background: #dcfce7;
          color: #166534;
        }

        .request-status-error {
          border: 1px solid #fecaca;
          background: #fee2e2;
          color: #991b1b;
        }

        .locked-request-box {
          border: 1px dashed var(--border);
          background: var(--soft-card-bg);
          border-radius: 18px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .locked-request-box p {
          margin: 0;
          color: var(--muted);
          font-size: 12px;
          font-weight: 800;
        }

        .cv-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .cv-button {
          min-width: 92px;
          height: 34px;
          border: 0;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 13px;
          color: white;
          font-size: 12px;
          font-weight: 900;
          text-decoration: none;
          cursor: pointer;
        }

        .cv-button-green {
          background: #16a34a;
        }

        .cv-button-red {
          background: #dc2626;
          cursor: not-allowed;
        }

        .manual-cv-panel {
          margin-top: 10px;
          max-height: 265px;
          overflow: auto;
          border-radius: 16px;
          background: var(--soft-card-bg);
          border: 1px solid var(--border);
          padding: 9px;
          display: grid;
          gap: 7px;
        }

        .manual-cv-row {
          border-radius: 12px;
          background: white;
          border: 1px solid #e5e7eb;
          padding: 7px 8px;
        }

        .manual-cv-row span {
          display: block;
          color: var(--soft-muted);
          font-size: 10px;
          font-weight: 900;
        }

        .manual-cv-row strong {
          display: block;
          margin-top: 2px;
          color: var(--text);
          font-size: 12px;
          line-height: 1.4;
          font-weight: 800;
          white-space: pre-wrap;
        }

        .adresse-list {
          display: grid;
          gap: 7px;
        }

        .adresse-list div {
          min-height: 40px;
          border-radius: 14px;
          background: var(--soft-card-bg);
          border: 1px solid #e5e7eb;
          padding: 7px 9px;
        }

        .adresse-list span {
          color: var(--soft-muted);
          font-size: 10px;
          font-weight: 900;
          display: block;
        }

        .adresse-list strong {
          color: var(--text);
          font-size: 12px;
          line-height: 1.35;
          font-weight: 900;
          display: block;
          margin-top: 2px;
        }

        .adresse-icons {
          margin-top: 9px;
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .compact-card-box {
          min-height: 166px;
        }

        .compact-services-list {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .service-pill {
          width: 100%;
          min-height: 36px;
          border-radius: 14px;
          background: var(--button-bg);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 7px 10px;
          overflow: hidden;
        }

        .service-pill span {
          color: var(--text);
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .service-pill strong {
          color: var(--primary-blue);
          font-size: 11px;
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

        .achievement-mini-frame,
        .achievement-mini-empty {
          position: relative;
          width: 128px;
          height: 128px;
          border: 1px solid var(--border);
          border-radius: 20px;
          background: var(--soft-card-bg);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          padding: 0;
          cursor: pointer;
        }

        .achievement-mini-frame video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #ffffff;
        }

        .achievement-mini-image {
          object-fit: contain;
          background: #ffffff;
        }

        .achievement-mini-empty {
          color: var(--soft-muted);
          font-size: 12px;
          font-weight: 900;
          cursor: default;
        }

        .empty-small-text {
          margin: 0;
          color: var(--soft-muted);
          font-size: 12px;
          font-weight: 800;
        }

        .compact-reviews-card {
          width: min(100%, 700px);
          margin: 0 auto;
        }

        .compact-review-form {
          border: 1px solid var(--border);
          background: var(--soft-card-bg);
          border-radius: 15px;
          padding: 8px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 7px;
          align-items: center;
          margin-bottom: 8px;
        }

        .small-star-picker {
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .small-star-picker button {
          width: 19px;
          height: 19px;
          border: 1px solid #fed7aa;
          border-radius: 7px;
          background: #fff7ed;
          color: #d1d5db;
          padding: 0;
          font-size: 12px;
          line-height: 1;
          cursor: pointer;
        }

        .small-star-picker button.star-active {
          color: var(--star);
        }

        .compact-review-form textarea {
          width: 100%;
          min-height: 34px;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 7px 9px;
          font-size: 12px;
          outline: none;
          color: var(--text);
          background: var(--card-bg);
          resize: vertical;
        }

        .review-form-footer {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .review-form-footer button,
        .login-review-box button {
          border: 0;
          background: var(--primary-blue);
          color: white;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: 11px;
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
          font-size: 10px;
          font-weight: 800;
        }

        .login-review-box {
          border: 1px solid var(--border);
          background: var(--soft-card-bg);
          border-radius: 14px;
          padding: 8px;
          margin-bottom: 8px;
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
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 7px;
        }

        .compact-review-card {
          position: relative;
          border: 1px solid #e5e7eb;
          background: var(--soft-card-bg);
          border-radius: 14px;
          padding: 8px 9px;
        }

        .compact-review-top {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 4px;
        }

        .compact-review-top strong {
          color: var(--text);
          font-size: 11px;
          font-weight: 900;
        }

        .compact-review-top span {
          color: var(--star);
          font-size: 9px;
          letter-spacing: 0.4px;
        }

        .compact-review-top small {
          color: var(--soft-muted);
          font-size: 9px;
          font-weight: 800;
        }

        .compact-review-card p {
          margin: 0;
          color: var(--muted);
          font-size: 11px;
          line-height: 1.35;
        }

        .delete-review-button {
          margin-top: 6px;
          border: 0;
          background: var(--unavailable-bg);
          color: #b91c1c;
          border-radius: 999px;
          padding: 4px 8px;
          font-size: 9px;
          font-weight: 900;
          cursor: pointer;
        }

        .empty-review-text {
          margin: 0;
          color: var(--soft-muted);
          font-size: 12px;
          font-weight: 800;
        }

        .media-preview-overlay {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: transparent;
          backdrop-filter: none;
        }

        .media-preview-box {
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

        .media-preview-box.is-loading {
          width: min(520px, calc(100vw - 36px), calc(100vh - 36px));
          aspect-ratio: 1 / 1;
        }

        .media-preview-frame {
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

        .media-preview-frame video,
        .media-preview-frame :global(.media-preview-image) {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #000000;
        }

        .media-preview-close {
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



        /* Refined 3x3 profile layout inspired by the approved Figma direction */
        .refined-profile-shell {
          --profile-row-gap: 16px;
          max-width: 1120px;
          gap: var(--profile-row-gap);
          margin-top: 18px;
        }

        .refined-profile-shell .profile-layer {
          gap: 16px;
        }

        .profile-card {
          min-height: 270px;
          border-radius: 24px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
          box-shadow: 0 14px 34px rgba(17, 24, 39, 0.055);
        }

        .profile-card .section-heading {
          margin-bottom: 12px;
        }

        .profile-card .section-heading h2 {
          font-size: 15px;
          font-weight: 950;
        }

        .compact-request-card .request-form {
          flex: 1;
        }

        .mini-request-form textarea {
          min-height: 76px;
        }

        .cv-card {
          justify-content: space-between;
        }

        .cv-preview-frame {
          min-height: 132px;
          border-radius: 18px;
          border: 1px solid var(--border);
          background: var(--soft-card-bg);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 7px;
          text-align: center;
          padding: 14px;
        }

        .cv-file-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: #fee2e2;
          color: #dc2626;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 950;
          border: 1px solid #fecaca;
        }

        .cv-preview-frame strong {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--text);
          font-size: 12px;
          font-weight: 900;
        }

        .cv-preview-frame span {
          color: var(--soft-muted);
          font-size: 11px;
          font-weight: 800;
        }

        .cv-actions-balanced {
          margin-top: 12px;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        .cv-actions-balanced .cv-button {
          width: 100%;
        }

        .profile-info-list div,
        .work-info-list div {
          min-height: 34px;
        }

        .compact-card-box {
          min-height: 270px;
        }

        .refined-skills-list {
          align-content: flex-start;
        }

        .achievement-media-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .achievement-media-tile {
          position: relative;
          aspect-ratio: 1 / 0.82;
          min-height: 72px;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--soft-card-bg);
          overflow: hidden;
          padding: 0;
          cursor: pointer;
        }

        .achievement-media-tile video,
        .achievement-media-tile :global(img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .achievement-play-mark {
          position: absolute;
          inset: 0;
          margin: auto;
          width: 30px;
          height: 30px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.86);
          color: var(--primary-blue-dark);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 950;
          box-shadow: 0 10px 20px rgba(17, 24, 39, 0.16);
        }

        .compact-reviews-card {
          width: 100%;
          margin: 0;
        }

        .review-summary-line {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .review-summary-line strong {
          color: var(--text);
          font-size: 25px;
          line-height: 1;
          font-weight: 950;
        }

        .review-summary-line span {
          color: var(--star);
          font-size: 15px;
          letter-spacing: 0.8px;
        }

        .refined-review-form {
          grid-template-columns: 1fr;
        }

        .refined-review-form textarea {
          min-height: 62px;
        }

        .refined-reviews-list {
          grid-template-columns: 1fr;
          max-height: 150px;
          overflow: auto;
        }

        .work-info-list {
          display: grid;
          gap: 8px;
          flex: 1;
        }

        .work-info-list div {
          display: grid;
          grid-template-columns: 110px 1fr;
          gap: 10px;
          align-items: center;
          border-radius: 14px;
          background: var(--soft-card-bg);
          border: 1px solid #e5e7eb;
          padding: 7px 9px;
        }

        .work-info-list span {
          color: var(--soft-muted);
          font-size: 10px;
          font-weight: 950;
        }

        .work-info-list strong {
          color: var(--text);
          font-size: 11px;
          font-weight: 900;
        }

        .contact-social-card {
          min-height: 270px;
        }

        .contact-social-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .contact-social-action {
          min-height: 40px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--soft-card-bg);
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 10px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 950;
          transition: 0.2s ease;
        }

        .contact-social-action:hover {
          background: var(--button-bg);
          transform: translateY(-1px);
        }

        .contact-social-icon {
          width: 25px;
          height: 25px;
          border-radius: 999px;
          background: var(--button-bg);
          color: var(--primary-blue-dark);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          font-size: 11px;
          font-weight: 950;
        }

        .contact-social-maps .contact-social-icon {
          background: #fee2e2;
          color: #dc2626;
        }

        .contact-social-locked {
          color: #6b7280;
        }

        .contact-card-reveal-panel {
          width: 100%;
          margin-top: 10px;
        }
        @media (max-width: 900px) {
          .worker-hero {
            grid-template-columns: 1fr;
            padding: 20px;
          }

          .hero-message {
            min-height: auto;
          }

          .profile-layer {
            grid-template-columns: 1fr;
          }

          .compact-reviews-card {
            width: 100%;
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

          .media-preview-overlay {
            padding: 0;
            align-items: center;
            background: #000000;
          }

          .media-preview-box,
          .media-preview-box.is-loading {
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

          .media-preview-frame {
            border-radius: 0;
          }

          .media-preview-close {
            right: 12px;
            top: 12px;
            width: 38px;
            height: 38px;
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