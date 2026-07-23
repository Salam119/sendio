'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

export type HeroAdPhonePreviewPayload = {
  title: string;
  mediaUrl: string;
  mediaType: 'video' | 'image';
};

const HERO_AD_PREVIEW_EVENT = 'sendio:hero-ad-phone-preview';

export function openHeroAdPhonePreview(
  payload: HeroAdPhonePreviewPayload
) {
  if (typeof window === 'undefined' || !payload.mediaUrl) return;

  window.dispatchEvent(
    new CustomEvent<HeroAdPhonePreviewPayload>(
      HERO_AD_PREVIEW_EVENT,
      { detail: payload }
    )
  );
}

export default function HeroAdPhonePreview() {
  const [preview, setPreview] =
    useState<HeroAdPhonePreviewPayload | null>(null);

  useEffect(() => {
    function handleOpen(event: Event) {
      const customEvent =
        event as CustomEvent<HeroAdPhonePreviewPayload>;

      if (!customEvent.detail?.mediaUrl) return;
      setPreview(customEvent.detail);
    }

    window.addEventListener(HERO_AD_PREVIEW_EVENT, handleOpen);

    return () => {
      window.removeEventListener(HERO_AD_PREVIEW_EVENT, handleOpen);
    };
  }, []);

  useEffect(() => {
    if (!preview) return;

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPreview(null);
      }
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [preview]);

  if (!preview) return null;

  return (
    <>
      <style jsx>{`
        .phone-preview-backdrop {
          position: fixed;
          inset: 0;
          z-index: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(0, 0, 0, 0.82);
        }

        .phone-preview-device {
          position: relative;
          height: min(852px, 90vh);
          aspect-ratio: 393 / 852;
          max-width: 92vw;
          padding: 7px;
          border-radius: 48px;
          background: #0a0a0c;
          box-shadow:
            0 30px 90px rgba(0, 0, 0, 0.5),
            inset 0 0 0 1px rgba(255, 255, 255, 0.1);
        }

        .phone-preview-frame {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          border-radius: 41px;
          background: #000;
        }

        .phone-preview-media {
          position: absolute;
          inset: 0;
          overflow: hidden;
          border-radius: inherit;
          background: #000;
        }

        .phone-preview-media :global(img),
        .phone-preview-media video {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          background: #000;
        }

        .phone-preview-island {
          position: absolute;
          top: 13px;
          left: 50%;
          z-index: 3;
          width: 31%;
          height: 28px;
          border-radius: 999px;
          background: #050505;
          transform: translateX(-50%);
          pointer-events: none;
        }

        .phone-preview-home {
          position: absolute;
          left: 50%;
          bottom: 13px;
          z-index: 4;
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 50%;
          background: #111;
          cursor: pointer;
          transform: translateX(-50%);
          box-shadow: 0 5px 16px rgba(0, 0, 0, 0.34);
        }

        .phone-preview-home-square {
          width: 7px;
          height: 7px;
          display: block;
          border-radius: 2px;
          background: #fff;
        }

        @media (max-height: 650px) {
          .phone-preview-device {
            height: 88vh;
          }
        }
      `}</style>

      <div
        className="phone-preview-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label={`${preview.title} advertisement preview`}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setPreview(null);
          }
        }}
      >
        <div className="phone-preview-device">
          <div className="phone-preview-frame">
            <div
              className="phone-preview-island"
              aria-hidden="true"
            />

            <div className="phone-preview-media">
              {preview.mediaType === 'video' ? (
                <video
                  key={preview.mediaUrl}
                  src={preview.mediaUrl}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                />
              ) : (
                <Image
                  src={preview.mediaUrl}
                  alt={`${preview.title} advertisement preview`}
                  fill
                  unoptimized
                  sizes="92vw"
                  style={{ objectFit: 'cover' }}
                />
              )}
            </div>

            <button
              type="button"
              className="phone-preview-home"
              onClick={() => setPreview(null)}
              aria-label="Close preview"
            >
              <span
                className="phone-preview-home-square"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
