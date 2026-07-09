import Link from 'next/link';
import PlatformNotice from '@/components/site/PlatformNotice';
import PageNavigation from '@/components/site/PageNavigation';

export default function PricingPage() {
  return (
    <main className="pricingPage">
      <section className="hero">
        <p className="eyebrow">PRICING & ADS</p>

        <h1>Promote your business on Sendio.</h1>

        <p className="intro">
          Sendio supports paid advertising and future promotion options for
          companies and workers. Final prices, durations, and payment options
          should be managed by the platform admin and connected to the official
          payment provider later.
        </p>

        <div className="heroActions">
          <Link href="/services" className="primaryButton">
            Browse Services
          </Link>

          <Link href="/dashboard/company/ads" className="secondaryButton">
            Company Ads
          </Link>
        </div>
      </section>

      <PlatformNotice compact />

      <PageNavigation
       backHref="/"
        backLabel="Back"
        nextHref="/legal"
        nextLabel="Legal"
      />

      <section className="section split">
        <article className="panel">
          <p className="sectionLabel">CURRENT STATUS</p>
          <h2>Advertising is prepared, payment is pending.</h2>

          <p>
            Sendio already supports company ad drafts, images, videos, homepage
            slider ads, category ads, and admin ad control. The real payment
            provider and final pricing rules should be connected later before
            official paid publishing.
          </p>
        </article>

        <article className="panel">
          <p className="sectionLabel">ADMIN CONTROL</p>
          <h2>Prices should not be hardcoded.</h2>

          <p>
            Ad prices, available durations, promotion slots, and payment rules
            should be managed from the future Admin Platform Settings page so the
            platform owner can update them without editing code.
          </p>
        </article>
      </section>

      <section className="section">
        <div className="sectionHeader">
          <p className="sectionLabel">PROMOTION OPTIONS</p>
          <h2>Planned advertising areas</h2>
        </div>

        <div className="cardsGrid">
          <article className="card">
            <span>01</span>
            <h3>Homepage slider ads</h3>
            <p>
              Visual ads displayed in the main homepage slider using real company
              ad content from Supabase.
            </p>
          </article>

          <article className="card">
            <span>02</span>
            <h3>Category ad slots</h3>
            <p>
              Paid placement in selected public category areas such as general,
              household, gardening, logistics, or future service groups.
            </p>
          </article>

          <article className="card">
            <span>03</span>
            <h3>Image and video ads</h3>
            <p>
              Companies can prepare ad media using images or videos, with admin
              control for pause, reject, reactivate, or restore.
            </p>
          </article>

          <article className="card">
            <span>04</span>
            <h3>Future paid upgrades</h3>
            <p>
              Sendio can later support featured profiles, priority placement,
              longer campaigns, or provider subscription options.
            </p>
          </article>
        </div>
      </section>

      <section className="section split">
        <article className="panel">
          <p className="sectionLabel">FOR COMPANIES</p>
          <h2>Create ads from your dashboard.</h2>

          <p>
            Company owners can manage advertisement drafts from their dashboard.
            Paid activation should later happen automatically after a successful
            official payment, while admins retain control to pause or moderate
            ads when needed.
          </p>

          <div className="panelActions">
            <Link href="/dashboard/company/ads" className="smallButton">
              Open Company Ads
            </Link>

            <Link href="/contact" className="smallButton lightButton">
              Contact Support
            </Link>
          </div>
        </article>

        <article className="panel">
          <p className="sectionLabel">FOR CLIENTS</p>
          <h2>Ads help discovery, not guarantees.</h2>

          <p>
            Advertisements can help users discover providers, but clients should
            still review profiles, services, ratings, reviews, and public
            information before contacting any company or worker.
          </p>
        </article>
      </section>

      <section className="trustSection">
        <div>
          <p className="sectionLabel light">PAYMENT NOTE</p>
          <h2>Official prices will be published after payment setup.</h2>

          <p>
            Sendio should publish final ad prices only after the official payment
            provider, checkout flow, payment records, success callback, and ad
            activation rules are completed.
          </p>
        </div>

        <Link href="/legal" className="primaryButton">
          Continue to Legal
        </Link>
      </section>

      <style>{`
        .pricingPage {
          --sendio-page-bg: var(--sendio-page-background, #ffffff);
          --sendio-soft-bg: var(--sendio-soft-background, #f8fbff);
          --sendio-hero-bg: var(--sendio-hero-background, #eef6ff);
          --sendio-hero-alt: var(--sendio-hero-alt, #f4edff);
          --sendio-card-bg: var(--sendio-card-background, #ffffff);
          --sendio-accent: var(--sendio-accent-color, #23a7f1);
          --sendio-accent-hover: var(--sendio-accent-hover, #168ed1);
          --sendio-border: var(--sendio-border-color, #dbeafe);
          --sendio-text: var(--sendio-text-color, #111827);
          --sendio-muted: var(--sendio-muted-color, #374151);

          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(35, 167, 241, 0.12), transparent 34%),
            linear-gradient(180deg, var(--sendio-page-bg) 0%, var(--sendio-soft-bg) 100%);
          color: var(--sendio-text);
          padding: 40px 20px 64px;
        }

        .hero,
        .section,
        .trustSection {
          max-width: 1120px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero {
          background:
            radial-gradient(circle at top right, rgba(35, 167, 241, 0.2), transparent 32%),
            linear-gradient(135deg, var(--sendio-hero-bg), var(--sendio-hero-alt));
          color: var(--sendio-text);
          border: 1px solid var(--sendio-border);
          border-radius: 32px;
          padding: 28px;
          box-shadow: 0 18px 46px rgba(17, 24, 39, 0.08);
        }

        .eyebrow,
        .sectionLabel {
          margin: 0 0 14px;
          color: var(--sendio-accent);
          font-size: 12px;
          letter-spacing: 0.2em;
          font-weight: 900;
          text-transform: uppercase;
        }

        .eyebrow,
        .sectionLabel.light {
          color: var(--sendio-accent);
        }

        h1 {
          max-width: 850px;
          margin: 0;
          font-size: clamp(36px, 6vw, 66px);
          line-height: 0.98;
          letter-spacing: -0.055em;
        }

        .intro {
          max-width: 760px;
          margin: 22px 0 0;
          color: var(--sendio-muted);
          font-size: 18px;
          line-height: 1.75;
          font-weight: 600;
        }

        .heroActions,
        .panelActions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 30px;
        }

        .primaryButton,
        .secondaryButton,
        .smallButton {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          border-radius: 24px;
          padding: 0 22px;
          font-size: 14px;
          font-weight: 900;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            background-color 0.2s ease,
            border-color 0.2s ease;
        }

        .primaryButton,
        .smallButton {
          background: var(--sendio-accent);
          color: #ffffff;
          border: 1px solid var(--sendio-accent);
          box-shadow: 0 12px 26px rgba(35, 167, 241, 0.24);
        }

        .primaryButton:hover,
        .smallButton:hover {
          background: var(--sendio-accent-hover);
          border-color: var(--sendio-accent-hover);
          box-shadow: 0 14px 30px rgba(35, 167, 241, 0.28);
        }

        .secondaryButton,
        .lightButton {
          background: #eef6ff;
          color: var(--sendio-text);
          border: 1px solid var(--sendio-border);
          box-shadow: 0 10px 24px rgba(17, 24, 39, 0.04);
        }

        .secondaryButton:hover,
        .lightButton:hover {
          background: #e3efff;
          border-color: #bfdbfe;
        }

        .primaryButton:hover,
        .secondaryButton:hover,
        .smallButton:hover {
          transform: translateY(-2px);
        }

        .section {
          margin-top: 24px;
          background: rgba(255, 255, 255, 0.86);
          border: 1px solid var(--sendio-border);
          border-radius: 24px;
          padding: 28px;
          box-shadow: 0 14px 36px rgba(17, 24, 39, 0.06);
        }

        .split {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          background: transparent;
          border: 0;
          box-shadow: none;
          padding: 0;
        }

        .panel,
        .card {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid var(--sendio-border);
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 12px 30px rgba(17, 24, 39, 0.055);
        }

        .panel h2,
        .section h2,
        .trustSection h2 {
          margin: 0;
          color: var(--sendio-text);
          font-size: clamp(28px, 4vw, 42px);
          line-height: 1.08;
          letter-spacing: -0.04em;
        }

        .panel p,
        .card p {
          margin: 16px 0 0;
          color: var(--sendio-muted);
          line-height: 1.75;
          font-size: 15px;
          font-weight: 600;
        }

        .sectionHeader {
          max-width: 760px;
          margin-bottom: 22px;
        }

        .cardsGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .card span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #eef6ff;
          color: var(--sendio-accent);
          border: 1px solid var(--sendio-border);
          font-weight: 900;
          margin-bottom: 18px;
        }

        .card h3 {
          margin: 0;
          color: var(--sendio-text);
          font-size: 19px;
          letter-spacing: -0.02em;
        }

        .card p {
          font-size: 14px;
        }

        .trustSection {
          margin-top: 24px;
          background:
            radial-gradient(circle at top right, rgba(35, 167, 241, 0.16), transparent 30%),
            linear-gradient(135deg, #f4edff, #eef6ff);
          color: var(--sendio-text);
          border: 1px solid var(--sendio-border);
          border-radius: 24px;
          padding: 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          box-shadow: 0 16px 42px rgba(17, 24, 39, 0.07);
        }

        .trustSection p {
          max-width: 760px;
          margin: 16px 0 0;
          color: var(--sendio-muted);
          line-height: 1.75;
          font-weight: 600;
        }

        @media (max-width: 950px) {
          .pricingPage {
            padding: 28px 14px 54px;
          }

          .hero {
            padding: 24px;
          }

          .split,
          .cardsGrid {
            grid-template-columns: 1fr;
          }

          .trustSection {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </main>
  );
}