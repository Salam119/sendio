'use client';

import { useEffect, useMemo, useState } from 'react';
import { FaStar } from 'react-icons/fa6';
import { getCompanyId } from '@/lib/getCompanyId';
import { supabase } from '@/lib/supabase';

type CompanyReview = {
  id: string;
  company_id: string;
  user_name: string | null;
  rating: number | null;
  comment: string | null;
  created_at: string | null;
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<CompanyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadReviews() {
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

      const { data, error } = await supabase
        .from('company_reviews')
        .select('id, company_id, user_name, rating, comment, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (!isMounted) {
        return;
      }

      if (error) {
        setNotice(error.message);
        setLoading(false);
        return;
      }

      setReviews((data ?? []) as CompanyReview[]);
      setLoading(false);
    }

    void loadReviews();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalReviews = reviews.length;

  const averageRating = useMemo(() => {
    if (!reviews.length) {
      return '0.0';
    }

    const total = reviews.reduce(
      (sum, review) => sum + Number(review.rating ?? 0),
      0,
    );

    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  const recommendations = useMemo(() => {
    return reviews.filter((review) => Number(review.rating ?? 0) >= 4).length;
  }, [reviews]);

  const latestReviewDate = reviews[0]?.created_at
    ? new Date(reviews[0].created_at).toLocaleDateString()
    : 'No reviews yet';

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-[var(--sendio-border)] bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--sendio-muted)]">
          Company Reviews
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--sendio-text)]">
          Reviews
        </h1>

        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--sendio-muted)]">
          Monitor customer ratings, comments, and recent feedback for your
          public company profile.
        </p>

        {notice ? (
          <div className="mt-4 rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-4 py-3 text-sm font-bold text-[var(--sendio-text)]">
            {notice}
          </div>
        ) : null}
      </section>

      <section className="rounded-[28px] border border-[var(--sendio-border)] bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-4">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--sendio-muted)]">
              Average Rating
            </p>

            <div className="mt-3 flex items-center gap-2">
              <h2 className="text-3xl font-black text-[var(--sendio-text)]">
                {averageRating}
              </h2>
              <FaStar className="text-[var(--sendio-accent)]" />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-4">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--sendio-muted)]">
              Total Reviews
            </p>

            <h2 className="mt-3 text-3xl font-black text-[var(--sendio-text)]">
              {totalReviews}
            </h2>
          </div>

          <div className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-4">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--sendio-muted)]">
              Recommendations
            </p>

            <h2 className="mt-3 text-3xl font-black text-[var(--sendio-text)]">
              {recommendations}
            </h2>
          </div>

          <div className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-4">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--sendio-muted)]">
              Latest Review
            </p>

            <h2 className="mt-3 text-sm font-black text-[var(--sendio-text)]">
              {latestReviewDate}
            </h2>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-[var(--sendio-border)] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
              Feedback
            </p>

            <h2 className="mt-1 text-xl font-black text-[var(--sendio-text)]">
              Customer comments
            </h2>
          </div>

          <p className="text-sm font-bold text-[var(--sendio-muted)]">
            {totalReviews} review{totalReviews === 1 ? '' : 's'}
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-4 text-sm font-bold text-[var(--sendio-muted)]">
            Loading reviews...
          </div>
        ) : reviews.length ? (
          <div className="space-y-3">
            {reviews.map((review) => {
              const rating = Math.max(0, Math.min(5, Number(review.rating ?? 0)));

              return (
                <article
                  key={review.id}
                  className="rounded-2xl border border-[var(--sendio-border)] bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-base font-black text-[var(--sendio-text)]">
                        {review.user_name || 'Sendio customer'}
                      </h3>

                      <p className="mt-1 text-xs font-bold text-[var(--sendio-muted)]">
                        {review.created_at
                          ? new Date(review.created_at).toLocaleDateString()
                          : 'No date'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 rounded-full border border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-3 py-1">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <FaStar
                          key={`${review.id}-star-${index}`}
                          className={
                            index < rating
                              ? 'text-[var(--sendio-accent)]'
                              : 'text-gray-300'
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <p className="mt-3 text-sm font-semibold leading-6 text-[var(--sendio-muted)]">
                    {review.comment || 'No written comment was provided.'}
                  </p>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-5">
            <h3 className="text-base font-black text-[var(--sendio-text)]">
              No reviews yet
            </h3>

            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--sendio-muted)]">
              Customer reviews will appear here after clients rate your company
              from the public profile.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}