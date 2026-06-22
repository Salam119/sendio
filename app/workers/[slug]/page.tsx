'use client';

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
    month: 'long',
    day: 'numeric',
  });
}

function getStars(rating: number) {
  const safeRating = Math.max(0, Math.min(5, Math.round(rating)));
  return '★'.repeat(safeRating) + '☆'.repeat(5 - safeRating);
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

      const workerQuery = supabase.from('workers').select('*');

      const { data: workerData, error: workerError } = isUuid(slug)
        ? await workerQuery.eq('id', slug).maybeSingle()
        : await workerQuery.eq('slug', slug).maybeSingle();

      if (!isMounted) return;

      if (workerError || !workerData) {
        setWorker(null);
        setLoading(false);
        setNotFound(true);
        return;
      }

      const selectedWorker = workerData as WorkerProfile;

      setWorker(selectedWorker);

      const [
        servicesResult,
        skillsResult,
        galleryResult,
        socialLinksResult,
        reviewsResult,
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
      ]);

      if (!isMounted) return;

      setServices((servicesResult.data ?? []) as WorkerService[]);
      setSkills((skillsResult.data ?? []) as WorkerSkill[]);
      setGallery((galleryResult.data ?? []) as WorkerGalleryItem[]);
      setSocialLinks(
        (socialLinksResult.data as WorkerSocialLinks | null) ?? null
      );
      setReviews((reviewsResult.data ?? []) as WorkerReview[]);
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

    await supabase.from('worker_requests').insert({
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

    openContactUrl(url);
  }

  function renderProtectedLink(
    label: string,
    url: string | null,
    message: string,
    channel: ContactChannel
  ) {
    if (!url) return null;

    if (!isLoggedIn) {
      return (
        <button
          type="button"
          className="locked-action"
          onClick={() => showLockedMessage(message)}
        >
          {label}
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => handleContactClick(label, url, channel)}
      >
        {label}
      </button>
    );
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
            background: #f6f3ef;
            color: #173321;
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
            color: white;
            background: #0b5b2f;
            padding: 10px 16px;
            border-radius: 999px;
            font-weight: 800;
          }

          .state-box {
            max-width: 760px;
            margin: 70px auto;
            background: white;
            border: 1px solid #d8c3a5;
            border-radius: 18px;
            padding: 28px;
            text-align: center;
            color: #4f3b25;
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
            background: #f6f3ef;
            color: #173321;
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
            color: white;
            background: #0b5b2f;
            padding: 10px 16px;
            border-radius: 999px;
            font-weight: 800;
          }

          .state-box {
            max-width: 760px;
            margin: 70px auto;
            background: white;
            border: 1px solid #d8c3a5;
            border-radius: 18px;
            padding: 28px;
            text-align: center;
            color: #4f3b25;
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

      <section className="hero">
        <div className="cover">
          {worker.cover ? (
            <img src={worker.cover} alt={`${worker.name} cover`} />
          ) : null}
        </div>

        <div className="hero-content">
          <div className="avatar-box">
            {worker.avatar ? (
              <img src={worker.avatar} alt={`${worker.name} avatar`} />
            ) : (
              <span>{worker.name.charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className="worker-main-info">
            <h1>{worker.name}</h1>

            <div className="meta-line">
              {worker.profession ? <span>{worker.profession}</span> : null}
              {worker.city ? <span>{worker.city}</span> : null}
              {statusLabel ? <span>{statusLabel}</span> : null}
            </div>

            <div className="rating-line">
              {worker.rating !== null ? (
                <span>{Number(worker.rating).toFixed(1)} Rating</span>
              ) : null}

              {worker.reviews_count !== null ? (
                <span>{worker.reviews_count} Reviews</span>
              ) : null}

              {isLoggedIn && worker.views !== null ? (
                <span>{worker.views} Views</span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="contact-actions">
        {renderProtectedLink(
          'WhatsApp',
          whatsappUrl,
          'Sign in to unlock WhatsApp.',
          'whatsapp'
        )}

        {renderProtectedLink(
          'Call',
          phoneUrl,
          'Sign in to unlock calls.',
          'phone'
        )}

        {renderProtectedLink(
          'Email',
          emailUrl,
          'Sign in to unlock email.',
          'email'
        )}

        {renderProtectedLink(
          'Website',
          websiteUrl,
          'Sign in to unlock this website link.',
          'website'
        )}
      </section>

      <section className="content-grid">
        <div className="main-column">
          {worker.description ? (
            <section className="card">
              <h2>About</h2>
              <p>{worker.description}</p>
            </section>
          ) : null}

          {gallery.length > 0 ? (
            <section className="card">
              <h2>Achievements</h2>

              <div className="gallery-grid">
                {gallery.map((item) => (
                  <div key={item.id} className="gallery-item">
                    <div className="gallery-media">
                      {item.type === 'video' ? (
                        <video src={item.url} controls />
                      ) : (
                        <img src={item.url} alt={`${worker.name} achievement`} />
                      )}
                    </div>

                    {item.type === 'video' ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="open-video-link"
                      >
                        Open Video
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {services.length > 0 ? (
            <section className="card">
              <h2>Services</h2>

              <div className="list-grid">
                {services.map((service) => (
                  <article key={service.id} className="item-card">
                    <h3>{service.title}</h3>

                    {service.description ? <p>{service.description}</p> : null}

                    {service.price ? (
                      <strong className="price-text">{service.price}</strong>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {skills.length > 0 ? (
            <section className="card">
              <h2>Skills</h2>

              <div className="skills-list">
                {skills.map((skill) => (
                  <span key={skill.id}>{skill.title}</span>
                ))}
              </div>
            </section>
          ) : null}

          <section className="card">
            <h2>Reviews</h2>

            {isLoggedIn ? (
              <form onSubmit={handleSubmitReview} className="review-form compact-review-form">
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
                      : 'Add Review'}
                </button>

                {reviewStatus ? (
                  <p className="review-status">{reviewStatus}</p>
                ) : null}
              </form>
            ) : (
              <div className="login-review-box">
                <p>Sign in to add a rating and review for this worker.</p>

                <button
                  type="button"
                  onClick={() =>
                    showLockedMessage('Register to rate and review this worker.')
                  }
                >
                  Unlock Review
                </button>
              </div>
            )}

            <div className="reviews-list">
              {reviews.map((review) => (
                <article key={review.id} className="review-card">
                  <div className="review-header">
                    <strong>{review.user_name}</strong>
                    <span>{getStars(review.rating)}</span>
                  </div>

                  {review.comment ? <p>{review.comment}</p> : null}

                  <div className="review-footer">
                    {review.created_at ? (
                      <small>{formatDate(review.created_at)}</small>
                    ) : null}

                    {review.user_id === currentUserId ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteReview(review.id)}
                        className="delete-review-button"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
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
            <h2>Request Service</h2>

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

          <section className="card">
            <h2>Worker Details</h2>

            <div className="details-list">
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

              {isLoggedIn && worker.requests_count !== null ? (
                <div>
                  <span>Requests</span>
                  <strong>{worker.requests_count}</strong>
                </div>
              ) : null}
            </div>
          </section>

          {facebookUrl || instagramUrl || linkedinUrl || xUrl || websiteUrl ? (
            <section className="card">
              <h2>Social Links</h2>

              <div className="social-list">
                {renderProtectedLink(
                  'Facebook',
                  facebookUrl,
                  'Sign in to unlock Facebook.',
                  'facebook'
                )}

                {renderProtectedLink(
                  'Instagram',
                  instagramUrl,
                  'Sign in to unlock Instagram.',
                  'instagram'
                )}

                {renderProtectedLink(
                  'LinkedIn',
                  linkedinUrl,
                  'Sign in to unlock LinkedIn.',
                  'linkedin'
                )}

                {renderProtectedLink(
                  'X',
                  xUrl,
                  'Sign in to unlock X.',
                  'x'
                )}

                {renderProtectedLink(
                  'Website',
                  websiteUrl,
                  'Sign in to unlock this website link.',
                  'website'
                )}
              </div>
            </section>
          ) : null}
        </aside>
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
        .public-worker-page {
          min-height: 100vh;
          background: #f6f3ef;
          color: #173321;
          font-family: Arial, sans-serif;
          padding: 20px 0 45px;
        }

        .top-navigation {
          max-width: 1060px;
          margin: 0 auto 14px;
          padding: 0 18px;
        }

        .back-home-button {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
          color: white;
          background: #0b5b2f;
          padding: 10px 16px;
          border-radius: 999px;
          font-weight: 800;
          box-shadow: 0 8px 18px rgba(11, 91, 47, 0.18);
          transition: 0.2s;
        }

        .back-home-button:hover {
          transform: translateY(-2px);
          background: #084625;
        }

        .hero {
          max-width: 1060px;
          margin: 0 auto;
          padding: 0 18px;
        }

        .cover {
          height: 190px;
          background: #fffaf2;
          border-radius: 22px;
          overflow: hidden;
          border: 1px solid rgba(11, 91, 47, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cover img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center;
          display: block;
          background: #fffaf2;
        }

        .hero-content {
          display: flex;
          align-items: flex-end;
          gap: 16px;
          padding: 0 24px;
          margin-top: -38px;
        }

        .avatar-box {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          background: white;
          border: 4px solid #f6f3ef;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.13);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0b5b2f;
          font-size: 34px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .avatar-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .worker-main-info {
          background: white;
          border: 1px solid #e2d3bf;
          border-radius: 20px;
          padding: 15px 18px;
          flex: 1;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.07);
        }

        h1 {
          margin: 0 0 8px;
          font-size: 30px;
          color: #0b5b2f;
        }

        .meta-line,
        .rating-line {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }

        .meta-line span,
        .rating-line span {
          background: #f1e6d8;
          color: #4f3b25;
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
        }

        .contact-actions {
          max-width: 1060px;
          margin: 18px auto 0;
          padding: 0 18px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .contact-actions a,
        .contact-actions button {
          text-decoration: none;
          background: #0b5b2f;
          color: white;
          padding: 10px 15px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 800;
          box-shadow: 0 8px 18px rgba(11, 91, 47, 0.16);
          border: 0;
          cursor: pointer;
        }

        .contact-actions button.locked-action {
          background: #8b5a2b;
        }

        .content-grid {
          max-width: 1060px;
          margin: 20px auto 0;
          padding: 0 18px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 330px;
          gap: 18px;
          align-items: start;
        }

        .main-column,
        .side-column {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .card {
          background: white;
          border: 1px solid #e2d3bf;
          border-radius: 22px;
          padding: 20px;
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.05);
        }

        .request-card {
          position: sticky;
          top: 18px;
        }

        .card h2 {
          margin: 0 0 15px;
          color: #0b5b2f;
          font-size: 22px;
        }

        .card p {
          margin: 0;
          line-height: 1.7;
          color: #4f3b25;
        }

        .list-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .item-card,
        .review-card {
          border: 1px solid #eadcc9;
          background: #fbf8f3;
          border-radius: 18px;
          padding: 15px;
        }

        .item-card h3 {
          margin: 0 0 8px;
          color: #173321;
          font-size: 18px;
        }

        .item-card p {
          font-size: 14px;
        }

        .price-text {
          display: inline-block;
          margin-top: 10px;
          color: #0b5b2f;
          font-size: 14px;
        }

        .skills-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .skills-list span {
          background: #f1e6d8;
          color: #173321;
          padding: 9px 12px;
          border-radius: 999px;
          font-weight: 800;
          font-size: 14px;
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          align-items: start;
        }

        .gallery-item {
          border-radius: 14px;
          overflow: hidden;
          background: #fbf8f3;
          border: 1px solid #eadcc9;
        }

        .gallery-media {
          height: 118px;
          background: #111;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .gallery-media img,
        .gallery-media video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center;
          display: block;
          background: #111;
        }

        .open-video-link {
          display: block;
          margin: 7px;
          text-decoration: none;
          color: #0b5b2f;
          background: #f1e6d8;
          border-radius: 999px;
          padding: 6px 8px;
          font-size: 11px;
          font-weight: 800;
          text-align: center;
        }

        .review-form {
          border: 1px solid #eadcc9;
          background: #fbf8f3;
          border-radius: 16px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 9px;
          margin-bottom: 14px;
        }

        .star-rating {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .review-form .star-button {
          width: 30px;
          height: 30px;
          border: 1px solid #d8c3a5;
          border-radius: 10px;
          background: white;
          color: #d8c3a5;
          padding: 0;
          font-size: 19px;
          line-height: 1;
          font-weight: 900;
          cursor: pointer;
          transition: 0.2s;
          text-decoration: none;
          text-align: center;
        }

        .review-form .star-button:hover,
        .review-form .star-button-active {
          color: #c49a6c;
          border-color: #c49a6c;
          background: #fff9ef;
          transform: translateY(-1px);
        }

        .rating-value {
          margin-left: 6px;
          color: #4f3b25;
          font-size: 12px;
          font-weight: 900;
        }

        .review-form textarea {
          width: 100%;
          min-height: 72px;
          border: 1px solid #d8c3a5;
          border-radius: 14px;
          padding: 10px 12px;
          font-size: 14px;
          outline: none;
          color: #173321;
          background: white;
          resize: vertical;
        }

        .review-form textarea:focus {
          border-color: #0b5b2f;
        }

        .review-submit-button,
        .login-review-box button {
          border: 0;
          background: #0b5b2f;
          color: white;
          border-radius: 999px;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          text-decoration: none;
          text-align: center;
        }

        .review-submit-button {
          align-self: flex-start;
        }

        .review-submit-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .review-status {
          color: #4f3b25;
          font-size: 14px;
        }

        .login-review-box {
          border: 1px solid #eadcc9;
          background: #fbf8f3;
          border-radius: 18px;
          padding: 15px;
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .reviews-list {
          display: flex;
          flex-direction: column;
          gap: 13px;
        }

        .review-header {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
        }

        .review-header strong {
          color: #173321;
        }

        .review-header span {
          color: #8b5a2b;
          letter-spacing: 1px;
        }

        .review-footer {
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .review-card small {
          display: block;
          color: #8b5a2b;
          font-weight: 700;
        }

        .delete-review-button {
          border: 0;
          background: #fff0f1;
          color: #c62828;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .empty-review-text {
          color: #8b5a2b;
          font-size: 14px;
        }

        .details-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .details-list div {
          border-bottom: 1px solid #eadcc9;
          padding-bottom: 11px;
        }

        .details-list div:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .details-list span {
          display: block;
          font-size: 13px;
          color: #8b5a2b;
          margin-bottom: 5px;
          font-weight: 700;
        }

        .details-list strong {
          color: #173321;
          font-size: 15px;
          line-height: 1.5;
        }

        .social-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .social-list a,
        .social-list button {
          text-decoration: none;
          color: #0b5b2f;
          background: #f1e6d8;
          border-radius: 999px;
          padding: 9px 13px;
          font-weight: 800;
          border: 0;
          cursor: pointer;
          font-size: 14px;
        }

        .social-list button.locked-action {
          color: #8b5a2b;
          background: #f5eadc;
        }

        .request-form {
          display: flex;
          flex-direction: column;
          gap: 11px;
        }

        .request-form input,
        .request-form textarea {
          width: 100%;
          border: 1px solid #d8c3a5;
          border-radius: 14px;
          padding: 12px 13px;
          font-size: 14px;
          outline: none;
          color: #173321;
          background: #fbf8f3;
          resize: vertical;
        }

        .request-form input:focus,
        .request-form textarea:focus {
          border-color: #0b5b2f;
        }

        .request-form button,
        .locked-request-box button {
          border: 0;
          background: #0b5b2f;
          color: white;
          border-radius: 999px;
          padding: 12px 15px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
        }

        .request-form button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .request-status {
          font-size: 14px;
          color: #4f3b25;
        }

        .locked-request-box {
          border: 1px dashed #d8c3a5;
          background: #fbf8f3;
          border-radius: 18px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .locked-request-box p {
          color: #4f3b25;
          font-weight: 700;
        }

        .unlock-toast {
          position: fixed;
          right: 22px;
          bottom: 22px;
          z-index: 50;
          max-width: 360px;
          background: white;
          border: 1px solid #d8c3a5;
          border-radius: 18px;
          padding: 16px;
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18);
        }

        .unlock-toast p {
          margin: 0 0 12px;
          color: #4f3b25;
          font-weight: 800;
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
          background: #0b5b2f;
          color: white;
          border-radius: 999px;
          padding: 9px 12px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .unlock-toast button {
          background: #8b5a2b;
        }

        @media (max-width: 900px) {
          .content-grid {
            grid-template-columns: 1fr;
          }

          .request-card {
            position: static;
          }

          .hero-content {
            align-items: flex-start;
            flex-direction: column;
            margin-top: -36px;
            padding: 0 18px;
          }

          .worker-main-info {
            width: 100%;
          }

          .list-grid {
            grid-template-columns: 1fr;
          }

          .gallery-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .gallery-media {
            height: 110px;
          }

          h1 {
            font-size: 27px;
          }

          .cover {
            height: 170px;
          }

          .unlock-toast {
            right: 14px;
            left: 14px;
            bottom: 14px;
            max-width: none;
          }
        }

        @media (max-width: 620px) {
          .gallery-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .gallery-media {
            height: 125px;
          }
        }
      `}</style>
    </main>
  );
}