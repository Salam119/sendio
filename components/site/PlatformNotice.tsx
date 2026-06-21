type PlatformNoticeProps = {
  compact?: boolean;
};

export default function PlatformNotice({ compact = false }: PlatformNoticeProps) {
  return (
    <section className={compact ? 'platformNotice compact' : 'platformNotice'}>
      <div className="noticeBadge">Trust & Safety Notice</div>

      <p>
        Sendio is an intermediary platform designed to help clients, companies,
        and workers connect with more trust, clarity, and safety. Sendio does
        not act as an employer, contractor, agent, payment holder, or legal
        representative for any user. Any agreement, service, payment, delivery,
        warranty, or dispute remains the responsibility of the parties involved,
        unless a service is explicitly processed through an official Sendio
        payment or protection system.
      </p>

      <style>{`
        .platformNotice {
          max-width: 1120px;
          margin: 22px auto 0;
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(196, 151, 103, 0.22);
          border-radius: 22px;
          padding: 18px 20px;
          box-shadow: 0 14px 34px rgba(16, 43, 36, 0.07);
          color: #102b24;
        }

        .platformNotice.compact {
          margin-top: 18px;
          padding: 15px 18px;
        }

        .noticeBadge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          background: rgba(196, 151, 103, 0.16);
          color: #9a6b39;
          padding: 7px 11px;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .platformNotice p {
          margin: 0;
          color: #536560;
          font-size: 14px;
          line-height: 1.75;
          font-weight: 650;
        }

        @media (max-width: 700px) {
          .platformNotice {
            border-radius: 18px;
            padding: 16px;
          }
        }
      `}</style>
    </section>
  );
}