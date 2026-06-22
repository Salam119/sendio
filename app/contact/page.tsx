import Link from 'next/link';
import PlatformNotice from '@/components/site/PlatformNotice';
import PageNavigation from '@/components/site/PageNavigation';

export default function ContactPage() {
  return (
    <main className="contactPage">
      <section className="hero">
        <p className="eyebrow">CONTACT & SUPPORT</p>

        <h1>Support, questions, and platform help in one place.</h1>

        <p className="intro">
          This page helps clients, companies, workers, and visitors understand
          how to get help, where to start, and how to report a problem on Sendio.
        </p>

        <div className="heroActions">
          <Link href="/services" className="primaryButton">
            Browse Services
          </Link>

          <Link href="/clients" className="secondaryButton">
            Client Guide
          </Link>
        </div>
      </section>

      <PlatformNotice compact />

      <PageNavigation
        backHref="/about"
        backLabel="Back"
        nextHref="/pricing"
        nextLabel="Pricing"
      />

      <section className="section split">
        <article className="panel">
          <p className="sectionLabel">CONTACT SENDIO</p>
          <h2>Official contact details will be managed by the platform admin.</h2>

          <p>
            Sendio contact information such as support email, phone, WhatsApp,
            social links, and office address should be controlled from the future
            Admin Platform Settings page. This avoids hardcoded contact data and
            keeps public information easy to update.
          </p>
        </article>

        <article className="panel">
          <p className="sectionLabel">NEED A SERVICE?</p>
          <h2>Contact providers from their public profiles.</h2>

          <p>
            If you need a service, start from the Services page, choose a
            category, open a company or worker profile, then sign in to unlock
            contact actions, requests, WhatsApp, phone, email, and reviews.
          </p>

          <div className="panelActions">
            <Link href="/services" className="smallButton">
              Open Services
            </Link>

            <Link href="/get-quote" className="smallButton lightButton">
              Get Quote Guide
            </Link>
          </div>
        </article>
      </section>

      <section className="section">
        <div className="sectionHeader">
          <p className="sectionLabel">QUICK HELP</p>
          <h2>Frequently asked questions</h2>
        </div>

        <div className="faqGrid">
          <article className="faqCard">
            <h3>Can visitors browse without an account?</h3>
            <p>
              Yes. Visitors can browse companies, workers, services, ratings,
              reviews, and public profiles without logging in.
            </p>
          </article>

          <article className="faqCard">
            <h3>Why are contact buttons locked?</h3>
            <p>
              Contact actions are protected to reduce spam, prevent fake
              activity, and keep messages, requests, and reviews linked to real
              authenticated users.
            </p>
          </article>

          <article className="faqCard">
            <h3>Where does a client send a request?</h3>
            <p>
              Requests should be sent from the selected company or worker profile
              after the client logs in.
            </p>
          </article>

          <article className="faqCard">
            <h3>Does Sendio receive payments between users?</h3>
            <p>
              No. Unless an official Sendio payment system is provided for a
              specific service, payments and agreements remain between the
              client and the selected provider.
            </p>
          </article>

          <article className="faqCard">
            <h3>Can companies and workers manage their profiles?</h3>
            <p>
              Yes. Company owners and workers manage their own public profiles
              through their dashboards.
            </p>
          </article>

          <article className="faqCard">
            <h3>How are abuse reports handled?</h3>
            <p>
              Sendio admin moderation can review platform activity. A dedicated
              report system can be connected later through Admin Settings and
              moderation tools.
            </p>
          </article>
        </div>
      </section>

      <section className="section split">
        <article className="panel">
          <p className="sectionLabel">REPORT A PROBLEM</p>
          <h2>Use Sendio responsibly.</h2>

          <p>
            If a profile, message, request, review, or advertisement appears
            abusive, misleading, unsafe, or inappropriate, it should be reviewed
            by Sendio administration. A direct report flow can be added later to
            connect this page with admin moderation.
          </p>
        </article>

        <article className="panel">
          <p className="sectionLabel">SUPPORT DIRECTION</p>
          <h2>Choose the right place first.</h2>

          <ul>
            <li>Need a service? Start from Services.</li>
            <li>Need to contact a provider? Open their profile.</li>
            <li>Need account access? Use Login or Register.</li>
            <li>Need platform support? Use official Sendio contact channels once configured.</li>
          </ul>
        </article>
      </section>

      <section className="trustSection">
        <div>
          <p className="sectionLabel light">PLATFORM SUPPORT</p>
          <h2>Contact information will become admin-controlled.</h2>

          <p>
            The next platform settings phase should allow Sendio admin to update
            the public support email, WhatsApp, phone, office address, social
            links, and legal contact details without editing code.
          </p>
        </div>

        <Link href="/pricing" className="primaryButton">
          Continue to Pricing
        </Link>
      </section>

      <style>{`
        .contactPage {
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
        .faqCard {
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
        .faqCard p,
        li {
          color: #536560;
          line-height: 1.75;
          font-size: 15px;
          font-weight: 650;
        }

        .panel p {
          margin: 18px 0 0;
        }

        .sectionHeader {
          max-width: 760px;
          margin-bottom: 24px;
        }

        .faqGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .faqCard h3 {
          margin: 0 0 12px;
          font-size: 19px;
          letter-spacing: -0.02em;
        }

        .faqCard p {
          margin: 0;
          font-size: 14px;
        }

        ul {
          margin: 18px 0 0;
          padding-left: 20px;
        }

        li + li {
          margin-top: 10px;
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
          .faqGrid {
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