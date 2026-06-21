'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

type PageNavigationProps = {
  backHref?: string;
  backLabel?: string;
  nextHref?: string;
  nextLabel?: string;
};

export default function PageNavigation({
  backHref = '/',
  backLabel = 'Back',
  nextHref,
  nextLabel = 'Next',
}: PageNavigationProps) {
  const router = useRouter();

  return (
    <nav className="pageNavigation" aria-label="Page navigation">
      <button
        type="button"
        className="navButton"
        onClick={() => router.back()}
      >
        ← {backLabel}
      </button>

      <Link href={backHref} className="navButton">
        Home
      </Link>

      {nextHref ? (
        <Link href={nextHref} className="navButton nextButton">
          {nextLabel} →
        </Link>
      ) : null}

      <style>{`
        .pageNavigation {
          max-width: 1120px;
          margin: 18px auto 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .navButton {
          border: 1px solid rgba(196, 151, 103, 0.22);
          background: rgba(255, 255, 255, 0.72);
          color: #102b24;
          text-decoration: none;
          border-radius: 999px;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 850;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(16, 43, 36, 0.06);
          transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
        }

        .navButton:hover {
          transform: translateY(-2px);
          background: #fffaf1;
          box-shadow: 0 14px 30px rgba(16, 43, 36, 0.1);
        }

        .nextButton {
          background: rgba(196, 151, 103, 0.16);
          color: #8b5e2f;
        }

        @media (max-width: 560px) {
          .pageNavigation {
            justify-content: center;
          }

          .navButton {
            flex: 1;
            text-align: center;
            justify-content: center;
          }
        }
      `}</style>
    </nav>
  );
}