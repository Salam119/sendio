'use client';

import { useEffect, useState } from 'react';

function getInitialNotice() {
  if (typeof window === 'undefined') return '';

  return window.sessionStorage.getItem('sendio_account_type_notice') ?? '';
}

export default function GlobalAccountNotice() {
  const [notice, setNotice] = useState(getInitialNotice);

  useEffect(() => {
    if (!notice) return;

    window.sessionStorage.removeItem('sendio_account_type_notice');

    const timer = window.setTimeout(() => {
      setNotice('');
    }, 5200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [notice]);

  if (!notice) {
    return null;
  }

  return (
    <>
      <div
        className="sendio-global-account-notice"
        role="status"
        aria-live="polite"
      >
        <span className="sendio-global-account-notice-icon">ℹ</span>
        <span className="sendio-global-account-notice-text">{notice}</span>

        <button
          type="button"
          onClick={() => setNotice('')}
          className="sendio-global-account-notice-close"
          aria-label="Close notice"
        >
          ×
        </button>
      </div>

      <style jsx global>{`
        .sendio-global-account-notice {
          --notice-bg: color-mix(
            in srgb,
            var(--sendio-soft, #eef6ff) 78%,
            #ffffff 22%
          );
          --notice-border: var(--sendio-border, #dbeafe);
          --notice-text: var(--sendio-text, #111827);
          --notice-muted: var(--sendio-muted, #374151);
          --notice-accent: var(--sendio-accent, #29b9f3);

          position: fixed;
          left: 50%;
          top: 18px;
          z-index: 70;
          display: flex;
          max-width: min(92vw, 560px);
          min-height: 42px;
          transform: translateX(-50%);
          align-items: center;
          gap: 10px;
          border-radius: 999px;
          border: 1px solid var(--notice-border);
          background:
            linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.92),
              rgba(255, 255, 255, 0.66)
            ),
            var(--notice-bg);
          padding: 10px 12px 10px 14px;
          color: var(--notice-text);
          box-shadow:
            0 18px 45px rgba(15, 23, 42, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(18px);
          animation:
            sendioAccountNoticeIn 0.22s ease-out,
            sendioAccountNoticeOut 0.32s ease-in 4.85s forwards;
        }

        .sendio-global-account-notice-icon {
          display: inline-flex;
          width: 22px;
          height: 22px;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.75);
          color: var(--notice-accent);
          font-size: 13px;
          font-weight: 900;
          box-shadow: inset 0 0 0 1px var(--notice-border);
        }

        .sendio-global-account-notice-text {
          min-width: 0;
          font-size: 12px;
          font-weight: 850;
          line-height: 1.35;
          color: var(--notice-muted);
        }

        .sendio-global-account-notice-close {
          display: inline-flex;
          width: 24px;
          height: 24px;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.72);
          color: var(--notice-muted);
          cursor: pointer;
          font-size: 16px;
          font-weight: 900;
          line-height: 1;
          transition:
            background 0.16s ease,
            transform 0.16s ease;
        }

        .sendio-global-account-notice-close:hover {
          background: #ffffff;
          transform: scale(1.04);
        }

        @keyframes sendioAccountNoticeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -10px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }

        @keyframes sendioAccountNoticeOut {
          to {
            opacity: 0;
            transform: translate(-50%, -8px) scale(0.98);
            pointer-events: none;
          }
        }

        @media (max-width: 640px) {
          .sendio-global-account-notice {
            top: 12px;
            border-radius: 22px;
            padding: 9px 10px 9px 12px;
          }

          .sendio-global-account-notice-text {
            font-size: 11.5px;
          }
        }
      `}</style>
    </>
  );
}