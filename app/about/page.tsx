import Link from 'next/link';
import PlatformNotice from '@/components/site/PlatformNotice';
import PageNavigation from '@/components/site/PageNavigation';

export default function AboutPage() {
  return (
    <main className="aboutPage">
      <section className="hero">
        <p className="eyebrow">ABOUT SENDIO</p>

        <h1>A trusted connection layer for clients, companies, and workers.</h1>

        <p className="intro">
          Sendio is built to help people find real service providers, compare
          public profiles, read reviews, and connect with companies or workers
          through a clearer and safer digital experience.
        </p>

        <div className="heroActions">
          <Link href="/services" className="primaryButton">
            Explore Services
          </Link>

          <Link href="/clients" className="secondaryButton">
            Client Guide
          </Link>
        </div>
      </section>

      <PlatformNotice compact />

      <PageNavigation
        backHref="/get-quote"
        backLabel="Back"
        nextHref="/contact"
        nextLabel="Contact"
      />

      <section className="section split">
        <article className="panel">
          <p className="sectionLabel">WHO WE ARE</p>
          <h2>Sendio connects people with service providers.</h2>

          <p>
            Sendio is a service marketplace platform designed for clients,
            companies, and independent workers. The platform helps users discover
            providers, view public profiles, compare ratings and reviews, and
            start communication after signing in.
          </p>
        </article>

        <article className="panel">
          <p className="sectionLabel">WHY SENDIO EXISTS</p>
          <h2>Finding the right provider should be easier.</h2>

          <p>
            Many clients need a simple way to compare providers before making a
            decision. Sendio brings companies and workers into one organized
            environment where profiles, services, ratings, reviews, and contact
            actions are easier to manage.
          </p>
        </article>
      </section>

      <section className="section">
        <div className="sectionHeader">
          <p className="sectionLabel">OUR ROLE</p>
          <h2>We organize, connect, and support trust.</h2>
        </div>

        <div className="cardsGrid">
          <article className="card">
            <span>01</span>
            <h3>For clients</h3>
            <p>
              Clients can browse providers, compare public information, read
              reviews, and unlock contact actions after registration or login.
            </p>
          </article>

          <article className="card">
            <span>02</span>
            <h3>For companies</h3>
            <p>
              Companies can manage public profiles, services, projects, galleries,
              social links, ads, and messages from their dashboard.
            </p>
          </article>

          <article className="card">
            <span>03</span>
            <h3>For workers</h3>
            <p>
              Workers can create public profiles, show skills and achievements,
              receive requests, and manage client activity safely.
            </p>
          </article>

          <article className="card">
            <span>04</span>
            <h3>For admins</h3>
            <p>
              Admins can monitor platform activity, moderate messages and
              requests, control ads, and prepare the platform for safe growth.
            </p>
          </article>
        </div>
      </section>

      <section className="section split">
        <article className="panel">
          <p className="sectionLabel">TRUST MODEL</p>
          <h2>Public browsing, protected actions.</h2>

          <p>
            Visitors can browse companies, workers, services, ratings, reviews,
            and ads. Valuable actions such as messages, service requests, contact
            links, ratings, and comments require login. This helps reduce spam
            and keeps important actions connected to real accounts.
          </p>
        </article>

        <article className="panel">
          <p className="sectionLabel">PLATFORM LIMITS</p>
          <h2>Sendio is not a party to user agreements.</h2>

          <p>
            Sendio helps users connect, but the final service agreement, price,
            delivery, payment, warranty, and dispute handling remain between the
            client and the selected company or worker, unless Sendio later
            provides an official payment or protection system for that service.
          </p>
        </article>
      </section>

      <section className="trustSection">
        <div>
          <p className="sectionLabel light">SENDIO VISION</p>
          <h2>Build a safer and clearer service network.</h2>

          <p>
            The goal of Sendio is to make service discovery more organized,
            transparent, and practical for everyone involved: clients who need
            help, companies that provide services, workers who offer skills, and
            admins who protect the platform.
          </p>
        </div>

        <div className="trustActions">
          <Link href="/services" className="primaryButton">
            Browse Services
          </Link>

          <Link href="/contact" className="darkButton">
            Contact Sendio
          </Link>
        </div>
      </section>

      <style>{`
        .aboutPage {
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
          max-width: 860px;
          margin: 0;
          font-size: clamp(36px, 6vw, 66px);
          line-height: 0.98;
          letter-spacing: -0.055em;
        }

        .intro {
          max-width: 740px;
          margin: 22px 0 0;
          color: var(--sendio-muted);
          font-size: 18px;
          line-height: 1.75;
          font-weight: 600;
        }

        .heroActions,
        .trustActions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 30px;
        }

        .primaryButton,
        .secondaryButton,
        .darkButton {
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

        .primaryButton {
          background: var(--sendio-accent);
          color: #ffffff;
          border: 1px solid var(--sendio-accent);
          box-shadow: 0 12px 26px rgba(35, 167, 241, 0.24);
        }

        .primaryButton:hover {
          background: var(--sendio-accent-hover);
          border-color: var(--sendio-accent-hover);
          box-shadow: 0 14px 30px rgba(35, 167, 241, 0.28);
        }

        .secondaryButton,
        .darkButton {
          background: #eef6ff;
          color: var(--sendio-text);
          border: 1px solid var(--sendio-border);
          box-shadow: 0 10px 24px rgba(17, 24, 39, 0.04);
        }

        .secondaryButton:hover,
        .darkButton:hover {
          background: #e3efff;
          border-color: #bfdbfe;
        }

        .primaryButton:hover,
        .secondaryButton:hover,
        .darkButton:hover {
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

        .trustActions {
          margin-top: 0;
          flex: 0 0 auto;
        }

        @media (max-width: 950px) {
          .aboutPage {
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

          .trustActions {
            margin-top: 10px;
          }
        }
      `}</style>
    </main>
  );
}