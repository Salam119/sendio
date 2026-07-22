'use client';

import Image from 'next/image';
import {
  useEffect,
  useState,
  type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';

type CompanyAdMediaPreviewProps = {
  adId: string;
  mediaUrl: string | null;
  isVideo: boolean;
  alt: string;
  fallbackLetter: string;
};

const VISITOR_KEY_STORAGE =
  'sendio_company_ad_visitor_key_v1';

function getVisitorKey() {
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

async function recordPreviewClick(adId: string) {
  const { error } = await supabase.rpc(
    'record_company_ad_event',
    {
      p_ad_id: adId,
      p_event_type: 'click',
      p_visitor_key: getVisitorKey(),
    }
  );

  if (error) {
    console.error(
      'Unable to record advertisement preview click:',
      error.message
    );
  }
}

export default function CompanyAdMediaPreview({
  adId,
  mediaUrl,
  isVideo,
  alt,
  fallbackLetter,
}: CompanyAdMediaPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
   // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        'keydown',
        handleEscape
      );
    };
  }, [isOpen]);

  function openPreview() {
    setIsOpen(true);

    // Opening the media preview counts as a real click.
    void recordPreviewClick(adId);
  }

  function handleBackdropClick(
    event: MouseEvent<HTMLDivElement>
  ) {
    if (event.target === event.currentTarget) {
      setIsOpen(false);
    }
  }

  const modal =
    isMounted && isOpen
      ? createPortal(
          <div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Advertisement media preview"
            onMouseDown={handleBackdropClick}
          >
            <div className="relative flex max-h-[94vh] w-full max-w-[390px] items-center justify-center">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute right-[-2px] top-[-2px] z-20 flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-white text-2xl font-black text-[#111827] shadow-xl hover:bg-[#eef6ff]"
                aria-label="Close advertisement preview"
              >
                ×
              </button>

              <div
                className="relative w-full overflow-hidden border-[11px] border-black bg-black shadow-2xl"
                style={{
                  aspectRatio: '9 / 19.5',
                  maxHeight: '92vh',
                  borderRadius: '48px',
                }}
              >
                <div className="absolute left-1/2 top-[9px] z-20 h-[24px] w-[94px] -translate-x-1/2 rounded-full bg-black" />

                <div
                  className="relative h-full w-full overflow-hidden bg-white"
                  style={{
                    borderRadius: '36px',
                  }}
                >
                  {mediaUrl && isVideo ? (
                    <video
                      src={mediaUrl}
                      controls
                      autoPlay
                      playsInline
                      preload="metadata"
                      className="h-full w-full bg-black object-contain"
                    />
                  ) : null}

                  {mediaUrl && !isVideo ? (
                    <Image
                      src={mediaUrl}
                      alt={alt}
                      fill
                      unoptimized
                      priority
                      className="object-contain"
                      sizes="390px"
                    />
                  ) : null}

                  {!mediaUrl ? (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0b5b2f] to-[#29b9f3] text-7xl font-black text-white">
                      {fallbackLetter}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>

            <button
  type="button"
  onClick={openPreview}
  className="ad-media ad-media-preview-trigger"
  style={{
    border: 0,
    padding: 0,
    margin: 0,
    background: 'transparent',
    cursor: 'pointer',
    font: 'inherit',
    color: 'inherit',
    appearance: 'none',
  }}
  aria-label={`Open ${alt} preview`}
>
        {mediaUrl && isVideo ? (
          <video
            src={mediaUrl}
            muted
            playsInline
            preload="metadata"
            autoPlay
            loop
          />
        ) : null}

        {mediaUrl && !isVideo ? (
          <Image
            src={mediaUrl}
            alt={alt}
            fill
            unoptimized
            className="object-cover"
            sizes="220px"
          />
        ) : null}

        {!mediaUrl ? (
          <span>{fallbackLetter}</span>
        ) : null}
      </button>

      {modal}
    </>
  );
}