'use client';

import Link from 'next/link';
import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';

type TrackedCompanyAdLinkProps = {
  adId?: string;
  href: string;
  className?: string;
  children: ReactNode;
};

const VISITOR_KEY_STORAGE =
  'sendio_company_ad_visitor_key_v1';

function createVisitorKey() {
  try {
    const savedKey = window.localStorage.getItem(
      VISITOR_KEY_STORAGE
    );

    if (savedKey && savedKey.length >= 8) {
      return savedKey;
    }

    const randomPart =
      typeof window.crypto?.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`;

    const newKey = `sendio-visitor-${randomPart}`;

    window.localStorage.setItem(
      VISITOR_KEY_STORAGE,
      newKey
    );

    return newKey;
  } catch {
    return `sendio-session-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
  }
}

async function recordCompanyAdEvent(
  adId: string,
  eventType: 'view' | 'click',
  visitorKey: string
) {
  const { error } = await supabase.rpc(
    'record_company_ad_event',
    {
      p_ad_id: adId,
      p_event_type: eventType,
      p_visitor_key: visitorKey,
    }
  );

  if (error) {
    console.error(
      `Unable to record advertisement ${eventType}:`,
      error.message
    );
  }
}

export default function TrackedCompanyAdLink({
  adId,
  href,
  className,
  children,
}: TrackedCompanyAdLinkProps) {
  const linkRef = useRef<HTMLAnchorElement | null>(null);
  const visitorKeyRef = useRef<string | null>(null);
  const viewRecordedRef = useRef(false);
  const clickRecordedRef = useRef(false);

  function getVisitorKey() {
    if (!visitorKeyRef.current) {
      visitorKeyRef.current = createVisitorKey();
    }

    return visitorKeyRef.current;
  }

      function recordClick() {
  if (!adId || clickRecordedRef.current) {
    return;
  }

    clickRecordedRef.current = true;

    void recordCompanyAdEvent(
      adId,
      'click',
      getVisitorKey()
    );
  }

  function handlePointerDown(
    event: PointerEvent<HTMLAnchorElement>
  ) {
    if (event.button !== 0) {
      return;
    }

    recordClick();
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLAnchorElement>
  ) {
    if (event.key === 'Enter') {
      recordClick();
    }
  }

       useEffect(() => {
      if (!adId) {
      return;
  }

       const linkElement = linkRef.current;
    if (!linkElement || viewRecordedRef.current) {
      return;
    }

    let visibilityTimer: number | null = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const sufficientlyVisible =
          entry.isIntersecting &&
          entry.intersectionRatio >= 0.55;

        if (!sufficientlyVisible) {
          if (visibilityTimer !== null) {
            window.clearTimeout(visibilityTimer);
            visibilityTimer = null;
          }

          return;
        }

        if (
          visibilityTimer !== null ||
          viewRecordedRef.current
        ) {
          return;
        }

        visibilityTimer = window.setTimeout(() => {
          if (viewRecordedRef.current) {
            return;
          }

          viewRecordedRef.current = true;
          observer.disconnect();

          void recordCompanyAdEvent(
            adId,
            'view',
            getVisitorKey()
          );
        }, 700);
      },
      {
        threshold: [0, 0.55, 1],
      }
    );

    observer.observe(linkElement);

    return () => {
      observer.disconnect();

      if (visibilityTimer !== null) {
        window.clearTimeout(visibilityTimer);
      }
    };
  }, [adId]);

  return (
    <Link
      ref={linkRef}
      href={href}
      className={className}
      data-company-ad-id={adId}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
    >
      {children}
    </Link>
  );
}