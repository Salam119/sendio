'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  FaBullhorn,
  FaChartLine,
  FaEnvelope,
  FaLink,
  FaMousePointer,
} from 'react-icons/fa';
import { FaStar } from 'react-icons/fa6';
import { getCompanyId } from '@/lib/getCompanyId';
import { supabase } from '@/lib/supabase';

type CompanyStatus = 'available' | 'busy' | 'closed';
type ThemeMode = 'auto' | 'fixed';
type ThemeName = 'Sky' | 'Lavender' | 'Mint';
type OpenSection = 'settings' | 'reviews' | 'analytics' | null;

type CompanySettings = {
  id: string;
  name: string | null;
  slug: string | null;
  status: CompanyStatus | null;
  working_hours: string | null;
  views: number | null;
  connections: number | null;
};

type CompanyReview = {
  id: string;
  company_id: string;
  user_name: string | null;
  rating: number | null;
  comment: string | null;
  created_at: string | null;
};

type CompanyActivity = {
  id: string;
  name: string | null;
  email: string | null;
  message: string | null;
  source_channel: string | null;
  event_type: string | null;
  created_at: string | null;
};

const themeOptions: ThemeName[] = ['Sky', 'Lavender', 'Mint'];

function formatDate(value: string | null) {
  if (!value) return 'No date';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'No date';

  return date.toLocaleDateString();
}

export default function CompanySettingsPage() {
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [accountEmail, setAccountEmail] = useState('');
  const [status, setStatus] = useState<CompanyStatus>('available');
  const [workingHours, setWorkingHours] = useState('');
  const [themeMode, setThemeMode] = useState<ThemeMode>('auto');
  const [themeName, setThemeName] = useState<ThemeName>('Sky');

  const [reviews, setReviews] = useState<CompanyReview[]>([]);
  const [messagesCount, setMessagesCount] = useState(0);
  const [contactClicksCount, setContactClicksCount] = useState(0);
  const [activeAdsCount, setActiveAdsCount] = useState(0);
  const [activities, setActivities] = useState<CompanyActivity[]>([]);

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);

  const [settingsNotice, setSettingsNotice] = useState('');
  const [reviewsNotice, setReviewsNotice] = useState('');
  const [analyticsNotice, setAnalyticsNotice] = useState('');

  const [openSection, setOpenSection] = useState<OpenSection>('settings');
  const [openReviewId, setOpenReviewId] = useState<string | null>(null);
  const [openActivityId, setOpenActivityId] = useState<string | null>(null);

  useEffect(() => {
  let openSectionTimer: number | null = null;

  const searchParams = new URLSearchParams(window.location.search);
  const requestedSection = searchParams.get('section');
  const legacyHash = window.location.hash
    .replace(/^#/, '')
    .split('#')[0];

  const section = requestedSection || legacyHash;

  if (
    section === 'reviews' ||
    section === 'analytics' ||
    section === 'settings'
  ) {
    openSectionTimer = window.setTimeout(() => {
      setOpenSection(section);
    }, 0);
  }

  if (window.location.hash) {
    const cleanUrl = new URL(window.location.href);
    cleanUrl.hash = '';

    if (section === 'reviews' || section === 'analytics') {
      cleanUrl.searchParams.set('section', section);
    } else {
      cleanUrl.searchParams.delete('section');
    }

    window.history.replaceState(
      null,
      '',
      `${cleanUrl.pathname}${cleanUrl.search}`,
    );
  }

  return () => {
    if (openSectionTimer !== null) {
      window.clearTimeout(openSectionTimer);
    }
  };
}, []);
  useEffect(() => {
    let isMounted = true;

    async function loadPageData() {
      setLoadingSettings(true);
      setLoadingReviews(true);
      setLoadingAnalytics(true);
      setSettingsNotice('');
      setReviewsNotice('');
      setAnalyticsNotice('');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      setAccountEmail(user?.email ?? '');

      const companyId = await getCompanyId();

      if (!isMounted) return;

      if (!companyId) {
        const message = 'Company profile was not found for this account.';
        setSettingsNotice(message);
        setReviewsNotice(message);
        setAnalyticsNotice(message);
        setLoadingSettings(false);
        setLoadingReviews(false);
        setLoadingAnalytics(false);
        return;
      }

      const [
        companyResult,
        reviewsResult,
        messagesResult,
        contactClicksResult,
        activeAdsResult,
        activitiesResult,
      ] = await Promise.all([
        supabase
          .from('companies')
          .select(
            'id, name, slug, status, working_hours, views, connections',
          )
          .eq('id', companyId)
          .single(),
        supabase
          .from('company_reviews')
          .select('id, company_id, user_name, rating, comment, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false }),
        supabase
          .from('company_messages')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .neq('event_type', 'contact_click'),
        supabase
          .from('company_messages')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('event_type', 'contact_click'),
        supabase
          .from('company_ads')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('active', true),
        supabase
          .from('company_messages')
          .select(
            'id, name, email, message, source_channel, event_type, created_at',
          )
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

      if (!isMounted) return;

      if (companyResult.error) {
        setSettingsNotice(companyResult.error.message);
      } else {
        const companyData = companyResult.data as CompanySettings;
        setCompany(companyData);
        setStatus(companyData.status ?? 'available');
        setWorkingHours(companyData.working_hours ?? '');

        const savedMode = window.localStorage.getItem(
          'sendio-company-theme-mode',
        );
        const savedTheme = window.localStorage.getItem('sendio-company-theme');

        if (savedMode === 'fixed' || savedMode === 'auto') {
          setThemeMode(savedMode);
        }

        if (
          savedTheme === 'Sky' ||
          savedTheme === 'Lavender' ||
          savedTheme === 'Mint'
        ) {
          setThemeName(savedTheme);
        }
      }

      if (reviewsResult.error) {
        setReviewsNotice(reviewsResult.error.message);
      } else {
        setReviews((reviewsResult.data ?? []) as CompanyReview[]);
      }

      const analyticsErrors = [
        messagesResult.error,
        contactClicksResult.error,
        activeAdsResult.error,
        activitiesResult.error,
      ].filter(Boolean);

      if (analyticsErrors.length) {
        setAnalyticsNotice(analyticsErrors[0]?.message ?? 'Analytics failed to load.');
      } else {
        setMessagesCount(messagesResult.count ?? 0);
        setContactClicksCount(contactClicksResult.count ?? 0);
        setActiveAdsCount(activeAdsResult.count ?? 0);
        setActivities((activitiesResult.data ?? []) as CompanyActivity[]);
      }

      setLoadingSettings(false);
      setLoadingReviews(false);
      setLoadingAnalytics(false);
    }

    void loadPageData();

    return () => {
      isMounted = false;
    };
  }, []);

  async function saveCompanySettings() {
    if (!company) {
      setSettingsNotice('Company profile was not found.');
      return;
    }

    setSavingCompany(true);
    setSettingsNotice('');

    const { error } = await supabase
      .from('companies')
      .update({
        status,
        working_hours: workingHours.trim() || null,
      })
      .eq('id', company.id);

    if (error) {
      setSettingsNotice(error.message);
      setSavingCompany(false);
      return;
    }

    setCompany((current) =>
      current
        ? {
            ...current,
            status,
            working_hours: workingHours.trim() || null,
          }
        : current,
    );

    setSettingsNotice('Company settings saved successfully.');
    setSavingCompany(false);
  }

  function saveThemeSettings() {
    setSavingTheme(true);
    setSettingsNotice('');

    window.localStorage.setItem('sendio-company-theme-mode', themeMode);
    window.localStorage.setItem('sendio-company-theme', themeName);

    setSettingsNotice('Dashboard theme saved. The page will refresh to apply it.');

    window.setTimeout(() => {
      window.location.reload();
    }, 700);
  }

  function toggleSection(section: Exclude<OpenSection, null>) {
    setOpenSection((current) => {
      const nextSection = current === section ? null : section;
      const nextUrl = new URL(window.location.href);

      nextUrl.hash = '';

      if (nextSection === 'reviews' || nextSection === 'analytics') {
        nextUrl.searchParams.set('section', nextSection);
      } else {
        nextUrl.searchParams.delete('section');
      }

      window.history.replaceState(
        null,
        '',
        `${nextUrl.pathname}${nextUrl.search}`,
      );

      return nextSection;
    });
  }

  const publicProfileHref = company?.slug
    ? `/companies/${company.slug}`
    : '/dashboard/company';

  const totalReviews = reviews.length;

  const averageRating = useMemo(() => {
    if (!reviews.length) return '0.0';

    const total = reviews.reduce(
      (sum, review) => sum + Number(review.rating ?? 0),
      0,
    );

    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  const recommendations = useMemo(
    () => reviews.filter((review) => Number(review.rating ?? 0) >= 4).length,
    [reviews],
  );

  const latestReviewDate = reviews[0]?.created_at
    ? formatDate(reviews[0].created_at)
    : 'No reviews yet';

  const profileViews = Number(company?.views ?? 0);
  const connections = Number(company?.connections ?? 0);

  const totalInteractions = useMemo(
    () => messagesCount + contactClicksCount + connections,
    [messagesCount, contactClicksCount, connections],
  );

  const engagementRate = useMemo(() => {
    if (!profileViews) return '0%';

    const rate = (totalInteractions / profileViews) * 100;
    return `${Math.min(rate, 100).toFixed(1)}%`;
  }, [profileViews, totalInteractions]);

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-4">
      <section className="rounded-[28px] border border-[var(--sendio-border)] bg-[var(--sendio-card)] p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--sendio-muted)]">
              Company Settings
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--sendio-text)]">
              Settings
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--sendio-muted)]">
              Manage settings, reviews, and analytics from one mobile-friendly
              page.
            </p>
          </div>

          <Link
            href={publicProfileHref}
            className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-4 py-2 text-center text-sm font-black text-[var(--sendio-text)] transition hover:bg-[var(--sendio-soft-hover)]"
          >
            Open public profile
          </Link>
        </div>
      </section>

      <AccordionSection
        title="Settings"
        subtitle="Availability, account safety, and dashboard theme"
        isOpen={openSection === 'settings'}
        onToggle={() => toggleSection('settings')}
      >
        {settingsNotice ? <Notice text={settingsNotice} /> : null}

        {loadingSettings ? (
          <LoadingBox text="Loading company settings..." />
        ) : (
          <div className="space-y-4">
            <section className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-card)] p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
                Availability
              </p>
              <h2 className="mt-1 text-xl font-black text-[var(--sendio-text)]">
                Company status
              </h2>
              <p className="mt-1 text-sm font-semibold text-[var(--sendio-muted)]">
                This status appears on your public company profile.
              </p>

              <div className="mt-4 grid gap-4">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.15em] text-[var(--sendio-muted)]">
                    Status
                  </span>
                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as CompanyStatus)
                    }
                    className="w-full rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-card)] px-4 py-3 text-sm font-bold text-[var(--sendio-text)] outline-none focus:border-[var(--sendio-accent)]"
                  >
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.15em] text-[var(--sendio-muted)]">
                    Working hours
                  </span>
                  <input
                    value={workingHours}
                    onChange={(event) => setWorkingHours(event.target.value)}
                    placeholder="Example: Mon - Fri, 09:00 - 18:00"
                    className="w-full rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-card)] px-4 py-3 text-sm font-semibold text-[var(--sendio-text)] outline-none placeholder:text-[var(--sendio-muted)] focus:border-[var(--sendio-accent)]"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={saveCompanySettings}
                disabled={savingCompany}
                className="mt-5 w-full rounded-full bg-[var(--sendio-accent)] px-5 py-2.5 text-sm font-black text-[var(--sendio-accent-text)] transition hover:opacity-90 disabled:opacity-60"
              >
                {savingCompany ? 'Saving...' : 'Save company settings'}
              </button>
            </section>

            <section className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-card)] p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
                Account
              </p>
              <h2 className="mt-1 text-xl font-black text-[var(--sendio-text)]">
                Safety
              </h2>

              <div className="mt-4 space-y-3 rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--sendio-muted)]">
                    Company
                  </p>
                  <p className="mt-1 text-sm font-black text-[var(--sendio-text)]">
                    {company?.name || 'Company profile'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--sendio-muted)]">
                    Account email
                  </p>
                  <p className="mt-1 break-all text-sm font-bold text-[var(--sendio-text)]">
                    {accountEmail || 'Not available'}
                  </p>
                </div>

                <p className="text-xs font-bold leading-5 text-[var(--sendio-muted)]">
                  Account type and permissions are protected and managed by
                  Sendio admin rules.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-card)] p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
                Appearance
              </p>
              <h2 className="mt-1 text-xl font-black text-[var(--sendio-text)]">
                Dashboard theme
              </h2>
              <p className="mt-1 text-sm font-semibold text-[var(--sendio-muted)]">
                Choose automatic color rotation or a fixed Sendio theme.
              </p>

              <div className="mt-4 grid gap-4">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.15em] text-[var(--sendio-muted)]">
                    Theme mode
                  </span>
                  <select
                    value={themeMode}
                    onChange={(event) =>
                      setThemeMode(event.target.value as ThemeMode)
                    }
                    className="w-full rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-card)] px-4 py-3 text-sm font-bold text-[var(--sendio-text)] outline-none focus:border-[var(--sendio-accent)]"
                  >
                    <option value="auto">Auto rotate</option>
                    <option value="fixed">Fixed theme</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.15em] text-[var(--sendio-muted)]">
                    Fixed theme
                  </span>
                  <select
                    value={themeName}
                    onChange={(event) =>
                      setThemeName(event.target.value as ThemeName)
                    }
                    className="w-full rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-card)] px-4 py-3 text-sm font-bold text-[var(--sendio-text)] outline-none focus:border-[var(--sendio-accent)]"
                  >
                    {themeOptions.map((theme) => (
                      <option key={theme} value={theme}>
                        {theme}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button
                type="button"
                onClick={saveThemeSettings}
                disabled={savingTheme}
                className="mt-5 w-full rounded-full border border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-5 py-2.5 text-sm font-black text-[var(--sendio-text)] transition hover:bg-[var(--sendio-soft-hover)] disabled:opacity-60"
              >
                {savingTheme ? 'Applying...' : 'Save theme settings'}
              </button>
            </section>
          </div>
        )}
      </AccordionSection>

      <AccordionSection
        title="Reviews"
        subtitle="Ratings, recommendations, and customer comments"
        isOpen={openSection === 'reviews'}
        onToggle={() => toggleSection('reviews')}
      >
        {reviewsNotice ? <Notice text={reviewsNotice} /> : null}

        {loadingReviews ? (
          <LoadingBox text="Loading reviews..." />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="Average Rating">
                <div className="flex items-center gap-2">
                  <strong>{averageRating}</strong>
                  <FaStar className="text-[var(--sendio-accent)]" />
                </div>
              </MetricCard>
              <MetricCard label="Total Reviews" value={totalReviews} />
              <MetricCard label="Recommendations" value={recommendations} />
              <MetricCard label="Latest Review" smallValue={latestReviewDate} />
            </div>

            <section className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-card)] p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
                    Feedback
                  </p>
                  <h2 className="mt-1 text-xl font-black text-[var(--sendio-text)]">
                    Customer comments
                  </h2>
                </div>
                <p className="text-sm font-bold text-[var(--sendio-muted)]">
                  {totalReviews}
                </p>
              </div>

              {reviews.length ? (
                <div className="mt-4 space-y-2">
                  {reviews.map((review) => {
                    const rating = Math.max(
                      0,
                      Math.min(5, Number(review.rating ?? 0)),
                    );
                    const isOpen = openReviewId === review.id;

                    return (
                      <article
                        key={review.id}
                        className="overflow-hidden rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-card)]"
                      >
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() =>
                            setOpenReviewId((current) =>
                              current === review.id ? null : review.id,
                            )
                          }
                          className="flex w-full items-center justify-between gap-3 p-4 text-left"
                        >
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-black text-[var(--sendio-text)]">
                              {review.user_name || 'Sendio customer'}
                            </h3>
                            <p className="mt-1 text-xs font-bold text-[var(--sendio-muted)]">
                              {formatDate(review.created_at)}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <div className="flex items-center gap-1 rounded-full border border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-2 py-1">
                              {Array.from({ length: 5 }).map((_, index) => (
                                <FaStar
                                  key={`${review.id}-star-${index}`}
                                  className={
                                    index < rating
                                      ? 'text-[var(--sendio-accent)]'
                                      : 'text-[var(--sendio-border)]'
                                  }
                                />
                              ))}
                            </div>
                            <span className="text-lg font-black text-[var(--sendio-muted)]">
                              {isOpen ? '−' : '+'}
                            </span>
                          </div>
                        </button>

                        {isOpen ? (
                          <div className="border-t border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-4 py-3">
                            <p className="text-sm font-semibold leading-6 text-[var(--sendio-muted)]">
                              {review.comment ||
                                'No written comment was provided.'}
                            </p>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-5">
                  <h3 className="text-base font-black text-[var(--sendio-text)]">
                    No reviews yet
                  </h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--sendio-muted)]">
                    Customer reviews will appear here after clients rate your
                    company from the public profile.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </AccordionSection>

      <AccordionSection
        title="Analytics"
        subtitle="Profile performance and latest visitor interactions"
        isOpen={openSection === 'analytics'}
        onToggle={() => toggleSection('analytics')}
      >
        {analyticsNotice ? <Notice text={analyticsNotice} /> : null}

        {loadingAnalytics ? (
          <LoadingBox text="Loading analytics..." />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <IconMetricCard
                label="Profile Views"
                value={profileViews}
                icon={<FaChartLine />}
              />
              <IconMetricCard
                label="Connections"
                value={connections}
                icon={<FaLink />}
              />
              <IconMetricCard
                label="Messages"
                value={messagesCount}
                icon={<FaEnvelope />}
              />
              <IconMetricCard
                label="Contact Clicks"
                value={contactClicksCount}
                icon={<FaMousePointer />}
              />
              <IconMetricCard
                label="Active Ads"
                value={activeAdsCount}
                icon={<FaBullhorn />}
              />
              <MetricCard label="Engagement" value={engagementRate} />
            </div>

            <section className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-card)] p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
                Summary
              </p>
              <h2 className="mt-2 text-xl font-black text-[var(--sendio-text)]">
                {company?.name || 'Company profile'}
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <SmallMetric label="Total interactions" value={totalInteractions} />
                <SmallMetric
                  label="Visitor actions"
                  value={messagesCount + contactClicksCount}
                />
                <SmallMetric label="Ad presence" value={activeAdsCount} />
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-card)] p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
                    Recent Activity
                  </p>
                  <h2 className="mt-1 text-xl font-black text-[var(--sendio-text)]">
                    Latest visitor interactions
                  </h2>
                </div>
                <p className="text-sm font-bold text-[var(--sendio-muted)]">
                  {activities.length}
                </p>
              </div>

              {activities.length ? (
                <div className="mt-4 space-y-2">
                  {activities.map((activity) => {
                    const isContactClick =
                      activity.event_type === 'contact_click';
                    const channel = activity.source_channel || 'sendio';
                    const isOpen = openActivityId === activity.id;

                    return (
                      <article
                        key={activity.id}
                        className="overflow-hidden rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-card)]"
                      >
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() =>
                            setOpenActivityId((current) =>
                              current === activity.id ? null : activity.id,
                            )
                          }
                          className="flex w-full items-center justify-between gap-3 p-4 text-left"
                        >
                          <div className="min-w-0">
                            <h3 className="text-sm font-black text-[var(--sendio-text)]">
                              {isContactClick
                                ? 'Contact click'
                                : 'Message received'}
                            </h3>
                            <p className="mt-1 truncate text-xs font-bold uppercase tracking-[0.14em] text-[var(--sendio-muted)]">
                              {channel} · {formatDate(activity.created_at)}
                            </p>
                          </div>
                          <span className="shrink-0 text-lg font-black text-[var(--sendio-muted)]">
                            {isOpen ? '−' : '+'}
                          </span>
                        </button>

                        {isOpen ? (
                          <div className="border-t border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-4 py-3">
                            <p className="text-sm font-semibold leading-6 text-[var(--sendio-muted)]">
                              {activity.message ||
                                activity.email ||
                                activity.name ||
                                'Visitor interaction was recorded.'}
                            </p>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-5">
                  <h3 className="text-base font-black text-[var(--sendio-text)]">
                    No analytics activity yet
                  </h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--sendio-muted)]">
                    Visitor messages, protected contact clicks, and profile
                    activity will appear here once clients interact with your
                    company profile.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </AccordionSection>
    </div>
  );
}

function AccordionSection({
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-[var(--sendio-border)] bg-[var(--sendio-card)] shadow-sm">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 bg-[var(--sendio-soft)] p-5 text-left transition hover:bg-[var(--sendio-soft-hover)]"
      >
        <div>
          <h2 className="text-xl font-black text-[var(--sendio-text)]">
            {title}
          </h2>
          <p className="mt-1 text-xs font-bold leading-5 text-[var(--sendio-muted)]">
            {subtitle}
          </p>
        </div>

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--sendio-border)] bg-[var(--sendio-card)] text-xl font-black text-[var(--sendio-text)]">
          {isOpen ? '−' : '+'}
        </span>
      </button>

      {isOpen ? (
        <div className="border-t border-[var(--sendio-border)] p-4 sm:p-5">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <div className="mb-4 rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-4 py-3 text-sm font-bold text-[var(--sendio-text)]">
      {text}
    </div>
  );
}

function LoadingBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-4 text-sm font-bold text-[var(--sendio-muted)]">
      {text}
    </div>
  );
}

function MetricCard({
  label,
  value,
  smallValue,
  children,
}: {
  label: string;
  value?: number | string;
  smallValue?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-4">
      <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--sendio-muted)]">
        {label}
      </p>
      <div className="mt-3 text-3xl font-black text-[var(--sendio-text)]">
        {children ?? value}
      </div>
      {smallValue ? (
        <p className="mt-3 text-sm font-black text-[var(--sendio-text)]">
          {smallValue}
        </p>
      ) : null}
    </div>
  );
}

function IconMetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-card)] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--sendio-muted)]">
          {label}
        </p>
        <span className="text-[var(--sendio-accent)]">{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-black text-[var(--sendio-text)]">
        {value}
      </p>
    </div>
  );
}

function SmallMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--sendio-muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-[var(--sendio-text)]">
        {value}
      </p>
    </div>
  );
}
