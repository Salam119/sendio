'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  SERVICE_CATEGORIES,
  ServiceProvider,
  getProviderHref,
  loadServiceProviders,
  providerMatchesCategory,
} from '@/lib/serviceDirectory';

export default function ServicesPage() {
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

  const categoryCards = useMemo(() => {
    return SERVICE_CATEGORIES.map((category) => {
      const matches = providers.filter((provider) =>
        providerMatchesCategory(provider.searchText, category)
      );

      const firstProvider = matches[0] ?? null;

      return {
        category,
        matches,
        firstProvider,
        href:
          matches.length === 1 && firstProvider
            ? getProviderHref(firstProvider)
            : `/services/${category.slug}`,
      };
    });
  }, [providers]);

  return (
    <main className="servicesPage">
      <section className="hero">
        <div className="topLinks">
          <Link href="/" className="topLink primaryTopLink">
            ← Home
          </Link>

          <Link href="/pricing" className="topLink">
            Pricing
          </Link>

          <Link href="/contact" className="topLink">
            Contact
          </Link>
        </div>

        <p className="eyebrow">SENDIO SERVICES</p>

        <h1>Explore services by category.</h1>

        <p className="intro">
          Choose a service category and open real companies or workers registered
          in that field. Active categories show a green mark and a real provider
          image when available.
        </p>
      </section>

      <section className="statusBar">
        <div>
          <strong>{SERVICE_CATEGORIES.length}</strong>
          <span>Service categories</span>
        </div>

        <div>
          <strong>{providers.length}</strong>
          <span>Real providers loaded</span>
        </div>

        <div>
          <strong>{loading ? 'Loading' : 'Ready'}</strong>
          <span>Supabase connection</span>
        </div>
      </section>

      {warning ? <p className="warning">{warning}</p> : null}

      <section className="serviceGrid" aria-label="Service categories">
        {categoryCards.map(({ category, matches, firstProvider, href }) => {
          const isActive = matches.length > 0;

          const cardContent = (
            <>
              <span className={isActive ? 'activeDot' : 'waitingDot'} />

              <div className="mediaBox">
                {firstProvider?.image ? (
                  <Image
                    src={firstProvider.image}
                    alt={firstProvider.name}
                    width={160}
                    height={160}
                    className="providerImage"
                    sizes="160px"
                  />
                ) : (
                  <div className="icons">
                    {category.icons.map((icon) => (
                      <span key={icon}>{icon}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="categoryIcons">
                {category.icons.map((icon) => (
                  <span key={icon}>{icon}</span>
                ))}
              </div>

              <h2>{category.title}</h2>

              <p className={isActive ? 'activeText' : 'waitingText'}>
                {isActive
                  ? `${matches.length} provider${matches.length > 1 ? 's' : ''}`
                  : 'Waiting for provider'}
              </p>

              {firstProvider ? (
                <p className="previewName">
                  {firstProvider.kind === 'company' ? 'Company' : 'Worker'} ·{' '}
                  {firstProvider.name}
                </p>
              ) : null}
            </>
          );

          if (!isActive) {
            return (
              <article className="serviceCard waitingCard" key={category.slug}>
                {cardContent}
              </article>
            );
          }

          return (
            <Link className="serviceCard activeCard" href={href} key={category.slug}>
              {cardContent}
            </Link>
          );
        })}
      </section>

      <section className="bottomNavigation">
        <div>
          <p className="bottomLabel">SERVICE DIRECTORY</p>
          <h2>Need to go back?</h2>
          <p>
            You can return to the homepage, continue to the client guide, or
            learn how to request a quote from a real provider profile.
          </p>
        </div>

        <div className="bottomActions">
          <Link href="/" className="bottomButton darkButton">
            Home
          </Link>

          <Link href="/clients" className="bottomButton">
            Client Guide
          </Link>

          <Link href="/get-quote" className="bottomButton lightButton">
            Get Quote
          </Link>
        </div>
      </section>

      <style>{`
        :root {
          --sendio-page-bg: #ffffff;
          --sendio-hero-bg: #e8e1f1;
          --sendio-button-bg: #eef6ff;
          --sendio-button-bg-hover: #e3efff;
          --sendio-border: #dbeafe;
          --sendio-text: #111827;
          --sendio-muted: #374151;
          --sendio-radius: 12px;
          --sendio-search-pill-width: 320px;
          --sendio-search-pill-height: 44px;
          --sendio-search-pill-radius: 22px;
        }

        .servicesPage {
          min-height: 100vh;
          background: var(--sendio-page-bg);
          color: var(--sendio-text);
          padding: 44px 20px 70px;
        }

        .hero,
        .statusBar,
        .serviceGrid,
        .warning,
        .bottomNavigation {
          max-width: 1180px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero {
          min-height: 167px;
          background: var(--sendio-hero-bg);
          color: var(--sendio-text);
          border: 1px solid var(--sendio-border);
          border-radius: 30px;
          padding: 18px 28px;
          box-shadow: 0 18px 44px rgba(17, 24, 39, 0.08);
        }

        .topLinks {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 14px;
        }

        .topLink {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 32px;
          padding: 7px 12px;
          border-radius: var(--sendio-radius);
          color: var(--sendio-text);
          background: var(--sendio-button-bg);
          border: 1px solid var(--sendio-border);
          text-decoration: none;
          font-size: 12px;
          font-weight: 900;
          transition: transform 0.2s ease, background 0.2s ease;
        }

        .topLink:hover {
          transform: translateY(-2px);
          background: var(--sendio-button-bg-hover);
        }

        .primaryTopLink {
          color: var(--sendio-text);
          background: var(--sendio-button-bg);
          border-color: var(--sendio-border);
        }

        .primaryTopLink:hover {
          background: var(--sendio-button-bg-hover);
        }

        .eyebrow {
          margin: 0 0 8px;
          color: var(--sendio-muted);
          font-size: 10px;
          letter-spacing: 0.18em;
          font-weight: 900;
          text-transform: uppercase;
        }

        h1 {
          max-width: 780px;
          margin: 0;
          font-size: clamp(24px, 3.4vw, 36px);
          line-height: 1.05;
          letter-spacing: -0.035em;
        }

        .intro {
          max-width: 700px;
          margin: 10px 0 0;
          color: var(--sendio-muted);
          font-size: 14px;
          line-height: 1.45;
        }

        .statusBar {
          display: grid;
          grid-template-columns: repeat(3, var(--sendio-search-pill-width));
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          margin-top: 18px;
          padding: 0 34px;
        }

        .statusBar div {
          width: var(--sendio-search-pill-width);
          max-width: 100%;
          height: var(--sendio-search-pill-height);
          background: #ffffff;
          border: 1px solid var(--sendio-border);
          border-radius: var(--sendio-search-pill-radius);
          padding: 0 18px;
          box-shadow: 0 12px 28px rgba(17, 24, 39, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          text-align: center;
        }

        .statusBar strong {
          display: inline-flex;
          align-items: center;
          font-size: 16px;
          line-height: 1;
          white-space: nowrap;
        }

        .statusBar span {
          display: inline-flex;
          align-items: center;
          color: var(--sendio-muted);
          font-size: 11px;
          font-weight: 750;
          white-space: nowrap;
        }

        .warning {
          margin-top: 16px;
          background: #ffffff;
          border: 1px solid var(--sendio-border);
          color: var(--sendio-muted);
          border-radius: var(--sendio-radius);
          padding: 14px 18px;
          font-weight: 750;
        }

        .serviceGrid {
          margin-top: 26px;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 16px;
        }

        .serviceCard {
          position: relative;
          min-height: 232px;
          text-decoration: none;
          background: #ffffff;
          border: 1px solid var(--sendio-border);
          border-radius: var(--sendio-radius);
          padding: 18px;
          color: var(--sendio-text);
          box-shadow: 0 14px 34px rgba(17, 24, 39, 0.06);
          overflow: hidden;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }

        .activeCard:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 42px rgba(17, 24, 39, 0.09);
          border-color: var(--sendio-border);
        }

        .waitingCard {
          opacity: 0.62;
        }

        .activeDot,
        .waitingDot {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 13px;
          height: 13px;
          border-radius: 50%;
          z-index: 3;
        }

        .activeDot {
          background: #18b86b;
          box-shadow: 0 0 0 6px rgba(24, 184, 107, 0.14);
        }

        .waitingDot {
          background: #cbd5e1;
        }

        .mediaBox {
          width: 74px;
          height: 74px;
          border-radius: var(--sendio-radius);
          background: #ffffff;
          border: 1px solid var(--sendio-border);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          margin-bottom: 14px;
        }

        .providerImage {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .icons {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 34px;
        }

        .categoryIcons {
          display: flex;
          gap: 5px;
          font-size: 16px;
          margin-bottom: 8px;
        }

        .serviceCard h2 {
          margin: 0;
          font-size: 18px;
          line-height: 1.18;
          letter-spacing: -0.02em;
        }

        .activeText,
        .waitingText,
        .previewName {
          margin: 10px 0 0;
          font-size: 12px;
          line-height: 1.45;
        }

        .activeText {
          color: #2563eb;
          font-weight: 900;
        }

        .waitingText {
          color: var(--sendio-muted);
          font-weight: 850;
        }

        .previewName {
          color: var(--sendio-muted);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .bottomNavigation {
          margin-top: 30px;
          background: #ffffff;
          color: var(--sendio-text);
          border: 1px solid var(--sendio-border);
          border-radius: 30px;
          padding: 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          box-shadow: 0 18px 42px rgba(17, 24, 39, 0.08);
        }

        .bottomLabel {
          margin: 0 0 10px;
          color: var(--sendio-muted);
          font-size: 12px;
          letter-spacing: 0.2em;
          font-weight: 900;
          text-transform: uppercase;
        }

        .bottomNavigation h2 {
          margin: 0;
          font-size: clamp(26px, 4vw, 40px);
          letter-spacing: -0.04em;
        }

        .bottomNavigation p {
          max-width: 680px;
          margin: 14px 0 0;
          color: var(--sendio-muted);
          line-height: 1.7;
          font-weight: 650;
        }

        .bottomActions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 10px;
        }

        .bottomButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 11px 17px;
          border-radius: var(--sendio-radius);
          text-decoration: none;
          background: var(--sendio-button-bg);
          color: var(--sendio-text);
          border: 1px solid var(--sendio-border);
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
          transition: transform 0.2s ease, background 0.2s ease;
        }

        .bottomButton:hover {
          transform: translateY(-2px);
          background: var(--sendio-button-bg-hover);
        }

        .darkButton {
          background: var(--sendio-button-bg);
          color: var(--sendio-text);
        }

        .darkButton:hover {
          background: var(--sendio-button-bg-hover);
        }

        .lightButton {
          background: var(--sendio-button-bg);
          border: 1px solid var(--sendio-border);
        }

        .lightButton:hover {
          background: var(--sendio-button-bg-hover);
        }

        @media (max-width: 1120px) {
          .serviceGrid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }

        @media (max-width: 850px) {
          .hero {
            min-height: auto;
            padding: 22px 18px;
          }

          .statusBar {
            grid-template-columns: repeat(2, minmax(0, var(--sendio-search-pill-width)));
            justify-content: center;
            padding: 0;
          }

          .statusBar div {
            width: 100%;
          }

          .serviceGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .bottomNavigation {
            flex-direction: column;
            align-items: flex-start;
          }

          .bottomActions {
            justify-content: flex-start;
          }
        }

        @media (max-width: 520px) {
          .statusBar {
            grid-template-columns: 1fr;
            justify-content: center;
            gap: 10px;
          }

          .statusBar div {
            width: 100%;
            max-width: var(--sendio-search-pill-width);
            margin: 0 auto;
          }

          .serviceGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
