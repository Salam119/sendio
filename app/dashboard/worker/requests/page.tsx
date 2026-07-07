'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

type WorkerRequest = {
  id: string;
  worker_id: string | null;
  client_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  created_at: string | null;
  status: string | null;
  worker_seen: boolean | null;
  admin_seen: boolean | null;
  is_archived: boolean | null;
  moderation_status: string | null;
  admin_note: string | null;
  source_channel: string | null;
  source_url: string | null;
  event_type: string | null;
};

type WorkerRow = {
  id: string;
  name: string;
};

type ServiceRequest = {
  id: string;
  service_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  postal_code: string | null;
  street: string | null;
  house_number: string | null;
  country: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  preferred_time_window: string | null;
  urgency: string | null;
  project_description: string | null;
  status: string | null;
  created_at: string | null;
};

type ServiceRequestMatch = {
  id: string;
  request_id: string;
  provider_type: string;
  company_id: string | null;
  worker_id: string | null;
  match_rank: number | null;
  distance_km: number | null;
  city_match: boolean | null;
  status: string | null;
  provider_seen: boolean | null;
  client_seen: boolean | null;
  provider_response_message: string | null;
  declined_reason: string | null;
  responded_at: string | null;
  created_at: string | null;
  service_requests: ServiceRequest | null;
};

type RawServiceRequestMatch = Omit<ServiceRequestMatch, 'service_requests'> & {
  service_requests: ServiceRequest | ServiceRequest[] | null;
};

type InboxCardKind =
  | 'service'
  | 'sendio'
  | 'email'
  | 'whatsapp'
  | 'phone'
  | 'social'
  | 'archived'
  | 'stats';

function formatDate(value: string | null) {
  if (!value) return 'Unknown time';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Unknown time';

  return date.toLocaleString('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatServiceDate(
  dateValue: string | null,
  timeValue: string | null,
  windowValue: string | null
) {
  const parts: string[] = [];

  if (dateValue) parts.push(dateValue);
  if (timeValue) parts.push(timeValue);
  if (windowValue) parts.push(windowValue.replaceAll('_', ' '));

  return parts.length > 0 ? parts.join(' • ') : 'Flexible time';
}

function getClientName(request: ServiceRequest | null) {
  if (!request) return 'Client';

  const name = `${request.first_name ?? ''} ${request.last_name ?? ''}`.trim();

  return name || 'Client';
}

function getRequestAddress(request: ServiceRequest | null) {
  if (!request) return '';

  return [
    request.street,
    request.house_number,
    request.city,
    request.postal_code,
    request.country || 'Belgium',
  ]
    .filter(Boolean)
    .join(' ');
}

function getLocationUrl(request: ServiceRequest | null) {
  const address = getRequestAddress(request);

  if (!address) return '';

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address
  )}`;
}

function cleanPhone(phone: string | null | undefined) {
  return phone?.replace(/[^\d+]/g, '') ?? '';
}

function getSourceLabel(source: string | null, eventType: string | null) {
  if (eventType === 'request' || source === 'sendio') return 'Sendio Message';
  if (source === 'whatsapp') return 'WhatsApp';
  if (source === 'email') return 'Email';
  if (source === 'phone') return 'Phone';
  if (source === 'website') return 'Website';
  if (source === 'facebook') return 'Facebook';
  if (source === 'instagram') return 'Instagram';
  if (source === 'linkedin') return 'LinkedIn';
  if (source === 'x') return 'X';
  if (source === 'maps') return 'Maps';

  return 'Contact';
}

function getSourceIcon(source: string | null, eventType: string | null) {
  if (eventType === 'request' || source === 'sendio') return '✉';
  if (source === 'whatsapp') return '●';
  if (source === 'email') return '✉';
  if (source === 'phone') return '☎';
  if (source === 'website') return '⌂';
  if (source === 'facebook') return 'f';
  if (source === 'instagram') return '◎';
  if (source === 'linkedin') return 'in';
  if (source === 'x') return '𝕏';
  if (source === 'maps') return '📍';

  return '•';
}

function getEventLabel(eventType: string | null) {
  if (eventType === 'request') return 'Written Sendio request';
  if (eventType === 'contact_click') return 'Contact activity';
  return 'Inbox activity';
}

function canOpenSourceUrl(url: string | null) {
  if (!url) return false;

  return (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('mailto:') ||
    url.startsWith('tel:')
  );
}

function canReplyByEmail(email: string | null | undefined) {
  if (!email) return false;

  return email.trim().includes('@');
}

function getReplyMailUrl(request: WorkerRequest, workerName: string | null) {
  const email = request.email.trim();
  const subject = `Reply from ${workerName || 'Sendio'}`;
  const body = `Hello ${request.name || 'Client'},\n\n`;

  return `mailto:${email}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

function getPhoneReplyUrl(phone: string | null) {
  if (!phone) return null;

  const cleanValue = phone.trim().replace(/\s/g, '');

  if (!cleanValue) return null;

  return `tel:${cleanValue}`;
}

function getWhatsAppReplyUrl(phone: string | null) {
  const cleaned = cleanPhone(phone).replace('+', '');

  if (!cleaned) return null;

  return `https://wa.me/${cleaned}`;
}

function isSendioMessage(request: WorkerRequest) {
  return request.event_type === 'request' || request.source_channel === 'sendio';
}

function isChannel(request: WorkerRequest, channel: string) {
  return request.source_channel === channel;
}

function isSocialOrExternal(request: WorkerRequest) {
  const channel = request.source_channel ?? '';

  return (
    request.event_type === 'contact_click' &&
    !['email', 'whatsapp', 'phone', 'sendio'].includes(channel)
  );
}

export default function WorkerRequestsPage() {
  const [worker, setWorker] = useState<WorkerRow | null>(null);
  const [requests, setRequests] = useState<WorkerRequest[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequestMatch[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [pageStatus, setPageStatus] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const activeRequests = useMemo(
    () => requests.filter((request) => request.is_archived !== true),
    [requests]
  );

  const archivedRequests = useMemo(
    () => requests.filter((request) => request.is_archived === true),
    [requests]
  );

  const sendioMessages = useMemo(
    () => activeRequests.filter((request) => isSendioMessage(request)),
    [activeRequests]
  );

  const emailContacts = useMemo(
    () =>
      activeRequests.filter(
        (request) =>
          request.event_type === 'contact_click' && isChannel(request, 'email')
      ),
    [activeRequests]
  );

  const whatsappContacts = useMemo(
    () =>
      activeRequests.filter(
        (request) =>
          request.event_type === 'contact_click' &&
          isChannel(request, 'whatsapp')
      ),
    [activeRequests]
  );

  const phoneContacts = useMemo(
    () =>
      activeRequests.filter(
        (request) =>
          request.event_type === 'contact_click' && isChannel(request, 'phone')
      ),
    [activeRequests]
  );

  const socialContacts = useMemo(
    () => activeRequests.filter((request) => isSocialOrExternal(request)),
    [activeRequests]
  );

  const unreadContactCount = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.worker_seen === false && request.is_archived !== true
      ).length,
    [requests]
  );

  const serviceUnreadCount = useMemo(
    () =>
      serviceRequests.filter(
        (request) =>
          request.provider_seen === false && request.status !== 'cancelled'
      ).length,
    [serviceRequests]
  );

  const stats = useMemo(
    () => ({
      serviceRequests: serviceRequests.length,
      sendioMessages: sendioMessages.length,
      email: emailContacts.length,
      whatsapp: whatsappContacts.length,
      phone: phoneContacts.length,
      social: socialContacts.length,
      archived: archivedRequests.length,
      unread: unreadContactCount + serviceUnreadCount,
    }),
    [
      archivedRequests.length,
      emailContacts.length,
      phoneContacts.length,
      sendioMessages.length,
      serviceRequests.length,
      serviceUnreadCount,
      socialContacts.length,
      unreadContactCount,
      whatsappContacts.length,
    ]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadRequests() {
      setLoading(true);
      setPageStatus(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (userError || !user) {
        setPageStatus('You must be signed in to view worker requests.');
        setLoading(false);
        return;
      }

      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('id, name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (workerError || !workerData) {
        setWorker(null);
        setRequests([]);
        setServiceRequests([]);
        setPageStatus('Worker profile was not found for this account.');
        setLoading(false);
        return;
      }

      const selectedWorker = workerData as WorkerRow;

      setWorker(selectedWorker);

      const [oldRequestsResult, serviceRequestsResult] = await Promise.all([
        supabase
          .from('worker_requests')
          .select('*')
          .eq('worker_id', selectedWorker.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('service_request_matches')
          .select(
            `
            id,
            request_id,
            provider_type,
            company_id,
            worker_id,
            match_rank,
            distance_km,
            city_match,
            status,
            provider_seen,
            client_seen,
            provider_response_message,
            declined_reason,
            responded_at,
            created_at,
            service_requests (
              id,
              service_name,
              first_name,
              last_name,
              email,
              phone,
              city,
              postal_code,
              street,
              house_number,
              country,
              preferred_date,
              preferred_time,
              preferred_time_window,
              urgency,
              project_description,
              status,
              created_at
            )
          `
          )
          .eq('worker_id', selectedWorker.id)
          .order('created_at', { ascending: false }),
      ]);

      if (!isMounted) return;

      if (oldRequestsResult.error) {
        setRequests([]);
        setServiceRequests([]);
        setPageStatus(oldRequestsResult.error.message);
        setLoading(false);
        return;
      }

      if (serviceRequestsResult.error) {
        setRequests((oldRequestsResult.data ?? []) as WorkerRequest[]);
        setServiceRequests([]);
        setPageStatus(serviceRequestsResult.error.message);
        setLoading(false);
        return;
      }

      const normalizedServiceRequests = (
        (serviceRequestsResult.data ?? []) as unknown as RawServiceRequestMatch[]
      ).map((item) => ({
        ...item,
        service_requests: Array.isArray(item.service_requests)
          ? item.service_requests[0] ?? null
          : item.service_requests ?? null,
      }));

      setRequests((oldRequestsResult.data ?? []) as WorkerRequest[]);
      setServiceRequests(normalizedServiceRequests);
      setLoading(false);
    }

    void loadRequests();

    return () => {
      isMounted = false;
    };
  }, []);

  async function updateServiceRequestStatus(
    matchId: string,
    status: 'viewed' | 'accepted' | 'declined'
  ) {
    setUpdatingId(matchId);
    setPageStatus(null);

    const updateData =
      status === 'declined'
        ? {
            status,
            provider_seen: true,
            declined_reason: 'Declined by worker',
            responded_at: new Date().toISOString(),
          }
        : {
            status,
            provider_seen: true,
            responded_at: new Date().toISOString(),
          };

    const { error } = await supabase
      .from('service_request_matches')
      .update(updateData)
      .eq('id', matchId);

    setUpdatingId(null);

    if (error) {
      setPageStatus(error.message);
      return;
    }

    setServiceRequests((currentRequests) =>
      currentRequests.map((request) =>
        request.id === matchId
          ? {
              ...request,
              status,
              provider_seen: true,
              responded_at: updateData.responded_at,
              declined_reason:
                status === 'declined'
                  ? 'Declined by worker'
                  : request.declined_reason,
            }
          : request
      )
    );
  }

  async function deleteServiceRequestMatch(matchId: string) {
    const confirmed = window.confirm('Delete this service request from your inbox?');

    if (!confirmed) return;

    setUpdatingId(matchId);
    setPageStatus(null);

    const { error } = await supabase
      .from('service_request_matches')
      .delete()
      .eq('id', matchId);

    setUpdatingId(null);

    if (error) {
      setPageStatus(error.message);
      return;
    }

    setServiceRequests((currentRequests) =>
      currentRequests.filter((request) => request.id !== matchId)
    );
  }

  async function markRequestAsRead(requestId: string) {
    setUpdatingId(requestId);
    setPageStatus(null);

    const { error } = await supabase
      .from('worker_requests')
      .update({
        worker_seen: true,
      })
      .eq('id', requestId);

    setUpdatingId(null);

    if (error) {
      setPageStatus(error.message);
      return;
    }

    setRequests((currentRequests) =>
      currentRequests.map((request) =>
        request.id === requestId
          ? {
              ...request,
              worker_seen: true,
            }
          : request
      )
    );
  }

  async function markAllAsRead() {
    if (!worker) return;

    setPageStatus(null);

    const { error: oldRequestsError } = await supabase
      .from('worker_requests')
      .update({
        worker_seen: true,
      })
      .eq('worker_id', worker.id)
      .eq('worker_seen', false);

    if (oldRequestsError) {
      setPageStatus(oldRequestsError.message);
      return;
    }

    const { error: serviceRequestsError } = await supabase
      .from('service_request_matches')
      .update({
        provider_seen: true,
      })
      .eq('worker_id', worker.id)
      .eq('provider_seen', false);

    if (serviceRequestsError) {
      setPageStatus(serviceRequestsError.message);
      return;
    }

    setRequests((currentRequests) =>
      currentRequests.map((request) => ({
        ...request,
        worker_seen: true,
      }))
    );

    setServiceRequests((currentRequests) =>
      currentRequests.map((request) => ({
        ...request,
        provider_seen: true,
      }))
    );
  }

  async function archiveRequest(requestId: string) {
    setUpdatingId(requestId);
    setPageStatus(null);

    const { error } = await supabase
      .from('worker_requests')
      .update({
        is_archived: true,
        worker_seen: true,
      })
      .eq('id', requestId);

    setUpdatingId(null);

    if (error) {
      setPageStatus(error.message);
      return;
    }

    setRequests((currentRequests) =>
      currentRequests.map((request) =>
        request.id === requestId
          ? {
              ...request,
              is_archived: true,
              worker_seen: true,
            }
          : request
      )
    );
  }

  async function restoreRequest(requestId: string) {
    setUpdatingId(requestId);
    setPageStatus(null);

    const { error } = await supabase
      .from('worker_requests')
      .update({
        is_archived: false,
      })
      .eq('id', requestId);

    setUpdatingId(null);

    if (error) {
      setPageStatus(error.message);
      return;
    }

    setRequests((currentRequests) =>
      currentRequests.map((request) =>
        request.id === requestId
          ? {
              ...request,
              is_archived: false,
            }
          : request
      )
    );
  }

  async function deleteWorkerRequest(requestId: string) {
    const confirmed = window.confirm('Delete this item permanently?');

    if (!confirmed) return;

    setUpdatingId(requestId);
    setPageStatus(null);

    const { error } = await supabase
      .from('worker_requests')
      .delete()
      .eq('id', requestId);

    setUpdatingId(null);

    if (error) {
      setPageStatus(error.message);
      return;
    }

    setRequests((currentRequests) =>
      currentRequests.filter((request) => request.id !== requestId)
    );
  }

  function renderServiceRequestCard(match: ServiceRequestMatch) {
    const request = match.service_requests;
    const unread = match.provider_seen === false;
    const locationUrl = getLocationUrl(request);
    const phoneNumber = cleanPhone(request?.phone);
    const whatsappUrl = getWhatsAppReplyUrl(request?.phone ?? null);
    const status = match.status || 'pending';

    return (
      <article
        key={match.id}
        className={`inbox-item ${unread ? 'inbox-item-new' : ''}`}
      >
        <div className="item-head">
          <div>
            <div className="item-title-row">
              <strong>{request?.service_name || 'Service request'}</strong>
              {unread ? <span className="badge badge-new">New</span> : null}
              <span className="badge">{status}</span>
            </div>

            <p>{getClientName(request)}</p>
            <small>{formatDate(match.created_at)}</small>
          </div>
        </div>

        <div className="service-details">
          <div>
            <span>Address</span>
            <strong>{getRequestAddress(request) || 'No address provided'}</strong>
          </div>

          <div>
            <span>Preferred time</span>
            <strong>
              {formatServiceDate(
                request?.preferred_date ?? null,
                request?.preferred_time ?? null,
                request?.preferred_time_window ?? null
              )}
            </strong>
          </div>

          <div>
            <span>Phone</span>
            <strong>{request?.phone || 'No phone'}</strong>
          </div>

          <div>
            <span>Email</span>
            <strong>{request?.email || 'No email'}</strong>
          </div>

          <div className="service-description">
            <span>Project description</span>
            <strong>{request?.project_description || 'No project description.'}</strong>
          </div>
        </div>

        <div className="action-row">
          {status !== 'accepted' ? (
            <button
              type="button"
              onClick={() => updateServiceRequestStatus(match.id, 'accepted')}
              disabled={updatingId === match.id}
              className="action-primary"
            >
              Accept
            </button>
          ) : null}

          {status !== 'declined' ? (
            <button
              type="button"
              onClick={() => updateServiceRequestStatus(match.id, 'declined')}
              disabled={updatingId === match.id}
              className="action-danger-soft"
            >
              Decline
            </button>
          ) : null}

          {status === 'pending' ? (
            <button
              type="button"
              onClick={() => updateServiceRequestStatus(match.id, 'viewed')}
              disabled={updatingId === match.id}
            >
              Read
            </button>
          ) : null}

          {locationUrl ? (
            <a href={locationUrl} target="_blank" rel="noreferrer">
              Location
            </a>
          ) : null}

          {phoneNumber ? <a href={`tel:${phoneNumber}`}>Call</a> : null}

          {whatsappUrl ? (
            <a href={whatsappUrl} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          ) : null}

          {request?.email ? <a href={`mailto:${request.email}`}>Email</a> : null}

          <button
            type="button"
            onClick={() => deleteServiceRequestMatch(match.id)}
            disabled={updatingId === match.id}
            className="action-danger-soft"
          >
            Delete
          </button>
        </div>
      </article>
    );
  }

  function renderWorkerRequestItem(request: WorkerRequest) {
    const sourceLabel = getSourceLabel(request.source_channel, request.event_type);
    const sourceIcon = getSourceIcon(request.source_channel, request.event_type);
    const unread = request.worker_seen === false;
    const sourceUrlAvailable = canOpenSourceUrl(request.source_url);
    const phoneReplyUrl = getPhoneReplyUrl(request.phone);

    return (
      <article
        key={request.id}
        className={`inbox-item ${unread ? 'inbox-item-new' : ''}`}
      >
        <div className="item-head">
          <div className="source-icon">{sourceIcon}</div>

          <div>
            <div className="item-title-row">
              <strong>{request.name || 'Client'}</strong>
              {unread ? <span className="badge badge-new">New</span> : null}
              <span className="badge">{sourceLabel}</span>
            </div>

            {request.email ? <p>{request.email}</p> : null}
            {request.phone ? <p>{request.phone}</p> : null}

            <small>
              {getEventLabel(request.event_type)} • {formatDate(request.created_at)}
            </small>
          </div>
        </div>

        <div className="message-box">
          {request.message || 'No request text.'}
        </div>

        {request.moderation_status && request.moderation_status !== 'normal' ? (
          <div className="moderation-box">
            Moderation: {request.moderation_status}
          </div>
        ) : null}

        <div className="action-row">
          {sourceUrlAvailable ? (
            <a
              href={request.source_url ?? '#'}
              target={request.source_url?.startsWith('http') ? '_blank' : undefined}
              rel={request.source_url?.startsWith('http') ? 'noreferrer' : undefined}
            >
              Open
            </a>
          ) : null}

          {canReplyByEmail(request.email) ? (
            <a href={getReplyMailUrl(request, worker?.name ?? null)}>Email</a>
          ) : null}

          {phoneReplyUrl ? <a href={phoneReplyUrl}>Call</a> : null}

          {unread ? (
            <button
              type="button"
              onClick={() => markRequestAsRead(request.id)}
              disabled={updatingId === request.id}
              className="action-primary"
            >
              Read
            </button>
          ) : null}

          {request.is_archived ? (
            <button
              type="button"
              onClick={() => restoreRequest(request.id)}
              disabled={updatingId === request.id}
            >
              Restore
            </button>
          ) : (
            <button
              type="button"
              onClick={() => archiveRequest(request.id)}
              disabled={updatingId === request.id}
            >
              Archive
            </button>
          )}

          <button
            type="button"
            onClick={() => deleteWorkerRequest(request.id)}
            disabled={updatingId === request.id}
            className="action-danger-soft"
          >
            Delete
          </button>
        </div>
      </article>
    );
  }

  function isCardExpanded(kind: InboxCardKind) {
    return expandedCards[kind] === true;
  }

  function toggleCard(kind: InboxCardKind) {
    setExpandedCards((current) => ({
      ...current,
      [kind]: current[kind] !== true,
    }));
  }

  function renderInboxCard<T>({
    kind,
    title,
    subtitle,
    count,
    items,
    renderItem,
    emptyText,
  }: {
    kind: InboxCardKind;
    title: string;
    subtitle: string;
    count: number;
    items: T[];
    renderItem: (item: T) => ReactNode;
    emptyText: string;
  }) {
    const expanded = isCardExpanded(kind);
    const visibleItems = expanded ? items : items.slice(0, 1);
    const previousCount = Math.max(0, items.length - 1);

    return (
      <section className={`inbox-card inbox-card-${kind}`}>
        <div className="card-head">
          <div>
            <p>{subtitle}</p>
            <h2>{title}</h2>
          </div>

          <span>{count}</span>
        </div>

        <div className="card-content">
          {items.length === 0 ? (
            renderEmpty(emptyText)
          ) : (
            <>
              <div className="latest-label">
                <strong>Latest</strong>
                <span>{expanded ? 'Showing all items' : 'Only the newest item is visible'}</span>
              </div>

              {visibleItems.map((item) => renderItem(item))}

              {previousCount > 0 ? (
                <button
                  type="button"
                  className="expand-card-button"
                  onClick={() => toggleCard(kind)}
                >
                  {expanded
                    ? 'Hide previous items'
                    : `Show previous items (${previousCount})`}
                </button>
              ) : null}
            </>
          )}
        </div>
      </section>
    );
  }

  function renderEmpty(text: string) {
    return <p className="empty-card">{text}</p>;
  }

  return (
    <main className="worker-inbox-page">
      <section className="inbox-hero">
        <div>
          <p>WORKER INBOX</p>
          <h1>{worker ? `${worker.name} Requests` : 'Requests'}</h1>
          <span>
            Service requests, Sendio messages, email, WhatsApp, phone, social
            contacts, archive, and real stats in one clean inbox.
          </span>
        </div>

        <button
          type="button"
          onClick={markAllAsRead}
          disabled={loading || stats.unread === 0}
        >
          Mark all read
        </button>
      </section>

      {pageStatus ? <div className="page-status">{pageStatus}</div> : null}

      {loading ? (
        <section className="loading-card">Loading requests...</section>
      ) : (
        <section className="inbox-grid">
          {renderInboxCard({
            kind: 'service',
            title: 'Service Requests',
            subtitle: 'Official service jobs',
            count: serviceRequests.length,
            items: serviceRequests,
            renderItem: renderServiceRequestCard,
            emptyText: 'No official service requests yet.',
          })}

          {renderInboxCard({
            kind: 'sendio',
            title: 'Sendio Messages',
            subtitle: 'Written profile requests',
            count: sendioMessages.length,
            items: sendioMessages,
            renderItem: renderWorkerRequestItem,
            emptyText: 'No written Sendio messages yet.',
          })}

          {renderInboxCard({
            kind: 'email',
            title: 'Email',
            subtitle: 'Email contact clicks',
            count: emailContacts.length,
            items: emailContacts,
            renderItem: renderWorkerRequestItem,
            emptyText: 'No email contacts yet.',
          })}

          {renderInboxCard({
            kind: 'whatsapp',
            title: 'WhatsApp',
            subtitle: 'WhatsApp contact clicks',
            count: whatsappContacts.length,
            items: whatsappContacts,
            renderItem: renderWorkerRequestItem,
            emptyText: 'No WhatsApp contacts yet.',
          })}

          {renderInboxCard({
            kind: 'phone',
            title: 'Phone',
            subtitle: 'Call contact clicks',
            count: phoneContacts.length,
            items: phoneContacts,
            renderItem: renderWorkerRequestItem,
            emptyText: 'No phone contacts yet.',
          })}

          {renderInboxCard({
            kind: 'social',
            title: 'Social / External',
            subtitle: 'Website, maps, and socials',
            count: socialContacts.length,
            items: socialContacts,
            renderItem: renderWorkerRequestItem,
            emptyText: 'No social or external contacts yet.',
          })}

          {renderInboxCard({
            kind: 'archived',
            title: 'Archived',
            subtitle: 'Stored contact records',
            count: archivedRequests.length,
            items: archivedRequests,
            renderItem: renderWorkerRequestItem,
            emptyText: 'No archived contact records yet.',
          })}

          <section className="inbox-card inbox-card-stats">
            <div className="card-head">
              <div>
                <p>Live inbox counters</p>
                <h2>Stats</h2>
              </div>

              <span>{stats.unread}</span>
            </div>

            <div className="card-content">
              <div className="stats-grid">
                <div>
                  <span>Service Requests</span>
                  <strong>{stats.serviceRequests}</strong>
                </div>

                <div>
                  <span>Sendio Messages</span>
                  <strong>{stats.sendioMessages}</strong>
                </div>

                <div>
                  <span>Email</span>
                  <strong>{stats.email}</strong>
                </div>

                <div>
                  <span>WhatsApp</span>
                  <strong>{stats.whatsapp}</strong>
                </div>

                <div>
                  <span>Phone</span>
                  <strong>{stats.phone}</strong>
                </div>

                <div>
                  <span>Social</span>
                  <strong>{stats.social}</strong>
                </div>

                <div>
                  <span>Archived</span>
                  <strong>{stats.archived}</strong>
                </div>

                <div>
                  <span>Unread</span>
                  <strong>{stats.unread}</strong>
                </div>
              </div>
            </div>
          </section>
        </section>
      )}

      <style jsx global>{`
        .worker-inbox-page {
          --page-bg: var(--sendio-page-bg, #ffffff);
          --card-bg: var(--sendio-card-bg, #ffffff);
          --hero-bg: var(--sendio-hero-bg, #e8e1f1);
          --soft-bg: var(--sendio-rectangle-bg, #eef6ff);
          --button-bg: var(--sendio-button-bg, #29b9f3);
          --border: var(--sendio-border, #dbeafe);
          --text: var(--sendio-text, #111827);
          --muted: var(--sendio-muted, #374151);

          min-height: 100vh;
          background: var(--page-bg);
          color: var(--text);
          padding: 24px;
        }

        .inbox-hero,
        .page-status,
        .loading-card,
        .inbox-grid {
          width: min(1240px, 100%);
          margin-left: auto;
          margin-right: auto;
        }

        .inbox-hero {
          border: 1px solid var(--border);
          border-radius: 28px;
          background: linear-gradient(135deg, var(--hero-bg), var(--soft-bg));
          box-shadow: 0 24px 60px rgba(17, 24, 39, 0.08);
          padding: 26px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
        }

        .inbox-hero p {
          margin: 0 0 8px;
          color: var(--muted);
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.18em;
        }

        .inbox-hero h1 {
          margin: 0;
          color: var(--text);
          font-size: clamp(34px, 5vw, 58px);
          line-height: 1;
          letter-spacing: -0.055em;
        }

        .inbox-hero span {
          display: block;
          max-width: 760px;
          margin-top: 12px;
          color: var(--muted);
          font-size: 15px;
          line-height: 1.55;
          font-weight: 750;
        }

        .inbox-hero button {
          min-height: 42px;
          border: 0;
          border-radius: 999px;
          background: var(--button-bg);
          color: var(--text);
          padding: 0 18px;
          font-weight: 950;
          cursor: pointer;
          white-space: nowrap;
        }

        .inbox-hero button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .page-status,
        .loading-card {
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--soft-bg);
          padding: 14px 16px;
          margin-bottom: 18px;
          color: var(--text);
          font-size: 13px;
          font-weight: 900;
        }

        .inbox-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 18px;
          align-items: start;
        }

        .inbox-card {
          min-height: 330px;
          border: 1px solid var(--border);
          border-radius: 26px;
          background: var(--card-bg);
          box-shadow: 0 18px 44px rgba(17, 24, 39, 0.07);
          padding: 18px;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }

        .inbox-card-service,
        .inbox-card-sendio {
          grid-column: span 3;
        }

        .inbox-card-email,
        .inbox-card-whatsapp,
        .inbox-card-phone,
        .inbox-card-social,
        .inbox-card-archived,
        .inbox-card-stats {
          grid-column: span 2;
        }

        .card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
          margin-bottom: 12px;
        }

        .card-head p {
          margin: 0 0 5px;
          color: var(--muted);
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .card-head h2 {
          margin: 0;
          color: var(--text);
          font-size: 20px;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }

        .card-head > span {
          min-width: 34px;
          height: 30px;
          border-radius: 999px;
          background: var(--soft-bg);
          border: 1px solid var(--border);
          color: var(--text);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 10px;
          font-size: 12px;
          font-weight: 950;
        }

        .card-content {
          flex: 1;
          display: grid;
          align-content: start;
          gap: 12px;
          min-width: 0;
        }


        .latest-label {
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--soft-bg);
          padding: 9px 11px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .latest-label strong {
          color: var(--text);
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .latest-label span {
          color: var(--muted);
          font-size: 11px;
          font-weight: 800;
          text-align: right;
        }

        .expand-card-button {
          width: 100%;
          min-height: 38px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--soft-bg);
          color: var(--text);
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
        }

        .expand-card-button:hover {
          background: var(--button-bg);
        }

        .empty-card {
          margin: 0;
          border: 1px dashed var(--border);
          border-radius: 18px;
          background: var(--soft-bg);
          padding: 16px;
          color: var(--muted);
          font-size: 13px;
          font-weight: 850;
        }

        .inbox-item {
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--soft-bg);
          padding: 13px;
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .inbox-item-new {
          box-shadow: 0 0 0 2px rgba(41, 185, 243, 0.14);
        }

        .item-head {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .source-icon {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          background: var(--card-bg);
          border: 1px solid var(--border);
          color: var(--text);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 950;
          flex: 0 0 auto;
        }

        .item-title-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
        }

        .item-title-row strong {
          color: var(--text);
          font-size: 14px;
          line-height: 1.2;
        }

        .item-head p {
          margin: 5px 0 0;
          color: var(--muted);
          font-size: 12px;
          font-weight: 750;
        }

        .item-head small {
          display: block;
          margin-top: 5px;
          color: var(--muted);
          font-size: 11px;
          font-weight: 850;
        }

        .badge {
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--card-bg);
          color: var(--text);
          padding: 3px 7px;
          font-size: 10px;
          font-weight: 950;
          text-transform: capitalize;
        }

        .badge-new {
          background: rgba(34, 197, 94, 0.13);
          color: #166534;
          border-color: rgba(34, 197, 94, 0.22);
        }

        .message-box,
        .moderation-box {
          margin-top: 12px;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--card-bg);
          color: var(--text);
          padding: 11px;
          font-size: 12px;
          font-weight: 750;
          line-height: 1.55;
          white-space: pre-line;
        }

        .moderation-box {
          color: #92400e;
          font-weight: 950;
        }

        .service-details {
          margin-top: 12px;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--card-bg);
          padding: 12px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .service-details div {
          display: grid;
          gap: 3px;
        }

        .service-details span {
          color: var(--muted);
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .service-details strong {
          color: var(--text);
          font-size: 12px;
          font-weight: 850;
          line-height: 1.45;
          white-space: pre-line;
        }

        .service-description {
          grid-column: 1 / -1;
        }

        .action-row {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .action-row a,
        .action-row button {
          min-height: 30px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--card-bg);
          color: var(--text);
          padding: 0 10px;
          font-size: 11px;
          font-weight: 950;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          cursor: pointer;
        }

        .action-row button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .action-row .action-primary {
          border: 0;
          background: var(--button-bg);
          color: var(--text);
        }

        .action-row .action-danger-soft {
          background: rgba(220, 38, 38, 0.08);
          border-color: rgba(220, 38, 38, 0.18);
          color: #b91c1c;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .stats-grid div {
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--soft-bg);
          padding: 12px;
          display: grid;
          gap: 6px;
        }

        .stats-grid span {
          color: var(--muted);
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .stats-grid strong {
          color: var(--text);
          font-size: 25px;
          line-height: 1;
          font-weight: 950;
        }

        @media (max-width: 1000px) {
          .inbox-card-service,
          .inbox-card-sendio,
          .inbox-card-email,
          .inbox-card-whatsapp,
          .inbox-card-phone,
          .inbox-card-social,
          .inbox-card-archived,
          .inbox-card-stats {
            grid-column: span 6;
          }

          .inbox-hero {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 640px) {
          .worker-inbox-page {
            padding: 14px;
          }

          .service-details,
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .inbox-card {
            min-height: auto;
          }
        }
      `}</style>
    </main>
  );
}
