'use client';

import Link from 'next/link';

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
  return (
    <div className="pageNavigation">
      <Link href={backHref} className="navButton">
        ← {backLabel}
      </Link>

      <Link href="/" className="navButton">
        Home
      </Link>

      {nextHref ? (
        <Link href={nextHref} className="navButton nextButton">
          {nextLabel} →
        </Link>
      ) : null}
    </div>
  );
}