'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
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
      ]);

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

  if (loading) {
    return (
      <main className="public-company-page">
        <div className="top-navigation">
          <Link href="/" className="back-home-button">
            ← Back to Home
          </Link>
        </div>

        <div className="state-box">Loading company profile...</div>

        <style jsx>{`
          .public-company-page {
            min-height: 100vh;
            background: #f6f3ef;
            color: #173321;
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
            color: white;
            background: #0b5b2f;
            padding: 11px 18px;
            border-radius: 999px;
            font-weight: 800;
            box-shadow: 0 8px 18px rgba(11, 91, 47, 0.18);
          }

          .state-box {
            max-width: 900px;
            margin: 80px auto;
            background: white;
            border: 1px solid #d8c3a5;
            border-radius: 18px;
            padding: 30px;
            text-align: center;
            color: #4f3b25;
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
            ← Back to Home
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
            background: #f6f3ef;
            color: #173321;
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
            color: white;
            background: #0b5b2f;
            padding: 11px 18px;
            border-radius: 999px;
            font-weight: 800;
            box-shadow: 0 8px 18px rgba(11, 91, 47, 0.18);
          }

          .state-box {
            max-width: 900px;
            margin: 80px auto;
            background: white;
            border: 1px solid #d8c3a5;
            border-radius: 18px;
            padding: 30px;
            text-align: center;
            color: #4f3b25;
          }

          .back-link {
            display: inline-block;
            margin-top: 15px;
            text-decoration: none;
            color: white;
            background: #0b5b2f;
            padding: 11px 18px;
            border-radius: 999px;
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
          ← Back to Home
        </Link>
      </div>

      <section className="hero">
        <div className="cover">
          {company.cover ? (
            <Image
            src={company.cover}
            alt={`${company.name} cover`}
            width={1600}
            height={420}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            sizes="100vw"
          />
          ) : null}
        </div>

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
            <Link href="/" className="home-link">
              Home
            </Link>

            <h1>{company.name}</h1>

            <div className="meta-line">
              {company.category ? <span>{company.category}</span> : null}
              {company.city ? <span>{company.city}</span> : null}
              {statusLabel ? <span>{statusLabel}</span> : null}
            </div>

            <div className="rating-line">
              {company.rating !== null ? (
                <span>{Number(company.rating).toFixed(1)} Rating</span>
              ) : null}

              {company.reviews_count !== null ? (
                <span>{company.reviews_count} Reviews</span>
              ) : null}

              {isLoggedIn && company.views !== null ? (
                <span>{company.views} Views</span>
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
          {company.description ? (
            <section className="card">
              <h2>About</h2>
              <p>{company.description}</p>
            </section>
          ) : null}

          {introVideoUrl ? (
            <section className="card">
              <h2>Intro Video</h2>
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
              <h2>Services</h2>
              <div className="list-grid">
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
              <h2>Projects</h2>
              <div className="list-grid">
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
              <h2>Articles</h2>
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

          {gallery.length > 0 ? (
            <section className="card">
              <h2>Gallery</h2>
              <div className="gallery-grid">
                {gallery.map((item) => (
                  <div key={item.id} className="gallery-item">
                    {item.type === 'video' ? (
                      <video src={item.url} controls />
                    ) : (
                      <Image
                      src={item.url}
                      alt={`${company.name} gallery`}
                      width={800}
                      height={440}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    )}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="card">
            <h2>{currentUserReview ? 'Update Your Review' : 'Add a Review'}</h2>

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
                      : 'Submit Review'}
                </button>

                {reviewStatus ? (
                  <p className="review-status">{reviewStatus}</p>
                ) : null}
              </form>
            ) : (
              <div className="locked-contact-box">
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
          </section>

          {reviews.length > 0 ? (
            <section className="card">
              <h2>Reviews</h2>
              <div className="reviews-list">
                {reviews.map((review) => (
                  <article key={review.id} className="review-card">
                    <div className="review-header">
                      <strong>{review.user_name}</strong>
                      <span>{getStars(review.rating)}</span>
                    </div>

                    {review.comment ? <p>{review.comment}</p> : null}

                    {review.created_at ? (
                      <small>{formatDate(review.created_at)}</small>
                    ) : null}

                    {review.user_id === currentUser?.id ? (
                      <div className="review-actions">
                        <button
                          type="button"
                          onClick={() => handleDeleteReview(review.id)}
                        >
                          Delete Review
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="side-column">
          <section className="card">
            <h2>Company Details</h2>

            <div className="details-list">
              {company.city ? (
                <div>
                  <span>City</span>
                  <strong>{company.city}</strong>
                </div>
              ) : null}

              {company.address ? (
                <div>
                  <span>Address</span>
                  <strong>{company.address}</strong>
                </div>
              ) : null}

              {company.working_hours ? (
                <div>
                  <span>Working Hours</span>
                  <strong>{company.working_hours}</strong>
                </div>
              ) : null}

              {statusLabel ? (
                <div>
                  <span>Status</span>
                  <strong>{statusLabel}</strong>
                </div>
              ) : null}

              {createdDate ? (
                <div>
                  <span>Joined</span>
                  <strong>{createdDate}</strong>
                </div>
              ) : null}

              {isLoggedIn && company.connections !== null ? (
                <div>
                  <span>Connections</span>
                  <strong>{company.connections}</strong>
                </div>
              ) : null}
            </div>
          </section>

          {features.length > 0 ? (
            <section className="card">
              <h2>Features</h2>
              <ul className="features-list">
                {features.map((feature) => (
                  <li key={feature.id}>{feature.title}</li>
                ))}
              </ul>
            </section>
          ) : null}

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

          <section className="card">
            <h2>Contact Company</h2>

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
          min-height: 100vh;
          background: #f6f3ef;
          color: #173321;
          font-family: Arial, sans-serif;
          padding: 24px 0 50px;
        }

        .top-navigation {
          max-width: 1180px;
          margin: 0 auto 18px;
          padding: 0 18px;
        }

        .back-home-button {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
          color: white;
          background: #0b5b2f;
          padding: 11px 18px;
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
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 18px;
        }

        .cover {
          height: 280px;
          background: linear-gradient(135deg, #0b5b2f, #c49a6c);
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(11, 91, 47, 0.15);
        }

        .cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .hero-content {
          display: flex;
          align-items: flex-end;
          gap: 20px;
          padding: 0 24px;
          margin-top: -54px;
        }

        .logo-box {
          width: 112px;
          height: 112px;
          border-radius: 24px;
          background: white;
          border: 5px solid #f6f3ef;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.14);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0b5b2f;
          font-size: 42px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .logo-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .company-main-info {
          background: white;
          border: 1px solid #e2d3bf;
          border-radius: 22px;
          padding: 18px 22px;
          flex: 1;
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.08);
        }

        .home-link {
          color: #8b5a2b;
          text-decoration: none;
          font-weight: 700;
          font-size: 14px;
        }

        h1 {
          margin: 8px 0;
          font-size: 34px;
          color: #0b5b2f;
        }

        .meta-line,
        .rating-line {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          margin-top: 9px;
        }

        .meta-line span,
        .rating-line span {
          background: #f1e6d8;
          color: #4f3b25;
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 700;
        }

        .contact-actions {
          max-width: 1180px;
          margin: 24px auto 0;
          padding: 0 18px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .contact-actions a,
        .contact-actions button {
          text-decoration: none;
          background: #0b5b2f;
          color: white;
          padding: 12px 18px;
          border-radius: 999px;
          font-weight: 800;
          box-shadow: 0 8px 18px rgba(11, 91, 47, 0.18);
          border: 0;
          cursor: pointer;
          font-size: 15px;
        }

        .contact-actions button.locked-action {
          background: #8b5a2b;
        }

        .content-grid {
          max-width: 1180px;
          margin: 24px auto 0;
          padding: 0 18px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 22px;
          align-items: start;
        }

        .main-column,
        .side-column {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .card {
          background: white;
          border: 1px solid #e2d3bf;
          border-radius: 22px;
          padding: 22px;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
        }

        .card h2 {
          margin: 0 0 16px;
          color: #0b5b2f;
          font-size: 22px;
        }

        .card p {
          margin: 0;
          line-height: 1.7;
          color: #4f3b25;
        }

        .video-box {
          position: relative;
          width: 100%;
          padding-top: 56.25%;
          border-radius: 18px;
          overflow: hidden;
          background: #173321;
        }

        .video-box iframe {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
        }

        .list-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .item-card,
        .article-card,
        .review-card {
          border: 1px solid #eadcc9;
          background: #fbf8f3;
          border-radius: 18px;
          padding: 16px;
        }

        .item-card h3,
        .article-card h3 {
          margin: 0 0 8px;
          color: #173321;
          font-size: 18px;
        }

        .item-card p {
          font-size: 14px;
        }

        .articles-list,
        .reviews-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .article-card p {
          white-space: pre-line;
        }

        .article-card small,
        .review-card small {
          display: block;
          margin-top: 10px;
          color: #8b5a2b;
          font-weight: 700;
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          align-items: start;
        }

        .gallery-item {
          height: 118px;
          border-radius: 14px;
          overflow: hidden;
          background: #111;
          border: 1px solid #eadcc9;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .gallery-item img,
        .gallery-item video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center;
          display: block;
          background: #111;
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

        .features-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .features-list li {
          background: #f1e6d8;
          color: #173321;
          padding: 11px 13px;
          border-radius: 14px;
          font-weight: 700;
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

        .review-form {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .compact-review-form {
          border: 1px solid #eadcc9;
          background: #fbf8f3;
          border-radius: 16px;
          padding: 12px;
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

        .review-submit-button {
          align-self: flex-start;
          border: 0;
          background: #0b5b2f;
          color: white;
          border-radius: 999px;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .review-submit-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .review-status {
          font-size: 14px;
          color: #4f3b25;
          font-weight: 700;
        }

        .review-actions {
          margin-top: 12px;
        }

        .review-actions button {
          border: 0;
          background: #fff0f1;
          color: #c62828;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .message-form {
          display: flex;
          flex-direction: column;
          gap: 11px;
        }

        .message-form input,
        .message-form textarea {
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

        .message-form input:focus,
        .message-form textarea:focus {
          border-color: #0b5b2f;
        }

        .message-form button,
        .locked-contact-box button {
          border: 0;
          background: #0b5b2f;
          color: white;
          border-radius: 999px;
          padding: 12px 15px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
        }

        .message-form button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .message-status {
          font-size: 14px;
          color: #4f3b25;
        }

        .locked-contact-box {
          border: 1px dashed #d8c3a5;
          background: #fbf8f3;
          border-radius: 18px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .locked-contact-box p {
          color: #4f3b25;
          font-weight: 700;
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

          .hero-content {
            align-items: flex-start;
            flex-direction: column;
            margin-top: -48px;
          }

          .company-main-info {
            width: 100%;
          }

          .list-grid {
            grid-template-columns: 1fr;
          }

          .gallery-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .gallery-item {
            height: 110px;
          }

          h1 {
            font-size: 28px;
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

          .gallery-item {
            height: 125px;
          }
        }
      `}</style>
    </main>
  );
}
