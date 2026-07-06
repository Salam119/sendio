'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type AlertRole = 'company' | 'worker' | 'client';

type AlertTarget = {
  href: string;
  role: AlertRole;
  ownerId?: string;
  requestIds?: string[];
};

type ProfileRow = {
  user_type: string | null;
};

type OwnerRow = {
  id: string;
};

type ServiceRequestRow = {
  id: string;
};

export default function GlobalMessageAlert() {
  const pathname = usePathname();
  const router = useRouter();
  const [target, setTarget] = useState<AlertTarget | null>(null);

  const isHomePage = pathname === '/';

  const className = useMemo(
    () =>
      isHomePage
        ? 'sendio-global-message-alert sendio-global-message-alert-home'
        : 'sendio-global-message-alert sendio-global-message-alert-floating',
    [isHomePage]
  );

      const setAlertTarget = useCallback(
    (nextTarget: AlertTarget) => {
      if (pathname === nextTarget.href) {
        setTarget(null);
        return;
      }

      setTarget(nextTarget);
    },
    [pathname]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadMessageAlert() {
      setTarget(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (userError || !user) {
        setTarget(null);
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      const userType =
        (profileData as ProfileRow | null)?.user_type ??
        user.user_metadata?.user_type ??
        null;

      if (userType === 'company') {
        const { data: companyData } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!isMounted) return;

        if (!companyData) {
          setTarget(null);
          return;
        }

        const company = companyData as OwnerRow;

        const { count: messagesCount, error: messagesError } = await supabase
          .from('company_messages')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .eq('company_seen', false)
          .eq('is_archived', false);

        if (!isMounted) return;

        if (
          !messagesError &&
          typeof messagesCount === 'number' &&
          messagesCount > 0
        ) {
          setAlertTarget({
            href: '/dashboard/company/messages',
            role: 'company',
            ownerId: company.id,
          });
          return;
        }

        const { count: serviceRequestsCount, error: serviceRequestsError } =
          await supabase
            .from('service_request_matches')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', company.id)
            .eq('provider_seen', false)
            .neq('status', 'cancelled');

        if (!isMounted) return;

        if (
          !serviceRequestsError &&
          typeof serviceRequestsCount === 'number' &&
          serviceRequestsCount > 0
        ) {
          setAlertTarget({
            href: '/dashboard/company/messages',
            role: 'company',
            ownerId: company.id,
          });
          return;
        }

        setTarget(null);
        return;
      }

      if (userType === 'worker') {
        const { data: workerData } = await supabase
          .from('workers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!isMounted) return;

        if (!workerData) {
          setTarget(null);
          return;
        }

        const worker = workerData as OwnerRow;

        const { count: workerRequestsCount, error: workerRequestsError } =
          await supabase
            .from('worker_requests')
            .select('id', { count: 'exact', head: true })
            .eq('worker_id', worker.id)
            .eq('worker_seen', false)
            .eq('is_archived', false);

        if (!isMounted) return;

        if (
          !workerRequestsError &&
          typeof workerRequestsCount === 'number' &&
          workerRequestsCount > 0
        ) {
          setAlertTarget({
            href: '/dashboard/worker/requests',
            role: 'worker',
            ownerId: worker.id,
          });
          return;
        }

        const { count: serviceRequestsCount, error: serviceRequestsError } =
          await supabase
            .from('service_request_matches')
            .select('id', { count: 'exact', head: true })
            .eq('worker_id', worker.id)
            .eq('provider_seen', false)
            .neq('status', 'cancelled');

        if (!isMounted) return;

        if (
          !serviceRequestsError &&
          typeof serviceRequestsCount === 'number' &&
          serviceRequestsCount > 0
        ) {
          setAlertTarget({
            href: '/dashboard/worker/requests',
            role: 'worker',
            ownerId: worker.id,
          });
          return;
        }

        setTarget(null);
        return;
      }

      if (userType === 'client') {
        const { data: clientRequests, error: clientRequestsError } =
          await supabase
            .from('service_requests')
            .select('id')
            .eq('client_id', user.id)
            .limit(50);

        if (!isMounted) return;

        if (clientRequestsError || !clientRequests?.length) {
          setTarget(null);
          return;
        }

        const requestIds = (clientRequests as ServiceRequestRow[]).map(
          (request) => request.id
        );

        const { count, error } = await supabase
          .from('service_request_matches')
          .select('id', { count: 'exact', head: true })
          .in('request_id', requestIds)
          .eq('client_seen', false)
          .neq('status', 'pending')
          .neq('status', 'cancelled');

        if (!isMounted) return;

        if (!error && typeof count === 'number' && count > 0) {
          setAlertTarget({
            href: '/clients',
            role: 'client',
            requestIds,
          });
          return;
        }

        setTarget(null);
        return;
      }

      setTarget(null);
    }

    void loadMessageAlert();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void loadMessageAlert();
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
    }, [pathname, setAlertTarget]);

  async function markCompanyAlertSeen(ownerId: string) {
    await Promise.all([
      supabase
        .from('company_messages')
        .update({
          company_seen: true,
          status: 'seen',
        })
        .eq('company_id', ownerId)
        .eq('company_seen', false)
        .eq('is_archived', false),

      supabase
        .from('service_request_matches')
        .update({
          provider_seen: true,
        })
        .eq('company_id', ownerId)
        .eq('provider_seen', false)
        .neq('status', 'cancelled'),
    ]);
  }

  async function markWorkerAlertSeen(ownerId: string) {
    await Promise.all([
      supabase
        .from('worker_requests')
        .update({
          worker_seen: true,
          status: 'seen',
        })
        .eq('worker_id', ownerId)
        .eq('worker_seen', false)
        .eq('is_archived', false),

      supabase
        .from('service_request_matches')
        .update({
          provider_seen: true,
        })
        .eq('worker_id', ownerId)
        .eq('provider_seen', false)
        .neq('status', 'cancelled'),
    ]);
  }

  async function markClientAlertSeen(requestIds: string[]) {
    if (requestIds.length === 0) return;

    await supabase
      .from('service_request_matches')
      .update({
        client_seen: true,
      })
      .in('request_id', requestIds)
      .eq('client_seen', false)
      .neq('status', 'pending')
      .neq('status', 'cancelled');
  }

  async function handleOpenAlert(event: MouseEvent<HTMLAnchorElement>) {
    if (!target) return;

    event.preventDefault();

    const selectedTarget = target;

    setTarget(null);

    if (selectedTarget.role === 'company' && selectedTarget.ownerId) {
      await markCompanyAlertSeen(selectedTarget.ownerId);
    }

    if (selectedTarget.role === 'worker' && selectedTarget.ownerId) {
      await markWorkerAlertSeen(selectedTarget.ownerId);
    }

    if (selectedTarget.role === 'client' && selectedTarget.requestIds) {
      await markClientAlertSeen(selectedTarget.requestIds);
    }

    router.push(selectedTarget.href);
  }

  if (!target) {
    return null;
  }

  return (
    <>
      <Link
        href={target.href}
        className={className}
        aria-label="Message waiting"
        title="Message waiting"
        onClick={handleOpenAlert}
      >
        <span className="sendio-global-message-alert-icon">✉</span>
        <span className="sendio-global-message-alert-text">Message waiting</span>
        <span className="sendio-global-message-alert-dot" />
      </Link>

      <style jsx global>{`
        .sendio-global-message-alert {
          --message-alert-bg: color-mix(
            in srgb,
            var(--sendio-soft, #eef6ff) 70%,
            #ffffff 30%
          );
          --message-alert-border: var(--sendio-border, #dbeafe);
          --message-alert-text: var(--sendio-text, #111827);
          --message-alert-muted: var(--sendio-muted, #374151);
          --message-alert-accent: var(--sendio-accent, #29b9f3);

          z-index: 45;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 42px;
          padding: 10px 15px;
          border-radius: 999px;
          border: 1px solid var(--message-alert-border);
          background:
            linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.86),
              rgba(255, 255, 255, 0.58)
            ),
            var(--message-alert-bg);
          color: var(--message-alert-text);
          text-decoration: none;
          font-size: 13px;
          font-weight: 900;
          line-height: 1;
          box-shadow:
            0 14px 34px rgba(15, 23, 42, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(18px);
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            border-color 0.18s ease;
        }

        .sendio-global-message-alert:hover {
          border-color: color-mix(
            in srgb,
            var(--message-alert-accent) 32%,
            var(--message-alert-border) 68%
          );
          box-shadow:
            0 18px 42px rgba(15, 23, 42, 0.16),
            0 0 0 4px rgba(34, 197, 94, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.92);
        }

        .sendio-global-message-alert-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.72);
          color: var(--message-alert-muted);
          font-size: 13px;
          box-shadow: inset 0 0 0 1px var(--message-alert-border);
        }

        .sendio-global-message-alert-text {
          white-space: nowrap;
          letter-spacing: -0.01em;
        }

        .sendio-global-message-alert-dot {
          position: relative;
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #22c55e;
          box-shadow:
            0 0 0 4px rgba(34, 197, 94, 0.14),
            0 0 18px rgba(34, 197, 94, 0.52);
        }

        .sendio-global-message-alert-dot::after {
          content: '';
          position: absolute;
          inset: -5px;
          border-radius: inherit;
          border: 1px solid rgba(34, 197, 94, 0.36);
          animation: sendioGlobalMessagePulse 1.8s ease-out infinite;
        }

        .sendio-global-message-alert-home {
          position: fixed;
          top: 138px;
          right: clamp(18px, 8vw, 130px);
        }

        .sendio-global-message-alert-home:hover {
          transform: translateY(-2px);
        }

        .sendio-global-message-alert-floating {
          position: fixed;
          right: 22px;
          bottom: 24px;
        }

        .sendio-global-message-alert-floating:hover {
          transform: translateY(-2px);
        }

        @keyframes sendioGlobalMessagePulse {
          0% {
            opacity: 0.85;
            transform: scale(0.72);
          }

          100% {
            opacity: 0;
            transform: scale(1.6);
          }
        }

        @media (max-width: 760px) {
          .sendio-global-message-alert-home {
            top: 118px;
            right: 14px;
          }

          .sendio-global-message-alert-floating {
            right: 14px;
            bottom: 16px;
          }

          .sendio-global-message-alert {
            min-height: 40px;
            padding: 9px 13px;
            font-size: 12px;
          }
        }
      `}</style>
    </>
  );
}