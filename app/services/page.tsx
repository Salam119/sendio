'use client';

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

          <Link href="/clients" className="topLink">
            Client Guide
          </Link>

          <Link href="/get-quote" className="topLink">
            Get Quote
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
                  <img
                    src={firstProvider.image}
                    alt={firstProvider.name}
                    className="providerImage"
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
        .servicesPage {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(196, 151, 103, 0.18), transparent 34%),
            linear-gradient(180deg, #fffaf1 0%, #f7efe2 100%);
          color: #102b24;
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
          background: linear-gradient(135deg, #0c2f28, #105640);
          color: #ffffff;
          border-radius: 34px;
          padding: 52px;
          box-shadow: 0 24px 70px rgba(16, 43, 36, 0.22);
        }

        .topLinks {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 28px;
        }

        .topLink {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 38px;
          padding: 9px 15px;
          border-radius: 999px;
          color: #e9c896;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(233, 200, 150, 0.4);
          text-decoration: none;
          font-size: 13px;
          font-weight: 900;
          transition: transform 0.2s ease, background 0.2s ease;
        }

        .topLink:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.18);
        }

        .primaryTopLink {
          color: #102b24;
          background: #e9c896;
          border-color: #e9c896;
        }

        .primaryTopLink:hover {
          background: #f1d6a7;
        }

        .eyebrow {
          margin: 0 0 14px;
          color: #e9c896;
          font-size: 12px;
          letter-spacing: 0.22em;
          font-weight: 900;
          text-transform: uppercase;
        }

        h1 {
          max-width: 780px;
          margin: 0;
          font-size: clamp(38px, 6vw, 70px);
          line-height: 0.96;
          letter-spacing: -0.055em;
        }

        .intro {
          max-width: 700px;
          margin: 22px 0 0;
          color: rgba(255, 255, 255, 0.82);
          font-size: 18px;
          line-height: 1.75;
        }

        .statusBar {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 24px;
        }

        .statusBar div {
          background: rgba(255, 255, 255, 0.76);
          border: 1px solid rgba(196, 151, 103, 0.18);
          border-radius: 22px;
          padding: 18px 20px;
          box-shadow: 0 14px 34px rgba(16, 43, 36, 0.07);
        }

        .statusBar strong {
          display: block;
          font-size: 24px;
          line-height: 1;
        }

        .statusBar span {
          display: block;
          margin-top: 8px;
          color: #6d7b76;
          font-size: 13px;
          font-weight: 750;
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
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(196, 151, 103, 0.2);
          border-radius: 26px;
          padding: 18px;
          color: #102b24;
          box-shadow: 0 16px 40px rgba(16, 43, 36, 0.08);
          overflow: hidden;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }

        .activeCard:hover {
          transform: translateY(-4px);
          box-shadow: 0 22px 54px rgba(16, 43, 36, 0.14);
          border-color: rgba(16, 86, 64, 0.32);
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
          background: #d7c7b0;
        }

        .mediaBox {
          width: 74px;
          height: 74px;
          border-radius: 22px;
          background: #fffaf1;
          border: 1px solid rgba(196, 151, 103, 0.18);
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
          font-size: 13px;
          line-height: 1.45;
        }

        .activeText {
          color: #128752;
          font-weight: 900;
        }

        .waitingText {
          color: #8b7b66;
          font-weight: 850;
        }

        .previewName {
          color: #6d7b76;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .bottomNavigation {
          margin-top: 30px;
          background: #102b24;
          color: #ffffff;
          border-radius: 30px;
          padding: 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          box-shadow: 0 22px 58px rgba(16, 43, 36, 0.18);
        }

        .bottomLabel {
          margin: 0 0 10px;
          color: #e9c896;
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
          color: rgba(255, 255, 255, 0.78);
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
          border-radius: 999px;
          text-decoration: none;
          background: #c49767;
          color: #ffffff;
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
          transition: transform 0.2s ease, background 0.2s ease;
        }

        .bottomButton:hover {
          transform: translateY(-2px);
          background: #a97946;
        }

        .darkButton {
          background: #ffffff;
          color: #102b24;
        }

        .darkButton:hover {
          background: #f2e4d2;
        }

        .lightButton {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.22);
        }

        .lightButton:hover {
          background: rgba(255, 255, 255, 0.18);
        }

        @media (max-width: 1120px) {
          .serviceGrid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }

        @media (max-width: 850px) {
          .hero {
            padding: 36px 24px;
          }

          .statusBar {
            grid-template-columns: 1fr;
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
          .serviceGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}