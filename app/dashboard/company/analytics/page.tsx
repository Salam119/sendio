'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  FaBullhorn,
  FaChartLine,
  FaEnvelope,
  FaLink,
  FaMousePointer,
} from 'react-icons/fa';
import { getCompanyId } from '@/lib/getCompanyId';
import { supabase } from '@/lib/supabase';

type CompanyAnalytics = {
  id: string;
  name: string | null;
  views: number | null;
  connections: number | null;
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

export default function AnalyticsPage() {
  const [company, setCompany] = useState<CompanyAnalytics | null>(null);
  const [messagesCount, setMessagesCount] = useState(0);
  const [contactClicksCount, setContactClicksCount] = useState(0);
  const [activeAdsCount, setActiveAdsCount] = useState(0);
  const [activities, setActivities] = useState<CompanyActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadAnalytics() {
      setLoading(true);
      setNotice('');

      const companyId = await getCompanyId();

      if (!isMounted) {
        return;
      }

      if (!companyId) {
        setNotice('Company profile was not found for this account.');
        setLoading(false);
        return;
      }

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name, views, connections')
        .eq('id', companyId)
        .single();

      if (!isMounted) {
        return;
      }

      if (companyError) {
        setNotice(companyError.message);
        setLoading(false);
        return;
      }

      const { count: messagesTotal, error: messagesError } = await supabase
        .from('company_messages')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .neq('event_type', 'contact_click');

      if (!isMounted) {
        return;
      }

      if (messagesError) {
        setNotice(messagesError.message);
        setLoading(false);
        return;
      }

      const { count: contactClicksTotal, error: contactClicksError } =
        await supabase
          .from('company_messages')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('event_type', 'contact_click');

      if (!isMounted) {
        return;
      }

      if (contactClicksError) {
        setNotice(contactClicksError.message);
        setLoading(false);
        return;
      }

      const { count: activeAdsTotal, error: adsError } = await supabase
        .from('company_ads')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('active', true);

      if (!isMounted) {
        return;
      }

      if (adsError) {
        setNotice(adsError.message);
        setLoading(false);
        return;
      }

      const { data: activityData, error: activityError } = await supabase
        .from('company_messages')
        .select(
          'id, name, email, message, source_channel, event_type, created_at',
        )
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(8);

      if (!isMounted) {
        return;
      }

      if (activityError) {
        setNotice(activityError.message);
        setLoading(false);
        return;
      }

      setCompany(companyData as CompanyAnalytics);
      setMessagesCount(messagesTotal ?? 0);
      setContactClicksCount(contactClicksTotal ?? 0);
      setActiveAdsCount(activeAdsTotal ?? 0);
      setActivities((activityData ?? []) as CompanyActivity[]);
      setLoading(false);
    }

    void loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, []);

  const profileViews = Number(company?.views ?? 0);
  const connections = Number(company?.connections ?? 0);

  const totalInteractions = useMemo(() => {
    return messagesCount + contactClicksCount + connections;
  }, [messagesCount, contactClicksCount, connections]);

  const engagementRate = useMemo(() => {
    if (!profileViews) {
      return '0%';
    }

    const rate = (totalInteractions / profileViews) * 100;
    return `${Math.min(rate, 100).toFixed(1)}%`;
  }, [profileViews, totalInteractions]);

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-[var(--sendio-border)] bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--sendio-muted)]">
          Company Analytics
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--sendio-text)]">
          Analytics
        </h1>

        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--sendio-muted)]">
          Monitor profile views, messages, contact clicks, and active ad
          presence for your company profile.
        </p>

        {notice ? (
          <div className="mt-4 rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-4 py-3 text-sm font-bold text-[var(--sendio-text)]">
            {notice}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-[26px] border border-[var(--sendio-border)] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--sendio-muted)]">
              Profile Views
            </p>
            <FaChartLine className="text-[var(--sendio-accent)]" />
          </div>

          <h2 className="mt-4 text-3xl font-black text-[var(--sendio-text)]">
            {profileViews}
          </h2>
        </div>

        <div className="rounded-[26px] border border-[var(--sendio-border)] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--sendio-muted)]">
              Connections
            </p>
            <FaLink className="text-[var(--sendio-accent)]" />
          </div>

          <h2 className="mt-4 text-3xl font-black text-[var(--sendio-text)]">
            {connections}
          </h2>
        </div>

        <div className="rounded-[26px] border border-[var(--sendio-border)] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--sendio-muted)]">
              Messages
            </p>
            <FaEnvelope className="text-[var(--sendio-accent)]" />
          </div>

          <h2 className="mt-4 text-3xl font-black text-[var(--sendio-text)]">
            {messagesCount}
          </h2>
        </div>

        <div className="rounded-[26px] border border-[var(--sendio-border)] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--sendio-muted)]">
              Contact Clicks
            </p>
            <FaMousePointer className="text-[var(--sendio-accent)]" />
          </div>

          <h2 className="mt-4 text-3xl font-black text-[var(--sendio-text)]">
            {contactClicksCount}
          </h2>
        </div>

        <div className="rounded-[26px] border border-[var(--sendio-border)] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--sendio-muted)]">
              Active Ads
            </p>
            <FaBullhorn className="text-[var(--sendio-accent)]" />
          </div>

          <h2 className="mt-4 text-3xl font-black text-[var(--sendio-text)]">
            {activeAdsCount}
          </h2>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-[28px] border border-[var(--sendio-border)] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
            Engagement
          </p>

          <h2 className="mt-2 text-3xl font-black text-[var(--sendio-text)]">
            {engagementRate}
          </h2>

          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--sendio-muted)]">
            Estimated engagement based on views, messages, contact clicks, and
            saved connection events.
          </p>
        </div>

        <div className="rounded-[28px] border border-[var(--sendio-border)] bg-white p-5 shadow-sm xl:col-span-2">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
            Summary
          </p>

          <h2 className="mt-2 text-xl font-black text-[var(--sendio-text)]">
            {company?.name || 'Company profile'}
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--sendio-muted)]">
                Total interactions
              </p>
              <p className="mt-2 text-2xl font-black text-[var(--sendio-text)]">
                {totalInteractions}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--sendio-muted)]">
                Visitor actions
              </p>
              <p className="mt-2 text-2xl font-black text-[var(--sendio-text)]">
                {messagesCount + contactClicksCount}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--sendio-muted)]">
                Ad presence
              </p>
              <p className="mt-2 text-2xl font-black text-[var(--sendio-text)]">
                {activeAdsCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-[var(--sendio-border)] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
              Recent Activity
            </p>

            <h2 className="mt-1 text-xl font-black text-[var(--sendio-text)]">
              Latest visitor interactions
            </h2>
          </div>

          <p className="text-sm font-bold text-[var(--sendio-muted)]">
            {activities.length} latest item{activities.length === 1 ? '' : 's'}
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-4 text-sm font-bold text-[var(--sendio-muted)]">
            Loading analytics...
          </div>
        ) : activities.length ? (
          <div className="space-y-3">
            {activities.map((activity) => {
              const isContactClick = activity.event_type === 'contact_click';
              const channel = activity.source_channel || 'sendio';

              return (
                <article
                  key={activity.id}
                  className="rounded-2xl border border-[var(--sendio-border)] bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-base font-black text-[var(--sendio-text)]">
                        {isContactClick ? 'Contact click' : 'Message received'}
                      </h3>

                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--sendio-muted)]">
                        {channel}
                      </p>
                    </div>

                    <p className="text-xs font-bold text-[var(--sendio-muted)]">
                      {activity.created_at
                        ? new Date(activity.created_at).toLocaleDateString()
                        : 'No date'}
                    </p>
                  </div>

                  <p className="mt-3 text-sm font-semibold leading-6 text-[var(--sendio-muted)]">
                    {activity.message ||
                      activity.email ||
                      activity.name ||
                      'Visitor interaction was recorded.'}
                  </p>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-5">
            <h3 className="text-base font-black text-[var(--sendio-text)]">
              No analytics activity yet
            </h3>

            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--sendio-muted)]">
              Visitor messages, protected contact clicks, and profile activity
              will appear here once clients interact with your company profile.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}