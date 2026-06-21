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
          max-width: 860px;
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
        .trustActions {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin-top: 34px;
        }

        .primaryButton,
        .secondaryButton,
        .darkButton {
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

        .darkButton {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.22);
        }

        .primaryButton:hover,
        .secondaryButton:hover,
        .darkButton:hover {
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

        .trustActions {
          margin-top: 0;
          flex: 0 0 auto;
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

          .trustActions {
            margin-top: 10px;
          }
        }
      `}</style>
    </main>
  );
}