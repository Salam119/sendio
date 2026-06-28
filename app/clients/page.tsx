'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PlatformNotice from '@/components/site/PlatformNotice';
import { supabase } from '@/lib/supabase';

type RequestStatus = string | null;

type ServiceRequestRow = {
  id: string;
  service_name: string | null;
  service_slug: string | null;
  client_id: string | null;
  selected_provider_type: 'company' | 'worker' | null;
  selected_company_id: string | null;
  selected_worker_id: string | null;
  phone: string | null;
  city: string | null;
  postal_code: string | null;
  street: string | null;
  house_number: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  preferred_time_window: string | null;
  project_description: string | null;
  status: RequestStatus;
  submitted_at: string | null;
  created_at: string | null;
  cancelled_reason: string | null;
};

type ServiceRequestMatchRow = {
  id: string;
  request_id: string | null;
  provider_type: 'company' | 'worker' | null;
  company_id: string | null;
  worker_id: string | null;
  status: RequestStatus;
  created_at: string | null;
};

type CompanyRow = {
  id: string;
  name: string | null;
  slug: string | null;
  logo: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
};

type WorkerRow = {
  id: string;
  name: string | null;
  slug: string | null;
  avatar: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
};

type ProviderInfo = {
  id: string;
  kind: 'company' | 'worker';
  name: string;
  slug: string;
  image: string | null;
  city: string;
  address: string;
  phone: string | null;
  email: string | null;
  status: string;
};

type ClientRequestItem = ServiceRequestRow & {
  match: ServiceRequestMatchRow | null;
  provider: ProviderInfo | null;
};

function cleanPhone(phone: string | null) {
  return phone?.replace(/[^\d+]/g, '') ?? '';
}

function getWhatsappHref(phone: string | null) {
  const cleaned = cleanPhone(phone).replace('+', '');

  if (!cleaned) {
    return '';
  }

  return `https://wa.me/${cleaned}`;
}

function getProviderHref(provider: ProviderInfo) {
  return provider.kind === 'company' ? `/companies/${provider.slug}` : `/workers/${provider.slug}`;
}

function getAddressLine(request: ServiceRequestRow) {
  return [request.street, request.house_number, request.postal_code, request.city]
    .filter(Boolean)
    .join(' ');
}

function getLocationHref(request: ServiceRequestRow) {
  const address = getAddressLine(request);

  if (!address) {
    return '';
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address} Belgium`)}`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'No date';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPreferredTime(request: ServiceRequestRow) {
  const pieces = [
    request.preferred_date,
    request.preferred_time || request.preferred_time_window,
  ].filter(Boolean);

  return pieces.length > 0 ? pieces.join(' • ') : 'Flexible';
}

function normalizeStatus(value: RequestStatus) {
  return value?.replaceAll('_', ' ') || 'pending';
}

function getRequestTone(status: RequestStatus) {
  const normalized = status?.toLowerCase() ?? '';

  if (normalized.includes('accepted') || normalized.includes('completed')) {
    return 'good';
  }

  if (normalized.includes('declined') || normalized.includes('cancelled')) {
    return 'danger';
  }

  if (normalized.includes('viewed')) {
    return 'info';
  }

  return 'neutral';
}

function canCancelRequest(request: ClientRequestItem) {
  const requestStatus = request.status?.toLowerCase() ?? '';
  const matchStatus = request.match?.status?.toLowerCase() ?? '';

  return ![requestStatus, matchStatus].some(
    (status) =>
      status.includes('cancelled') ||
      status.includes('completed') ||
      status.includes('accepted')
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ClientRequestItem[]>([]);
  const [warning, setWarning] = useState('');
  const [cancellingId, setCancellingId] = useState('');

  useEffect(() => {
    let active = true;

    async function loadClientRequests() {
      setLoading(true);
      setWarning('');

      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData.user;

      if (!active) {
        return;
      }

      if (userError) {
        setWarning(userError.message);
      }

      if (!user) {
        setCurrentUserEmail('');
        setCurrentUserId('');
        setRequests([]);
        setLoading(false);
        return;
      }

      setCurrentUserEmail(user.email ?? '');
      setCurrentUserId(user.id);

      const { data: requestRows, error: requestError } = await supabase
        .from('service_requests')
        .select(
          'id, service_name, service_slug, client_id, selected_provider_type, selected_company_id, selected_worker_id, phone, city, postal_code, street, house_number, preferred_date, preferred_time, preferred_time_window, project_description, status, submitted_at, created_at, cancelled_reason'
        )
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!active) {
        return;
      }

      if (requestError) {
        setWarning(requestError.message);
        setRequests([]);
        setLoading(false);
        return;
      }

      const safeRequests = (requestRows ?? []) as ServiceRequestRow[];

      if (safeRequests.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      const requestIds = safeRequests.map((request) => request.id);

      const { data: matchRows, error: matchesError } = await supabase
        .from('service_request_matches')
        .select('id, request_id, provider_type, company_id, worker_id, status, created_at')
        .in('request_id', requestIds)
        .order('created_at', { ascending: true });

      if (!active) {
        return;
      }

      if (matchesError) {
        setWarning(matchesError.message);
      }

      const safeMatches = (matchRows ?? []) as ServiceRequestMatchRow[];
      const matchByRequestId = new Map<string, ServiceRequestMatchRow>();

      safeMatches.forEach((match) => {
        if (match.request_id && !matchByRequestId.has(match.request_id)) {
          matchByRequestId.set(match.request_id, match);
        }
      });

      const companyIds = Array.from(
        new Set(
          safeRequests
            .map((request) => request.selected_company_id)
            .concat(safeMatches.map((match) => match.company_id))
            .filter(Boolean) as string[]
        )
      );

      const workerIds = Array.from(
        new Set(
          safeRequests
            .map((request) => request.selected_worker_id)
            .concat(safeMatches.map((match) => match.worker_id))
            .filter(Boolean) as string[]
        )
      );

      const [companiesResult, workersResult] = await Promise.all([
        companyIds.length > 0
          ? supabase
              .from('companies')
              .select('id, name, slug, logo, city, address, phone, email, status')
              .in('id', companyIds)
          : Promise.resolve({ data: [] as CompanyRow[], error: null }),
        workerIds.length > 0
          ? supabase
              .from('workers')
              .select('id, name, slug, avatar, city, phone, email, status')
              .in('id', workerIds)
          : Promise.resolve({ data: [] as WorkerRow[], error: null }),
      ]);

      if (!active) {
        return;
      }

      if (companiesResult.error) {
        setWarning(companiesResult.error.message);
      }

      if (workersResult.error) {
        setWarning(workersResult.error.message);
      }

      const companyMap = new Map<string, ProviderInfo>();
      const workerMap = new Map<string, ProviderInfo>();

      ((companiesResult.data ?? []) as CompanyRow[]).forEach((company) => {
        companyMap.set(company.id, {
          id: company.id,
          kind: 'company',
          name: company.name || 'Company',
          slug: company.slug || company.id,
          image: company.logo,
          city: company.city || '',
          address: company.address || '',
          phone: company.phone,
          email: company.email,
          status: company.status || 'available',
        });
      });

      ((workersResult.data ?? []) as WorkerRow[]).forEach((worker) => {
        workerMap.set(worker.id, {
          id: worker.id,
          kind: 'worker',
          name: worker.name || 'Worker',
          slug: worker.slug || worker.id,
          image: worker.avatar,
          city: worker.city || '',
          address: '',
          phone: worker.phone,
          email: worker.email,
          status: worker.status || 'available',
        });
      });

      const items = safeRequests.map((request) => {
        const match = matchByRequestId.get(request.id) ?? null;
        const companyId = request.selected_company_id || match?.company_id || '';
        const workerId = request.selected_worker_id || match?.worker_id || '';

        return {
          ...request,
          match,
          provider: companyId ? companyMap.get(companyId) ?? null : workerMap.get(workerId) ?? null,
        };
      });

      setRequests(items);
      setLoading(false);
    }

    loadClientRequests();

    return () => {
      active = false;
    };
  }, []);

  const requestCounts = useMemo(() => {
    const accepted = requests.filter((request) => {
      const requestStatus = request.status?.toLowerCase() ?? '';
      const matchStatus = request.match?.status?.toLowerCase() ?? '';

      return requestStatus.includes('accepted') || matchStatus.includes('accepted');
    }).length;

    const pending = requests.filter((request) => {
      const requestStatus = request.status?.toLowerCase() ?? '';
      const matchStatus = request.match?.status?.toLowerCase() ?? '';

      return (
        !requestStatus.includes('cancelled') &&
        !requestStatus.includes('completed') &&
        !requestStatus.includes('declined') &&
        !matchStatus.includes('accepted') &&
        !matchStatus.includes('declined')
      );
    }).length;

    const closed = requests.filter((request) => {
      const requestStatus = request.status?.toLowerCase() ?? '';
      const matchStatus = request.match?.status?.toLowerCase() ?? '';

      return (
        requestStatus.includes('cancelled') ||
        requestStatus.includes('completed') ||
        requestStatus.includes('declined') ||
        matchStatus.includes('declined')
      );
    }).length;

    return {
      total: requests.length,
      accepted,
      pending,
      closed,
    };
  }, [requests]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  async function cancelRequest(requestId: string) {
    if (!currentUserId) {
      return;
    }

    const confirmed = window.confirm('Cancel this request?');

    if (!confirmed) {
      return;
    }

    setCancellingId(requestId);
    setWarning('');

    const { error: requestError } = await supabase
      .from('service_requests')
      .update({
        status: 'cancelled',
        cancelled_reason: 'Client cancelled the request from the clients page.',
      })
      .eq('id', requestId)
      .eq('client_id', currentUserId);

    if (requestError) {
      setWarning(requestError.message);
      setCancellingId('');
      return;
    }

    const { error: matchesError } = await supabase
      .from('service_request_matches')
      .update({ status: 'cancelled' })
      .eq('request_id', requestId);

    if (matchesError) {
      setWarning(matchesError.message);
    }

    setRequests((current) =>
      current.map((request) =>
        request.id === requestId
          ? {
              ...request,
              status: 'cancelled',
              cancelled_reason: 'Client cancelled the request from the clients page.',
              match: request.match ? { ...request.match, status: 'cancelled' } : request.match,
            }
          : request
      )
    );

    setCancellingId('');
  }

  return (
    <main className="clientsPage">
      <header className="clientTopBar">
        <Link href="/" className="sendioMiniLogo">
          Sendio
        </Link>

        <div className="clientTopActions">
          {currentUserId ? (
            <span className="clientEmail">{currentUserEmail || 'Client account'}</span>
          ) : (
            <Link href="/login?redirectTo=/clients" className="accountLink">
              Login
            </Link>
          )}

          <button
            type="button"
            className="menuButton"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            ☰
          </button>
        </div>
      </header>

      {menuOpen ? (
        <div className="menuLayer">
          <button
            type="button"
            className="menuShade"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />

          <aside className="sideMenu">
            <div className="menuHead">
              <strong>Sendio</strong>

              <button
                type="button"
                className="menuClose"
                onClick={() => setMenuOpen(false)}
              >
                ×
              </button>
            </div>

            <nav className="menuLinks">
              <Link href="/">Home</Link>
              <Link href="/services">Services</Link>
              <Link href="/contact">Contact</Link>
              {currentUserId ? (
                <button type="button" onClick={handleLogout}>
                  Logout
                </button>
              ) : (
                <Link href="/register">Create Account</Link>
              )}
            </nav>
          </aside>
        </div>
      ) : null}

      <section className="hero">
        <p className="eyebrow">SENDIO CLIENTS</p>

        <h1>{currentUserId ? 'My service requests.' : 'Find the right provider faster.'}</h1>

        <p className="intro">
          {currentUserId
            ? 'Track your real Sendio service requests, provider responses, address details, and contact actions in one place.'
            : 'Browse services and public providers freely. Sign in when you want to send a request, contact a provider, or manage your request history.'}
        </p>

        <div className="heroActions">
          <Link href="/services" className="primaryButton">
            Browse Services
          </Link>

          {currentUserId ? (
            <button type="button" className="secondaryButton" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <Link href="/register" className="secondaryButton">
              Create Client Account
            </Link>
          )}
        </div>
      </section>

      <PlatformNotice compact />

      {warning ? <p className="warningBox">{warning}</p> : null}

      {loading ? (
        <section className="section">
          <h2>Loading your requests...</h2>
        </section>
      ) : currentUserId ? (
        <>
          <section className="summaryGrid">
            <article>
              <span>Total</span>
              <strong>{requestCounts.total}</strong>
            </article>

            <article>
              <span>Pending</span>
              <strong>{requestCounts.pending}</strong>
            </article>

            <article>
              <span>Accepted</span>
              <strong>{requestCounts.accepted}</strong>
            </article>

            <article>
              <span>Closed</span>
              <strong>{requestCounts.closed}</strong>
            </article>
          </section>

          <section className="section">
            <div className="sectionHeader">
              <div>
                <p className="sectionLabel">REAL REQUESTS</p>
                <h2>My requests</h2>
              </div>
            </div>

            {requests.length > 0 ? (
              <div className="requestList">
                {requests.map((request) => {
                  const provider = request.provider;
                  const locationHref = getLocationHref(request);
                  const whatsappHref = provider ? getWhatsappHref(provider.phone) : '';
                  const requestTone = getRequestTone(request.status);
                  const matchTone = getRequestTone(request.match?.status ?? null);

                  return (
                    <article className="requestCard" key={request.id}>
                      <div className="requestCardHead">
                        <div>
                          <p className="serviceName">{request.service_name || 'Service request'}</p>
                          <span className="createdAt">
                            Sent {formatDateTime(request.submitted_at || request.created_at)}
                          </span>
                        </div>

                        <div className="badgeGroup">
                          <span className={`statusBadge ${requestTone}`}>
                            Request: {normalizeStatus(request.status)}
                          </span>

                          {request.match ? (
                            <span className={`statusBadge ${matchTone}`}>
                              Provider: {normalizeStatus(request.match.status)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="requestBody">
                        <div className="providerPanel">
                          {provider ? (
                            <>
                              <Link
                                href={getProviderHref(provider)}
                                className="providerImage"
                                style={
                                  provider.image
                                    ? {
                                        backgroundImage: `url("${provider.image}")`,
                                      }
                                    : undefined
                                }
                              >
                                {!provider.image ? provider.name.charAt(0).toUpperCase() : null}
                              </Link>

                              <div className="providerInfo">
                                <Link href={getProviderHref(provider)} className="providerName">
                                  {provider.name}
                                </Link>
                                <span>{provider.kind === 'company' ? 'Company' : 'Worker'}</span>
                                <span>{provider.city || 'Nearby area'}</span>
                                <span>{provider.status}</span>
                              </div>
                            </>
                          ) : (
                            <div className="providerMissing">
                              <strong>Provider selection pending</strong>
                              <span>Provider details will appear after a match is available.</span>
                            </div>
                          )}
                        </div>

                        <div className="detailsPanel">
                          <div>
                            <span>Address</span>
                            <strong>{getAddressLine(request) || 'No address saved'}</strong>
                          </div>

                          <div>
                            <span>Preferred time</span>
                            <strong>{formatPreferredTime(request)}</strong>
                          </div>

                          <div>
                            <span>Client phone</span>
                            <strong>{request.phone || 'No phone added'}</strong>
                          </div>

                          <div>
                            <span>Request details</span>
                            <strong>{request.project_description || 'No description added'}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="cardActions">
                        {request.service_slug ? (
                          <Link href={`/services/${request.service_slug}`}>View service</Link>
                        ) : null}

                        {provider ? <Link href={getProviderHref(provider)}>Open provider</Link> : null}

                        {locationHref ? (
                          <a href={locationHref} target="_blank" rel="noreferrer">
                            Location
                          </a>
                        ) : null}

                        {provider?.phone ? <a href={`tel:${cleanPhone(provider.phone)}`}>Call</a> : null}

                        {whatsappHref ? (
                          <a href={whatsappHref} target="_blank" rel="noreferrer">
                            WhatsApp
                          </a>
                        ) : null}

                        {provider?.email ? <a href={`mailto:${provider.email}`}>Email</a> : null}

                        {canCancelRequest(request) ? (
                          <button
                            type="button"
                            onClick={() => cancelRequest(request.id)}
                            disabled={cancellingId === request.id}
                          >
                            {cancellingId === request.id ? 'Cancelling...' : 'Cancel request'}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="emptyState">
                <h3>No service requests yet</h3>
                <p>Your real Sendio service requests will appear here after you send one.</p>

                <Link href="/services" className="primaryButton">
                  Browse Services
                </Link>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="section publicGrid">
          <article className="panel">
            <p className="sectionLabel">VISITOR ACCESS</p>
            <h2>Browse first, request after login.</h2>
            <p>
              Visitors can view services, companies, workers, ratings, and public profiles.
              Contact actions and service requests open only after login.
            </p>

            <Link href="/services" className="primaryButton">
              Browse Services
            </Link>
          </article>

          <article className="panel">
            <p className="sectionLabel">CLIENT ACCOUNT</p>
            <h2>Use a real account for requests.</h2>
            <p>
              Your request will be linked to your Sendio account and email, so providers
              can respond through a real request record.
            </p>

            <div className="inlineActions">
              <Link href="/login?redirectTo=/clients" className="primaryButton">
                Login
              </Link>

              <Link href="/register" className="secondaryLightButton">
                Create Account
              </Link>
            </div>
          </article>
        </section>
      )}

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  .clientsPage {
    min-height: 100vh;
    background: var(--sendio-page-bg, #ffffff);
    color: var(--sendio-text, #111827);
    padding: 18px 20px 70px;
  }

  .clientTopBar,
  .hero,
  .section,
  .summaryGrid,
  .warningBox {
    max-width: 1120px;
    margin-left: auto;
    margin-right: auto;
  }

  .clientTopBar {
    min-height: 46px;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .sendioMiniLogo {
    color: var(--sendio-button-bg, #29b9f3);
    text-decoration: none;
    font-size: 24px;
    font-weight: 950;
    letter-spacing: -0.05em;
  }

  .clientTopActions {
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }

  .clientEmail,
  .accountLink,
  .menuButton {
    min-height: 38px;
    border-radius: 999px;
    border: 1px solid var(--sendio-border, #dbeafe);
    background: var(--sendio-card-bg, #ffffff);
    color: var(--sendio-text, #111827);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
    padding: 0 14px;
  }

  .menuButton {
    width: 38px;
    padding: 0;
    font-size: 18px;
    cursor: pointer;
  }

  .menuLayer {
    position: fixed;
    inset: 0;
    z-index: 100;
  }

  .menuShade {
    position: absolute;
    inset: 0;
    border: 0;
    background: rgba(17, 24, 39, 0.22);
  }

  .sideMenu {
    position: relative;
    z-index: 2;
    width: min(280px, 78vw);
    min-height: 100vh;
    background: var(--sendio-card-bg, #ffffff);
    border-right: 1px solid var(--sendio-border, #dbeafe);
    padding: 18px;
    box-shadow: 16px 0 44px rgba(17, 24, 39, 0.14);
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 18px;
  }

  .menuHead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--sendio-border, #dbeafe);
    padding-bottom: 12px;
  }

  .menuHead strong {
    color: var(--sendio-button-bg, #29b9f3);
    font-size: 22px;
    font-weight: 950;
    letter-spacing: -0.05em;
  }

  .menuClose {
    border: 0;
    background: transparent;
    color: var(--sendio-text, #111827);
    font-size: 28px;
    cursor: pointer;
  }

  .menuLinks {
    display: grid;
    gap: 10px;
    align-content: start;
  }

  .menuLinks a,
  .menuLinks button {
    min-height: 40px;
    border-radius: 999px;
    border: 1px solid var(--sendio-border, #dbeafe);
    background: var(--sendio-rectangle-bg, #eef6ff);
    color: var(--sendio-text, #111827);
    text-decoration: none;
    font-size: 13px;
    font-weight: 900;
    padding: 0 16px;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
  }

  .hero {
    background: var(--sendio-hero-bg, #e8e1f1);
    color: var(--sendio-text, #111827);
    border: 1px solid var(--sendio-border, #dbeafe);
    border-radius: 34px;
    padding: 52px;
    box-shadow: 0 24px 70px rgba(17, 24, 39, 0.08);
  }

  .eyebrow,
  .sectionLabel {
    margin: 0 0 14px;
    color: var(--sendio-muted, #374151);
    font-size: 12px;
    letter-spacing: 0.22em;
    font-weight: 900;
    text-transform: uppercase;
  }

  h1 {
    max-width: 800px;
    margin: 0;
    font-size: clamp(38px, 6vw, 68px);
    line-height: 0.98;
    letter-spacing: -0.055em;
  }

  .intro {
    max-width: 720px;
    margin: 22px 0 0;
    color: var(--sendio-muted, #374151);
    font-size: 18px;
    line-height: 1.75;
    font-weight: 650;
  }

  .heroActions,
  .inlineActions {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin-top: 30px;
  }

  .primaryButton,
  .secondaryButton,
  .secondaryLightButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    border-radius: 999px;
    padding: 13px 22px;
    font-weight: 900;
    border: 1px solid var(--sendio-border, #dbeafe);
    cursor: pointer;
  }

  .primaryButton {
    background: var(--sendio-button-bg, #29b9f3);
    color: var(--sendio-text, #111827);
  }

  .secondaryButton,
  .secondaryLightButton {
    background: var(--sendio-card-bg, #ffffff);
    color: var(--sendio-text, #111827);
  }

  .warningBox {
    margin-top: 18px;
    border: 1px solid var(--sendio-button-bg, #29b9f3);
    background: var(--sendio-rectangle-bg, #eef6ff);
    color: var(--sendio-text, #111827);
    border-radius: 18px;
    padding: 14px 18px;
    font-size: 13px;
    font-weight: 850;
  }

  .section {
    margin-top: 28px;
    background: var(--sendio-card-bg, #ffffff);
    border: 1px solid var(--sendio-border, #dbeafe);
    border-radius: 30px;
    padding: 30px;
    box-shadow: 0 18px 50px rgba(17, 24, 39, 0.07);
  }

  .sectionHeader {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: flex-end;
    margin-bottom: 20px;
  }

  .section h2,
  .panel h2 {
    margin: 0;
    font-size: clamp(28px, 4vw, 42px);
    line-height: 1.08;
    letter-spacing: -0.04em;
  }

  .summaryGrid {
    margin-top: 26px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .summaryGrid article {
    background: var(--sendio-card-bg, #ffffff);
    border: 1px solid var(--sendio-border, #dbeafe);
    border-radius: 22px;
    padding: 18px;
    display: grid;
    gap: 8px;
    box-shadow: 0 14px 34px rgba(17, 24, 39, 0.06);
  }

  .summaryGrid span {
    color: var(--sendio-muted, #374151);
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .summaryGrid strong {
    color: var(--sendio-text, #111827);
    font-size: 34px;
    line-height: 1;
    font-weight: 950;
  }

  .requestList {
    display: grid;
    gap: 16px;
  }

  .requestCard {
    border: 1px solid var(--sendio-border, #dbeafe);
    background: var(--sendio-rectangle-bg, #eef6ff);
    border-radius: 24px;
    padding: 18px;
  }

  .requestCardHead {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 14px;
  }

  .serviceName {
    margin: 0 0 5px;
    color: var(--sendio-text, #111827);
    font-size: 21px;
    font-weight: 950;
    letter-spacing: -0.03em;
  }

  .createdAt {
    color: var(--sendio-muted, #374151);
    font-size: 12px;
    font-weight: 800;
  }

  .badgeGroup {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }

  .statusBadge {
    border-radius: 999px;
    border: 1px solid var(--sendio-border, #dbeafe);
    background: var(--sendio-card-bg, #ffffff);
    color: var(--sendio-text, #111827);
    padding: 7px 10px;
    font-size: 11px;
    font-weight: 950;
    text-transform: capitalize;
  }

  .statusBadge.good {
    background: rgba(22, 163, 74, 0.1);
    border-color: rgba(22, 163, 74, 0.22);
  }

  .statusBadge.danger {
    background: rgba(220, 38, 38, 0.1);
    border-color: rgba(220, 38, 38, 0.22);
  }

  .statusBadge.info {
    background: rgba(41, 185, 243, 0.12);
    border-color: rgba(41, 185, 243, 0.22);
  }

  .requestBody {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 14px;
  }

  .providerPanel,
  .detailsPanel {
    background: var(--sendio-card-bg, #ffffff);
    border: 1px solid var(--sendio-border, #dbeafe);
    border-radius: 18px;
    padding: 14px;
  }

  .providerPanel {
    display: grid;
    grid-template-columns: 86px 1fr;
    gap: 12px;
    align-items: center;
  }

  .providerImage {
    width: 86px;
    height: 86px;
    border-radius: 18px;
    background-color: var(--sendio-rectangle-bg, #eef6ff);
    background-size: cover;
    background-position: center;
    color: var(--sendio-button-bg, #29b9f3);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 32px;
    font-weight: 950;
  }

  .providerInfo {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .providerName {
    color: var(--sendio-text, #111827);
    text-decoration: none;
    font-size: 16px;
    font-weight: 950;
  }

  .providerInfo span,
  .providerMissing span {
    color: var(--sendio-muted, #374151);
    font-size: 12px;
    font-weight: 800;
  }

  .providerMissing {
    grid-column: 1 / -1;
    display: grid;
    gap: 6px;
  }

  .providerMissing strong {
    font-size: 15px;
  }

  .detailsPanel {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .detailsPanel div {
    display: grid;
    gap: 4px;
  }

  .detailsPanel span {
    color: var(--sendio-muted, #374151);
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .detailsPanel strong {
    color: var(--sendio-text, #111827);
    font-size: 13px;
    line-height: 1.55;
    font-weight: 850;
    white-space: pre-wrap;
  }

  .cardActions {
    margin-top: 14px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .cardActions a,
  .cardActions button {
    min-height: 34px;
    border-radius: 999px;
    border: 1px solid var(--sendio-border, #dbeafe);
    background: var(--sendio-card-bg, #ffffff);
    color: var(--sendio-text, #111827);
    text-decoration: none;
    padding: 0 13px;
    font-size: 12px;
    font-weight: 950;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
  }

  .cardActions button {
    background: rgba(220, 38, 38, 0.08);
  }

  .cardActions button:disabled {
    opacity: 0.65;
    cursor: wait;
  }

  .emptyState {
    border: 1px solid var(--sendio-border, #dbeafe);
    border-radius: 22px;
    background: var(--sendio-rectangle-bg, #eef6ff);
    padding: 26px;
    text-align: center;
  }

  .emptyState h3 {
    margin: 0;
    font-size: 26px;
    letter-spacing: -0.04em;
  }

  .emptyState p {
    color: var(--sendio-muted, #374151);
    font-size: 14px;
    line-height: 1.6;
    font-weight: 750;
    margin: 12px auto 20px;
    max-width: 520px;
  }

  .publicGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
    background: transparent;
    border: 0;
    box-shadow: none;
    padding: 0;
  }

  .panel {
    background: var(--sendio-card-bg, #ffffff);
    border: 1px solid var(--sendio-border, #dbeafe);
    border-radius: 26px;
    padding: 28px;
    box-shadow: 0 16px 40px rgba(17, 24, 39, 0.06);
  }

  .panel p {
    color: var(--sendio-muted, #374151);
    line-height: 1.7;
    font-weight: 700;
  }

  @media (max-width: 920px) {
    .hero {
      padding: 36px 24px;
    }

    .summaryGrid,
    .publicGrid,
    .requestBody {
      grid-template-columns: 1fr;
    }

    .requestCardHead,
    .sectionHeader {
      align-items: flex-start;
      flex-direction: column;
    }

    .badgeGroup {
      justify-content: flex-start;
    }
  }

  @media (max-width: 560px) {
    .clientsPage {
      padding-left: 14px;
      padding-right: 14px;
    }

    .clientTopBar {
      align-items: flex-start;
      flex-direction: column;
      gap: 10px;
    }

    .detailsPanel {
      grid-template-columns: 1fr;
    }

    .providerPanel {
      grid-template-columns: 70px 1fr;
    }

    .providerImage {
      width: 70px;
      height: 70px;
      border-radius: 16px;
    }
  }
`;
