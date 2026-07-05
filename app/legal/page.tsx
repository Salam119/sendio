import Link from 'next/link';
import PlatformNotice from '@/components/site/PlatformNotice';
import PageNavigation from '@/components/site/PageNavigation';

export default function LegalPage() {
  return (
    <main className="legalPage">
      <section className="hero">
        <p className="eyebrow">LEGAL & TRUST</p>

        <h1>Terms, privacy, responsibility, and platform rules.</h1>

        <p className="intro">
          This page explains the main legal and trust principles for using
          Sendio. It combines the platform terms, user responsibilities, privacy
          principles, disclaimer, and cookies notice in one clear place.
        </p>

        <div className="heroActions">
          <Link href="/services" className="primaryButton">
            Browse Services
          </Link>

          <Link href="/contact" className="secondaryButton">
            Contact Support
          </Link>
        </div>
      </section>

      <PlatformNotice compact />

      <PageNavigation
        backHref="/pricing"
        backLabel="Back"
        nextHref="/"
        nextLabel="Home"
      />

      <section className="section legalIntro">
        <p>
          This page provides a practical summary of Sendio platform rules. It is
          not a replacement for final legal review. Before official public launch,
          Sendio legal text should be reviewed and adjusted for the countries,
          payment systems, privacy requirements, and business model used by the
          platform.
        </p>
      </section>

      <section className="legalGrid">
        <article className="legalCard">
          <p className="sectionLabel">01</p>
          <h2>Platform role</h2>

          <p>
            Sendio is an intermediary platform that helps clients, companies,
            and workers discover each other, compare public information, and
            communicate with more clarity and safety.
          </p>

          <p>
            Sendio does not act as an employer, contractor, agent, payment
            holder, insurer, legal representative, or party to any agreement
            between users, unless a specific official Sendio service states
            otherwise.
          </p>
        </article>

        <article className="legalCard">
          <p className="sectionLabel">02</p>
          <h2>User agreements</h2>

          <p>
            Any service agreement, price, appointment, delivery time, warranty,
            payment, refund, cancellation, or dispute remains the responsibility
            of the client and the selected company or worker.
          </p>

          <p>
            Users should communicate clearly, verify information before making
            decisions, and keep their own records of agreements, payments, and
            service details.
          </p>
        </article>

        <article className="legalCard">
          <p className="sectionLabel">03</p>
          <h2>Client responsibilities</h2>

          <p>
            Clients are responsible for choosing providers carefully, reviewing
            public profiles, ratings, reviews, service details, and confirming
            any agreement directly with the provider.
          </p>

          <p>
            Clients should not submit false reviews, abusive messages, spam,
            misleading requests, or illegal content through Sendio.
          </p>
        </article>

        <article className="legalCard">
          <p className="sectionLabel">04</p>
          <h2>Company and worker responsibilities</h2>

          <p>
            Companies and workers are responsible for the accuracy of their
            profiles, services, media, contact details, availability, prices,
            promises, and communications with clients.
          </p>

          <p>
            Providers must not publish misleading information, unsafe content,
            fake media, abusive material, or services they are not allowed to
            offer.
          </p>
        </article>

        <article className="legalCard">
          <p className="sectionLabel">05</p>
          <h2>Reviews and ratings</h2>

          <p>
            Reviews and ratings are intended to help users make better decisions.
            Logged-in users may review providers according to the platform rules.
          </p>

          <p>
            Sendio may moderate, hide, or remove reviews that appear abusive,
            fake, misleading, duplicated, illegal, or harmful to the platform or
            its users.
          </p>
        </article>

        <article className="legalCard">
          <p className="sectionLabel">06</p>
          <h2>Payments</h2>

          <p>
            Unless an official Sendio payment or protection system is clearly
            provided for a specific service, payments are handled directly
            between the users involved.
          </p>

          <p>
            Sendio is not responsible for money exchanged outside an official
            Sendio payment system. Users should be careful and verify agreements
            before paying or accepting payment.
          </p>
        </article>

        <article className="legalCard">
          <p className="sectionLabel">07</p>
          <h2>Ads and promotion</h2>

          <p>
            Sendio may allow companies or workers to promote their profiles,
            services, or advertisements. Ads help visibility but do not guarantee
            quality, availability, results, or client satisfaction.
          </p>

          <p>
            Sendio admins may pause, reject, reactivate, or remove ads that
            violate platform rules or create risk for users.
          </p>
        </article>

        <article className="legalCard">
          <p className="sectionLabel">08</p>
          <h2>Privacy principles</h2>

          <p>
            Sendio may process account information, profile information,
            messages, requests, reviews, contact activity, and technical data
            needed to operate the platform safely.
          </p>

          <p>
            Public profile information may be visible to visitors. Private
            account and moderation data should be protected according to the
            platform’s security rules and database permissions.
          </p>
        </article>

        <article className="legalCard">
          <p className="sectionLabel">09</p>
          <h2>Cookies and technical data</h2>

          <p>
            Sendio may use necessary technical storage, cookies, or similar
            tools to support login, security, preferences, performance, and basic
            platform functionality.
          </p>

          <p>
            Future analytics, advertising cookies, or marketing tools should be
            disclosed clearly before official production use.
          </p>
        </article>

        <article className="legalCard">
          <p className="sectionLabel">10</p>
          <h2>Moderation and safety</h2>

          <p>
            Sendio may review platform activity, messages, requests, profiles,
            reviews, and ads when needed to protect users, reduce abuse, enforce
            rules, or respond to reports.
          </p>

          <p>
            Admins may suspend, hide, archive, restore, or restrict content and
            accounts according to platform safety needs.
          </p>
        </article>

        <article className="legalCard">
          <p className="sectionLabel">11</p>
          <h2>Limitation of responsibility</h2>

          <p>
            Sendio works to provide a safer and more organized connection
            platform, but it cannot guarantee the final behavior, quality,
            performance, legality, payment, delivery, or promises of any user.
          </p>

          <p>
            Users remain responsible for their own decisions, communications,
            agreements, and actions outside the direct control of Sendio.
          </p>
        </article>

        <article className="legalCard">
          <p className="sectionLabel">12</p>
          <h2>Updates to legal pages</h2>

          <p>
            Sendio may update these terms, privacy principles, disclaimers, and
            platform rules as the service grows, especially when official payment,
            subscriptions, advanced ads, or new protection systems are added.
          </p>

          <p>
            The final production version should include a clear last updated
            date and official contact details from platform settings.
          </p>
        </article>
      </section>

      <section className="trustSection">
        <div>
          <p className="sectionLabel light">FINAL REVIEW NEEDED</p>
          <h2>This page is a launch foundation, not final legal advice.</h2>

          <p>
            Before public production launch, Sendio should review this legal
            content with a qualified legal professional and connect official
            contact details, company details, privacy rules, and payment terms
            through Admin Platform Settings.
          </p>
        </div>

        <Link href="/" className="primaryButton">
          Back to Home
        </Link>
      </section>

      <style>{`
        .legalPage {
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
        .legalGrid,
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
          max-width: 880px;
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

        .heroActions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 30px;
        }

        .primaryButton,
        .secondaryButton {
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

        .secondaryButton {
          background: #eef6ff;
          color: var(--sendio-text);
          border: 1px solid var(--sendio-border);
          box-shadow: 0 10px 24px rgba(17, 24, 39, 0.04);
        }

        .secondaryButton:hover {
          background: #e3efff;
          border-color: #bfdbfe;
        }

        .primaryButton:hover,
        .secondaryButton:hover {
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

        .legalIntro p {
          margin: 0;
          color: var(--sendio-muted);
          line-height: 1.75;
          font-weight: 700;
        }

        .legalGrid {
          margin-top: 24px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .legalCard {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid var(--sendio-border);
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 12px 30px rgba(17, 24, 39, 0.055);
        }

        .legalCard h2,
        .trustSection h2 {
          margin: 0;
          color: var(--sendio-text);
          font-size: clamp(24px, 3vw, 34px);
          line-height: 1.08;
          letter-spacing: -0.04em;
        }

        .legalCard p {
          margin: 16px 0 0;
          color: var(--sendio-muted);
          line-height: 1.72;
          font-size: 14px;
          font-weight: 600;
        }

        .legalCard .sectionLabel {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          margin: 0 0 18px;
          border-radius: 50%;
          background: #eef6ff;
          color: var(--sendio-accent);
          border: 1px solid var(--sendio-border);
          line-height: 1;
          letter-spacing: 0;
          font-weight: 900;
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

        @media (max-width: 1000px) {
          .legalPage {
            padding: 28px 14px 54px;
          }

          .hero {
            padding: 24px;
          }

          .legalGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .trustSection {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 650px) {
          .legalGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}