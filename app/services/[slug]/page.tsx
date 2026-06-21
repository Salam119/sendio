'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  ServiceProvider,
  formatProviderRating,
  getProviderHref,
  getServiceCategoryBySlug,
  loadServiceProviders,
  providerMatchesCategory,
} from '@/lib/serviceDirectory';

export default function ServiceCategoryPage() {
  const params = useParams();
  const slugParam = params?.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam ?? '';

  const category = getServiceCategoryBySlug(slug);

  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);

      const result = await loadServiceProviders();

      if (!active) {
        return;
      }

      setProviders(result.providers);
      setWarning(result.warning);
      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const matchingProviders = useMemo(() => {
    if (!category) {
      return [];
    }

    return providers.filter((provider) =>
      providerMatchesCategory(provider.searchText, category)
    );
  }, [category, providers]);

  if (!category) {
    return (
      <main className="categoryPage">
        <section className="emptyState">
          <h1>Service category not found.</h1>
          <p>This service category is not available in Sendio yet.</p>
          <Link href="/services" className="button">
            Back to Services
          </Link>
        </section>

        <style>{baseStyles}</style>
      </main>
    );
  }

  return (
    <main className="categoryPage">
      <section className="hero">
        <Link href="/services" className="backLink">
          ← Services
        </Link>

        <div className="heroIcons">
          {category.icons.map((icon) => (
            <span key={icon}>{icon}</span>
          ))}
        </div>

        <h1>{category.title}</h1>

        <p>
          {loading
            ? 'Loading real providers from Sendio...'
            : matchingProviders.length > 0
              ? `${matchingProviders.length} real provider${
                  matchingProviders.length > 1 ? 's' : ''
                } found in this category.`
              : 'No company or worker is registered in this category yet.'}
        </p>
      </section>

      {warning ? <p className="warning">{warning}</p> : null}

      {loading ? (
        <section className="emptyState">
          <h2>Loading providers...</h2>
          <p>Please wait while Sendio checks real company and worker profiles.</p>
        </section>
      ) : matchingProviders.length === 0 ? (
        <section className="emptyState">
          <h2>Waiting for providers</h2>
          <p>
            This service category is ready, but no company or worker is currently
            registered in this field.
          </p>
          <Link href="/services" className="button">
            Back to Services
          </Link>
        </section>
      ) : (
        <section className="providersGrid">
          {matchingProviders.map((provider) => (
            <Link
              href={getProviderHref(provider)}
              className="providerCard"
              key={`${provider.kind}-${provider.id}`}
            >
              <div className="imageBox">
                {provider.image ? (
                  <img src={provider.image} alt={provider.name} />
                ) : (
                  <div className="fallbackIcons">
                    {category.icons.map((icon) => (
                      <span key={icon}>{icon}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="providerInfo">
                <span className="kind">
                  {provider.kind === 'company' ? 'Company' : 'Worker'}
                </span>

                <h2>{provider.name}</h2>

                {provider.city ? <p className="city">{provider.city}</p> : null}

                <p className="rating">{formatProviderRating(provider)}</p>

                {provider.status ? (
                  <p className="status">{provider.status}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </section>
      )}

      <style>{baseStyles}</style>
    </main>
  );
}

const baseStyles = `
  .categoryPage {
    min-height: 100vh;
    background:
      radial-gradient(circle at top left, rgba(196, 151, 103, 0.18), transparent 34%),
      linear-gradient(180deg, #fffaf1 0%, #f7efe2 100%);
    color: #102b24;
    padding: 44px 20px 70px;
  }

  .hero,
  .providersGrid,
  .emptyState,
  .warning {
    max-width: 1120px;
    margin-left: auto;
    margin-right: auto;
  }

  .hero {
    background: linear-gradient(135deg, #0c2f28, #105640);
    color: #ffffff;
    border-radius: 34px;
    padding: 48px;
    box-shadow: 0 24px 70px rgba(16, 43, 36, 0.22);
  }

  .backLink {
    display: inline-flex;
    margin-bottom: 26px;
    color: #e9c896;
    text-decoration: none;
    font-weight: 900;
  }

  .heroIcons {
    display: flex;
    gap: 10px;
    font-size: 44px;
    margin-bottom: 18px;
  }

  h1 {
    max-width: 780px;
    margin: 0;
    font-size: clamp(38px, 6vw, 68px);
    line-height: 0.96;
    letter-spacing: -0.055em;
  }

  .hero p {
    max-width: 680px;
    margin: 22px 0 0;
    color: rgba(255, 255, 255, 0.82);
    font-size: 18px;
    line-height: 1.75;
  }

  .warning {
    margin-top: 16px;
    background: #fff5d8;
    border: 1px solid rgba(196, 151, 103, 0.28);
    color: #74512c;
    border-radius: 18px;
    padding: 14px 18px;
    font-weight: 750;
  }

  .providersGrid {
    margin-top: 28px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .providerCard {
    display: grid;
    grid-template-columns: 106px 1fr;
    gap: 16px;
    align-items: center;
    text-decoration: none;
    color: #102b24;
    background: rgba(255, 255, 255, 0.82);
    border: 1px solid rgba(196, 151, 103, 0.2);
    border-radius: 26px;
    padding: 16px;
    box-shadow: 0 16px 40px rgba(16, 43, 36, 0.08);
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }

  .providerCard:hover {
    transform: translateY(-4px);
    box-shadow: 0 22px 54px rgba(16, 43, 36, 0.14);
    border-color: rgba(16, 86, 64, 0.32);
  }

  .imageBox {
    width: 106px;
    height: 106px;
    border-radius: 24px;
    overflow: hidden;
    background: #fffaf1;
    border: 1px solid rgba(196, 151, 103, 0.18);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .imageBox img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .fallbackIcons {
    display: flex;
    gap: 6px;
    font-size: 36px;
  }

  .providerInfo {
    min-width: 0;
  }

  .kind {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    background: rgba(16, 86, 64, 0.1);
    color: #105640;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 900;
    margin-bottom: 10px;
  }

  .providerCard h2 {
    margin: 0;
    font-size: 22px;
    letter-spacing: -0.03em;
  }

  .city,
  .rating,
  .status {
    margin: 8px 0 0;
    color: #6d7b76;
    font-size: 14px;
    line-height: 1.4;
  }

  .rating {
    color: #a07034;
    font-weight: 900;
  }

  .status {
    color: #128752;
    font-weight: 850;
  }

  .emptyState {
    margin-top: 28px;
    background: rgba(255, 255, 255, 0.82);
    border: 1px solid rgba(196, 151, 103, 0.2);
    border-radius: 28px;
    padding: 34px;
    box-shadow: 0 16px 40px rgba(16, 43, 36, 0.08);
  }

  .emptyState h1,
  .emptyState h2 {
    margin: 0 0 12px;
    font-size: 34px;
    letter-spacing: -0.04em;
  }

  .emptyState p {
    margin: 0 0 22px;
    color: #6d7b76;
    line-height: 1.7;
  }

  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    border-radius: 999px;
    padding: 12px 20px;
    background: #c49767;
    color: #ffffff;
    font-weight: 900;
  }

  @media (max-width: 980px) {
    .providersGrid {
      grid-template-columns: 1fr;
    }

    .hero {
      padding: 36px 24px;
    }
  }

  @media (max-width: 560px) {
    .providerCard {
      grid-template-columns: 1fr;
    }

    .imageBox {
      width: 100%;
      height: 180px;
    }
  }
`;