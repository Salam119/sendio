import Link from 'next/link';
import PlatformNotice from '@/components/site/PlatformNotice';
import PageNavigation from '@/components/site/PageNavigation';

export default function GetQuotePage() {
  return (
    <main className="quotePage">
      <section className="hero">
        <p className="eyebrow">GET A QUOTE</p>

        <h1>Start with a real provider, not a fake request form.</h1>

        <p className="intro">
          Sendio helps you find the right company or worker first. Choose a
          service category, compare real public profiles, then sign in to send a
          message, request a service, or contact the provider directly.
        </p>

        <div className="heroActions">
          <Link href="/services" className="primaryButton">
            Choose a Service
          </Link>

          <Link href="/register" className="secondaryButton">
            Create Client Account
          </Link>
        </div>
      </section>

      <PlatformNotice compact />

      <PageNavigation
        backHref="/clients"
        backLabel="Back"
        nextHref="/about"
        nextLabel="About"
      />

      <section className="section">
        <div className="sectionHeader">
          <p className="sectionLabel">HOW TO REQUEST</p>
          <h2>Send your request from the provider profile.</h2>
        </div>

        <div className="stepsGrid">
          <article className="stepCard">
            <span>01</span>
            <h3>Choose a service category</h3>
            <p>
              Start from the Services page and select the field you need, such as
              construction, transport, pharmacy, cleaning, plumbing, furniture,
              or any available category.
            </p>
          </article>

          <article className="stepCard">
            <span>02</span>
            <h3>Open a real provider</h3>
            <p>
              Active service categories show real companies or workers registered
              in that field. Open the provider profile to review details,
              ratings, reviews, city, and availability.
            </p>
          </article>

          <article className="stepCard">
            <span>03</span>
            <h3>Sign in as a client</h3>
            <p>
              Contact actions are protected. Login or create a client account to
              unlock messages, requests, WhatsApp, phone, email, website, and
              review actions.
            </p>
          </article>

          <article className="stepCard">
            <span>04</span>
            <h3>Send your request</h3>
            <p>
              Use the provider profile to send a Sendio message, request a
              service from a worker, or open an external contact channel.
            </p>
          </article>
        </div>
      </section>

      <section className="section split">
        <article className="panel">
          <p className="sectionLabel">WHY NO GENERAL FORM?</p>
          <h2>Requests should go to the right provider.</h2>

          <p>
            Sendio avoids generic requests that are not linked to a real company
            or worker. This keeps communication clearer, reduces spam, and helps
            each provider manage their own messages and requests from their
            dashboard.
          </p>
        </article>

        <article className="panel">
          <p className="sectionLabel">BEST NEXT STEP</p>
          <h2>Find your service first.</h2>

          <p>
            The fastest way to get a response is to choose a service category,
            open a matching provider, then contact them through their public
            profile after signing in.
          </p>

          <div className="panelActions">
            <Link href="/services" className="smallButton">
              Browse Services
            </Link>

            <Link href="/clients" className="smallButton lightButton">
              Client Guide
            </Link>
          </div>
        </article>
      </section>

      <section className="trustSection">
        <div>
          <p className="sectionLabel light">CLEAR RESPONSIBILITY</p>
          <h2>Sendio helps you connect. The agreement stays between users.</h2>

          <p>
            Any service details, price, delivery time, warranty, payment, or
            dispute should be agreed directly between the client and the selected
            company or worker, unless Sendio later provides an official payment
            or protection system for that specific service.
          </p>
        </div>

        <Link href="/services" className="primaryButton">
          Start Now
        </Link>
      </section>

      <style>{`
        .quotePage {
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
          max-width: 840px;
          margin: 0;
          font-size: clamp(38px, 6vw, 70px);
          line-height: 0.96;
          letter-spacing: -0.055em;
        }

        .intro {
          max-width: 740px;
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

        .sectionHeader {
          max-width: 760px;
          margin-bottom: 24px;
        }

        .section h2,
        .panel h2,
        .trustSection h2 {
          margin: 0;
          font-size: clamp(28px, 4vw, 42px);
          line-height: 1.08;
          letter-spacing: -0.04em;
        }

        .stepsGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        .stepCard,
        .panel {
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(196, 151, 103, 0.18);
          border-radius: 26px;
          padding: 28px;
          box-shadow: 0 16px 40px rgba(16, 43, 36, 0.08);
        }

        .stepCard span {
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

        .stepCard h3 {
          margin: 0 0 10px;
          font-size: 19px;
          letter-spacing: -0.02em;
        }

        .stepCard p,
        .panel p {
          margin: 0;
          color: #536560;
          line-height: 1.75;
          font-size: 14px;
          font-weight: 650;
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

        .panel p {
          margin-top: 18px;
          font-size: 15px;
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

          .stepsGrid,
          .split {
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