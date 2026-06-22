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
        backHref="/contact"
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
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(196, 151, 103, 0.18), transparent 34%),
            linear-gradient(180deg, #fffaf1 0%, #f7efe2 100%);
          color: #102b24;
          padding: 44px 20px 70px;
        }

        .hero,
        .section,
        .trustSection {
          max-width: 1120px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero {
          background: linear-gradient(135deg, #0c2f28, #105640);
          color: #ffffff;
          border-radius: 34px;
          padding: 56px;
          box-shadow: 0 24px 70px rgba(16, 43, 36, 0.22);
        }

        .eyebrow,
        .sectionLabel {
          margin: 0 0 14px;
          color: #9a6b39;
          font-size: 12px;
          letter-spacing: 0.22em;
          font-weight: 900;
          text-transform: uppercase;
        }

        .eyebrow,
        .sectionLabel.light {
          color: #e9c896;
        }

        h1 {
          max-width: 850px;
          margin: 0;
          font-size: clamp(38px, 6vw, 70px);
          line-height: 0.96;
          letter-spacing: -0.055em;
        }

        .intro {
          max-width: 760px;
          margin: 22px 0 0;
          color: rgba(255, 255, 255, 0.82);
          font-size: 18px;
          line-height: 1.75;
        }

        .heroActions,
        .panelActions {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin-top: 34px;
        }

        .primaryButton,
        .secondaryButton,
        .smallButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          border-radius: 999px;
          padding: 13px 22px;
          font-weight: 900;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .primaryButton {
          background: #c49767;
          color: #ffffff;
          box-shadow: 0 12px 28px rgba(196, 151, 103, 0.32);
        }

        .secondaryButton {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.22);
        }

        .smallButton {
          background: #c49767;
          color: #ffffff;
          padding: 11px 18px;
          font-size: 14px;
        }

        .lightButton {
          background: rgba(196, 151, 103, 0.16);
          color: #8b5e2f;
          border: 1px solid rgba(196, 151, 103, 0.2);
        }

        .primaryButton:hover,
        .secondaryButton:hover,
        .smallButton:hover {
          transform: translateY(-2px);
        }

        .section {
          margin-top: 28px;
          background: rgba(255, 255, 255, 0.76);
          border: 1px solid rgba(196, 151, 103, 0.18);
          border-radius: 30px;
          padding: 34px;
          box-shadow: 0 18px 50px rgba(16, 43, 36, 0.08);
        }

        .split {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          background: transparent;
          border: 0;
          box-shadow: none;
          padding: 0;
        }

        .panel,
        .card {
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(196, 151, 103, 0.18);
          border-radius: 26px;
          padding: 28px;
          box-shadow: 0 16px 40px rgba(16, 43, 36, 0.08);
        }

        .panel h2,
        .section h2,
        .trustSection h2 {
          margin: 0;
          font-size: clamp(28px, 4vw, 42px);
          line-height: 1.08;
          letter-spacing: -0.04em;
        }

        .panel p,
        .card p {
          margin: 18px 0 0;
          color: #536560;
          line-height: 1.75;
          font-size: 15px;
          font-weight: 650;
        }

        .sectionHeader {
          max-width: 760px;
          margin-bottom: 24px;
        }

        .cardsGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        .card span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(196, 151, 103, 0.18);
          color: #9a6b39;
          font-weight: 900;
          margin-bottom: 18px;
        }

        .card h3 {
          margin: 0;
          font-size: 19px;
          letter-spacing: -0.02em;
        }

        .card p {
          font-size: 14px;
        }

        .trustSection {
          margin-top: 30px;
          background: #102b24;
          color: #ffffff;
          border-radius: 30px;
          padding: 34px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          box-shadow: 0 22px 58px rgba(16, 43, 36, 0.18);
        }

        .trustSection p {
          max-width: 760px;
          margin: 18px 0 0;
          color: rgba(255, 255, 255, 0.78);
          line-height: 1.75;
        }

        @media (max-width: 950px) {
          .hero {
            padding: 38px 24px;
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