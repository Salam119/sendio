import Link from 'next/link';
import PlatformNotice from '@/components/site/PlatformNotice';
import PageNavigation from '@/components/site/PageNavigation';

export default function ClientsPage() {
  return (
    <main className="clientsPage">
      <section className="hero">
        <p className="eyebrow">SENDIO CLIENTS</p>

        <h1>Find the right company or worker faster.</h1>

        <p className="intro">
          Browse service categories, compare public profiles, read ratings and
          reviews, then sign in to unlock contact actions, requests, and reviews.
        </p>

        <div className="heroActions">
          <Link href="/services" className="primaryButton">
            Browse Services
          </Link>

          <Link href="/register" className="secondaryButton">
            Create Client Account
          </Link>
        </div>
      </section>

      <PlatformNotice compact />

      <PageNavigation
        backHref="/services"
        backLabel="Back"
        nextHref="/get-quote"
        nextLabel="Get Quote"
      />

      <section className="section split">
        <article className="panel">
          <p className="sectionLabel">WITHOUT LOGIN</p>
          <h2>What visitors can do</h2>

          <ul>
            <li>Browse public company profiles.</li>
            <li>Browse public worker profiles.</li>
            <li>Explore service categories.</li>
            <li>Read ratings and review comments.</li>
            <li>Use search and filters to compare providers.</li>
          </ul>
        </article>

        <article className="panel">
          <p className="sectionLabel">AFTER LOGIN</p>
          <h2>What clients can unlock</h2>

          <ul>
            <li>Send messages to companies.</li>
            <li>Send service requests to workers.</li>
            <li>Open WhatsApp, phone, email, website, and social links.</li>
            <li>Rate and review companies and workers.</li>
            <li>Keep actions linked to a real client account.</li>
          </ul>
        </article>
      </section>

      <section className="section">
        <div className="sectionHeader">
          <p className="sectionLabel">HOW IT WORKS</p>
          <h2>A simple path from search to contact.</h2>
        </div>

        <div className="stepsGrid">
          <article className="stepCard">
            <span>01</span>
            <h3>Choose a service</h3>
            <p>
              Start from the Services page or homepage search to find the field
              you need.
            </p>
          </article>

          <article className="stepCard">
            <span>02</span>
            <h3>Compare providers</h3>
            <p>
              Review company and worker profiles, cities, ratings, reviews, and
              available information.
            </p>
          </article>

          <article className="stepCard">
            <span>03</span>
            <h3>Sign in</h3>
            <p>
              Create a client account or log in to unlock contact and request
              actions.
            </p>
          </article>

          <article className="stepCard">
            <span>04</span>
            <h3>Contact or request</h3>
            <p>
              Send a Sendio message, request a service, or open a contact channel
              directly.
            </p>
          </article>
        </div>
      </section>

      <section className="trustSection">
        <div>
          <p className="sectionLabel light">CLIENT PROTECTION</p>
          <h2>Why actions require login</h2>

          <p>
            Sendio keeps valuable actions protected to reduce spam, prevent fake
            reviews, and keep contact activity connected to real accounts. This
            helps clients, companies, workers, and admins manage communication
            more safely.
          </p>
        </div>

        <div className="trustActions">
          <Link href="/services" className="primaryButton">
            Start Searching
          </Link>

          <Link href="/login" className="darkButton">
            Login
          </Link>
        </div>
      </section>

      <style>{`
        .clientsPage {
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
          max-width: 800px;
          margin: 0;
          font-size: clamp(38px, 6vw, 70px);
          line-height: 0.96;
          letter-spacing: -0.055em;
        }

        .intro {
          max-width: 720px;
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
        .stepCard {
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

        ul {
          margin: 22px 0 0;
          padding-left: 20px;
        }

        li {
          color: #536560;
          line-height: 1.7;
          font-weight: 650;
        }

        li + li {
          margin-top: 10px;
        }

        .sectionHeader {
          max-width: 760px;
          margin-bottom: 24px;
        }

        .stepsGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
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

        .stepCard p {
          margin: 0;
          color: #536560;
          line-height: 1.7;
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
          .stepsGrid {
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