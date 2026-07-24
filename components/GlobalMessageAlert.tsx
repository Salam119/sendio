'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  getFloatingNotificationsEnabled,
  getSendioNotificationTargetUrl,
  getUnreadSendioNotifications,
  markSendioNotificationSeen,
  openSendioNotification,
  type SendioNotification,
} from '@/lib/notifications';

export default function GlobalMessageAlert() {
  const pathname = usePathname();
  const router = useRouter();

  const [notification, setNotification] =
    useState<SendioNotification | null>(null);
  const [floatingEnabled, setFloatingEnabled] = useState(true);
  const hiddenNotificationIds = useRef(new Set<string>());

  const isHomePage = pathname === '/';

  const className = useMemo(
    () =>
      isHomePage
        ? 'sendio-global-message-alert sendio-global-message-alert-home'
        : 'sendio-global-message-alert sendio-global-message-alert-floating',
    [isHomePage]
  );

  const targetUrl = useMemo(
    () =>
      notification
        ? getSendioNotificationTargetUrl(notification)
        : '/',
    [notification]
  );
  const isOnNotificationTarget =
  notification !== null &&
  (pathname === targetUrl ||
    pathname.startsWith(`${targetUrl}/`));
  const loadNotificationAlert = useCallback(async () => {
    const enabled = getFloatingNotificationsEnabled();
    setFloatingEnabled(enabled);

    if (!enabled) {
      setNotification(null);
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setNotification(null);
      return;
    }

    const unreadNotifications = await getUnreadSendioNotifications(
      supabase,
      user.id,
      1
    );

    const nextNotification =
      unreadNotifications.find(
        (item) => !hiddenNotificationIds.current.has(item.id)
      ) ?? null;

    setNotification(nextNotification);
  }, []);

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function safeLoadNotificationAlert() {
      try {
        if (!isMounted) return;

        await loadNotificationAlert();
      } catch {
        if (!isMounted) return;

        setNotification(null);
      }
    }

    async function replaceRealtimeChannel(userId: string | null) {
      if (channel) {
        await supabase.removeChannel(channel);
        channel = null;
      }

      if (!isMounted || !userId) {
        return;
      }

      channel = supabase
        .channel(`sendio-notifications-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'sendio_notifications',
            filter: `recipient_id=eq.${userId}`,
          },
          () => {
            void safeLoadNotificationAlert();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'sendio_notifications',
            filter: `recipient_id=eq.${userId}`,
          },
          () => {
            void safeLoadNotificationAlert();
          }
        )
        .subscribe();
    }

    async function initializeNotificationAlert() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      await safeLoadNotificationAlert();
      await replaceRealtimeChannel(user?.id ?? null);
    }

    void initializeNotificationAlert();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void safeLoadNotificationAlert();
        void replaceRealtimeChannel(session?.user.id ?? null);
      }
    );

    function handleFloatingSettingChanged() {
      void safeLoadNotificationAlert();
    }

    window.addEventListener(
      'sendio-floating-notifications-changed',
      handleFloatingSettingChanged
    );

    window.addEventListener('storage', handleFloatingSettingChanged);

    const refreshInterval = window.setInterval(() => {
      void safeLoadNotificationAlert();
    }, 30000);

    return () => {
      isMounted = false;

      authListener.subscription.unsubscribe();

      window.clearInterval(refreshInterval);

      window.removeEventListener(
        'sendio-floating-notifications-changed',
        handleFloatingSettingChanged
      );

      window.removeEventListener('storage', handleFloatingSettingChanged);

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [loadNotificationAlert]);

  useEffect(() => {
    if (!notification || !isOnNotificationTarget) {
      return;
    }

    const selectedNotification = notification;
    hiddenNotificationIds.current.add(selectedNotification.id);

    let cancelled = false;

    async function markTargetNotificationSeen() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled || userError || !user) {
        return;
      }

      try {
        await markSendioNotificationSeen(
          supabase,
          selectedNotification.id,
          user.id
        );
      } catch {
        hiddenNotificationIds.current.delete(selectedNotification.id);
      }
    }

    void markTargetNotificationSeen();

    return () => {
      cancelled = true;
    };
  }, [isOnNotificationTarget, notification]);

  async function handleOpenAlert(event: MouseEvent<HTMLAnchorElement>) {
    if (!notification) return;

    event.preventDefault();

    const selectedNotification = notification;
    const selectedTargetUrl =
      getSendioNotificationTargetUrl(selectedNotification);

    hiddenNotificationIds.current.add(selectedNotification.id);
    setNotification(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      hiddenNotificationIds.current.delete(selectedNotification.id);
      return;
    }

    try {
      const openedTargetUrl = await openSendioNotification(
        supabase,
        selectedNotification.id,
        user.id
      );

      router.push(openedTargetUrl || selectedTargetUrl);
    } catch {
      hiddenNotificationIds.current.delete(selectedNotification.id);
      router.push(selectedTargetUrl);
    }
  }
   if (
      !floatingEnabled ||
      !notification ||
      isOnNotificationTarget
     ) {
  return null;
  }
  return (
    <>
      <Link
        href={targetUrl}
        className={className}
        aria-label={notification.title || 'Message waiting'}
        title={notification.title || 'Message waiting'}
        onClick={handleOpenAlert}
      >
        <span className="sendio-global-message-alert-icon">✉</span>
        <span className="sendio-global-message-alert-text">
          {notification.title || 'Message waiting'}
        </span>
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
          max-width: min(280px, 64vw);
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          letter-spacing: -0.01em;
        }

        .sendio-global-message-alert-dot {
          position: relative;
          width: 9px;
          height: 9px;
          flex: 0 0 auto;
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
