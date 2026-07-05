import Link from 'next/link';
import PlatformNotice from '@/components/site/PlatformNotice';
import PageNavigation from '@/components/site/PageNavigation';

export default function GetQuotePage() {
  return (
    <main className="quotePage">
      <div className="orb orbOne" />
      <div className="orb orbTwo" />
      <div className="orb orbThree" />

      <section className="hero">
        <div className="heroGlass">
          <p className="eyebrow">GET A QUOTE</p>

          <h1>Start with a real provider, not a fake request form.</h1>

          <p className="intro">
            Sendio helps you find the right company or worker first. Choose a
            service category, compare real public profiles, then sign in to send
            a message, request a service, or contact the provider directly.
          </p>

          <div className="heroActions">
            <Link href="/services" className="primaryButton">
              Choose a Service
            </Link>

            <Link
              href="/register?type=client"
              className="secondaryButton"
            >
              Create Client Account
            </Link>
          </div>
        </div>
      </section>

      <div className="noticeWrap">
        <PlatformNotice compact />
      </div>

      <div className="navWrap">
        <PageNavigation
          backHref="/"
          backLabel="Home"
          nextHref="/services"
          nextLabel="Services"
        />
      </div>

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
          --page-bg: var(--sendio-page, #ffffff);
          --card-bg: var(--sendio-card, #ffffff);
          --soft-bg: var(--sendio-soft, #eef6ff);
          --soft-hover: var(--sendio-soft-hover, #e3efff);
          --border-color: var(--sendio-border, #dbeafe);
          --text-color: var(--sendio-text, #111827);
          --muted-color: var(--sendio-muted, #374151);
          --accent-color: var(--sendio-accent, #29b9f3);
          --accent-text: var(--sendio-accent-text, #ffffff);

          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background:
            radial-gradient(circle at top left, rgba(69, 207, 231, 0.18), transparent 32%),
            radial-gradient(circle at bottom right, rgba(232, 225, 241, 0.82), transparent 36%),
            linear-gradient(180deg, var(--page-bg) 0%, #f8fbff 100%);
          color: var(--text-color);
          padding: 44px 20px 70px;
        }

        .orb {
          pointer-events: none;
          position: absolute;
          border-radius: 999px;
          filter: blur(42px);
          opacity: 0.75;
          animation: floatSoft 12s ease-in-out infinite alternate;
        }

        .orbOne {
          left: -110px;
          top: -120px;
          width: 300px;
          height: 300px;
          background: rgba(69, 207, 231, 0.23);
        }

        .orbTwo {
          right: -130px;
          top: 220px;
          width: 360px;
          height: 360px;
          background: rgba(232, 225, 241, 0.9);
          animation-delay: 1.5s;
        }

        .orbThree {
          left: 50%;
          bottom: -160px;
          width: 380px;
          height: 380px;
          background: rgba(238, 246, 255, 0.95);
          animation-delay: 2.4s;
        }

        @keyframes floatSoft {
          from {
            transform: translate3d(0, 0, 0) scale(1);
          }

          to {
            transform: translate3d(18px, -16px, 0) scale(1.06);
          }
        }

        .hero,
        .section,
        .trustSection,
        .noticeWrap,
        .navWrap {
          position: relative;
          z-index: 1;
          max-width: 1120px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero {
          border-radius: 36px;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.48)),
            linear-gradient(135deg, rgba(238, 246, 255, 0.88), rgba(232, 225, 241, 0.64));
          border: 1px solid rgba(255, 255, 255, 0.78);
          box-shadow: 0 28px 90px rgba(15, 23, 42, 0.12);
          backdrop-filter: blur(22px);
          padding: 10px;
        }

        .heroGlass {
          border-radius: 30px;
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.68);
          padding: 54px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
        }

        .eyebrow,
        .sectionLabel {
          margin: 0 0 14px;
          color: var(--accent-color);
          font-size: 12px;
          letter-spacing: 0.22em;
          font-weight: 900;
          text-transform: uppercase;
        }

        .sectionLabel.light {
          color: rgba(255, 255, 255, 0.78);
        }

        h1 {
          max-width: 880px;
          margin: 0;
          color: var(--text-color);
          font-size: clamp(38px, 6vw, 72px);
          line-height: 0.96;
          letter-spacing: -0.06em;
        }

        .intro {
          max-width: 760px;
          margin: 22px 0 0;
          color: var(--muted-color);
          font-size: 18px;
          font-weight: 650;
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
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            opacity 0.2s ease,
            background 0.2s ease;
        }

        .primaryButton {
          background: var(--accent-color);
          color: var(--accent-text);
          box-shadow: 0 14px 32px rgba(41, 185, 243, 0.22);
        }

        .secondaryButton {
          background: rgba(255, 255, 255, 0.82);
          color: var(--text-color);
          border: 1px solid var(--border-color);
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.06);
        }

        .smallButton {
          background: var(--accent-color);
          color: var(--accent-text);
          padding: 11px 18px;
          font-size: 14px;
        }

        .lightButton {
          background: var(--soft-bg);
          color: var(--text-color);
          border: 1px solid var(--border-color);
        }

        .primaryButton:hover,
        .secondaryButton:hover,
        .smallButton:hover {
          transform: translateY(-2px);
          opacity: 0.92;
        }

        .noticeWrap,
        .navWrap {
          margin-top: 18px;
        }

        .section {
          margin-top: 28px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid var(--border-color);
          border-radius: 30px;
          padding: 34px;
          box-shadow: 0 18px 60px rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(18px);
        }

        .sectionHeader {
          max-width: 780px;
          margin-bottom: 24px;
        }

        .section h2,
        .panel h2,
        .trustSection h2 {
          margin: 0;
          color: var(--text-color);
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
          background: rgba(255, 255, 255, 0.84);
          border: 1px solid var(--border-color);
          border-radius: 26px;
          padding: 28px;
          box-shadow: 0 16px 44px rgba(15, 23, 42, 0.07);
        }

        .stepCard span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--soft-bg);
          color: var(--text-color);
          font-weight: 900;
          margin-bottom: 18px;
          border: 1px solid var(--border-color);
        }

        .stepCard h3 {
          margin: 0 0 10px;
          color: var(--text-color);
          font-size: 19px;
          letter-spacing: -0.02em;
        }

        .stepCard p,
        .panel p {
          margin: 0;
          color: var(--muted-color);
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
          backdrop-filter: none;
        }

        .panel p {
          margin-top: 18px;
          font-size: 15px;
        }

        .trustSection {
          margin-top: 30px;
          background:
            linear-gradient(135deg, rgba(17, 24, 39, 0.92), rgba(30, 41, 59, 0.86)),
            linear-gradient(135deg, var(--accent-color), transparent);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 30px;
          padding: 34px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.18);
        }

        .trustSection h2 {
          color: #ffffff;
        }

        .trustSection p {
          max-width: 760px;
          margin: 18px 0 0;
          color: rgba(255, 255, 255, 0.78);
          line-height: 1.75;
          font-weight: 650;
        }

        @media (max-width: 950px) {
          .quotePage {
            padding: 26px 14px 54px;
          }

          .heroGlass {
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

        @media (max-width: 560px) {
          .heroGlass,
          .section,
          .trustSection {
            padding: 26px 18px;
            border-radius: 26px;
          }

          .hero {
            border-radius: 30px;
          }

          h1 {
            font-size: clamp(34px, 12vw, 48px);
          }

          .intro {
            font-size: 15px;
          }

          .heroActions,
          .panelActions {
            width: 100%;
          }

          .primaryButton,
          .secondaryButton,
          .smallButton {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}