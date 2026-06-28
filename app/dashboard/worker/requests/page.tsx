'use client';

import { useEffect, useMemo, useState } from 'react';
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
  if (eventType === 'request' || source === 'sendio') return 'Sendio Request';
  if (source === 'whatsapp') return 'WhatsApp';
  if (source === 'email') return 'Email';
  if (source === 'phone') return 'Phone';
  if (source === 'website') return 'Website';
  if (source === 'facebook') return 'Facebook';
  if (source === 'instagram') return 'Instagram';
  if (source === 'linkedin') return 'LinkedIn';
  if (source === 'x') return 'X';

  return 'Contact';
}

function getSourceIcon(source: string | null, eventType: string | null) {
  if (eventType === 'request' || source === 'sendio') return '🛠️';
  if (source === 'whatsapp') return '🟢';
  if (source === 'email') return '✉️';
  if (source === 'phone') return '☎️';
  if (source === 'website') return '🌐';
  if (source === 'facebook') return 'f';
  if (source === 'instagram') return '◎';
  if (source === 'linkedin') return 'in';
  if (source === 'x') return '𝕏';

  return '•';
}

function getEventLabel(eventType: string | null) {
  if (eventType === 'request') return 'Internal service request';
  if (eventType === 'contact_click') return 'External contact click';
  return 'Contact activity';
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

export default function WorkerRequestsPage() {
  const [worker, setWorker] = useState<WorkerRow | null>(null);
  const [requests, setRequests] = useState<WorkerRequest[]>([]);
  const [serviceRequests, setServiceRequests] = useState<
    ServiceRequestMatch[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [pageStatus, setPageStatus] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const visibleRequests = useMemo(() => {
    return requests.filter((request) =>
      showArchived ? request.is_archived === true : request.is_archived !== true
    );
  }, [requests, showArchived]);

  const unreadCount = useMemo(() => {
    return requests.filter(
      (request) =>
        request.worker_seen === false && request.is_archived !== true
    ).length;
  }, [requests]);

  const serviceUnreadCount = useMemo(() => {
    return serviceRequests.filter(
      (request) =>
        request.provider_seen === false && request.status !== 'cancelled'
    ).length;
  }, [serviceRequests]);

  const archivedCount = useMemo(() => {
    return requests.filter((request) => request.is_archived === true).length;
  }, [requests]);

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
          }
        : {
            status,
            provider_seen: true,
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
              declined_reason:
                status === 'declined'
                  ? 'Declined by worker'
                  : request.declined_reason,
            }
          : request
      )
    );
  }

  async function markRequestAsRead(requestId: string) {
    setUpdatingId(requestId);
    setPageStatus(null);

    const { error } = await supabase
      .from('worker_requests')
      .update({
        worker_seen: true,
        status: 'seen',
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
              status: 'seen',
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
        status: 'seen',
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
        status: request.status === 'new' ? 'seen' : request.status,
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
        status: 'archived',
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
              status: 'archived',
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
        status: 'seen',
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
              status: 'seen',
            }
          : request
      )
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#2c3e2f]">Requests</h1>

        <p className="mt-2 text-gray-500">
          Service requests, customer inquiries, Sendio requests, and external
          contact activity.
        </p>
      </div>

      <div className="rounded-2xl border border-[#e2cfbc] bg-white p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#2c3e2f]">
              {worker ? `${worker.name} Inbox` : 'Inbox'}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              New service requests appear first. Contact requests remain
              archived below.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#e2cfbc] bg-[#fefcf5] px-3 py-1 text-sm font-semibold text-[#2c3e2f]">
              {serviceUnreadCount} Service Requests
            </span>

            <span className="rounded-full border border-[#e2cfbc] bg-[#fefcf5] px-3 py-1 text-sm font-semibold text-[#2c3e2f]">
              {unreadCount} Requests
            </span>

            <button
              type="button"
              onClick={() => setShowArchived((value) => !value)}
              className="rounded-full border border-[#e2cfbc] bg-[#fefcf5] px-3 py-1 text-sm font-semibold text-[#2c3e2f] hover:bg-[#f1e6d8]"
            >
              {showArchived ? 'Show Inbox' : `Archived (${archivedCount})`}
            </button>

            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0 && serviceUnreadCount === 0}
              className="rounded-full bg-[#0b5b2f] px-3 py-1 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark all read
            </button>
          </div>
        </div>

        {pageStatus ? (
          <div className="mb-4 rounded-xl border border-[#e2cfbc] bg-[#fefcf5] px-4 py-3 text-sm font-semibold text-[#4f3b25]">
            {pageStatus}
          </div>
        ) : null}

        {loading ? <p className="text-gray-400">Loading requests...</p> : null}

        {!loading ? (
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-[#2c3e2f]">
                Service Requests
              </h3>

              <span className="rounded-full bg-[#f7fff9] px-3 py-1 text-xs font-bold text-[#0b5b2f]">
                {serviceRequests.length} total
              </span>
            </div>

            {serviceRequests.length === 0 ? (
              <p className="rounded-2xl border border-[#eadcc9] bg-[#fbf8f3] p-4 text-sm font-semibold text-gray-400">
                No service requests yet.
              </p>
            ) : (
              <div className="space-y-3">
                {serviceRequests.map((match) => {
                  const request = match.service_requests;
                  const unread = match.provider_seen === false;
                  const locationUrl = getLocationUrl(request);
                  const phoneNumber = cleanPhone(request?.phone);
                  const status = match.status || 'pending';

                  return (
                    <article
                      key={match.id}
                      className={`rounded-2xl border p-4 ${
                        unread
                          ? 'border-[#0b5b2f] bg-[#f7fff9]'
                          : 'border-[#eadcc9] bg-[#fbf8f3]'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-black text-[#2c3e2f]">
                              {request?.service_name || 'Service request'}
                            </h4>

                            {unread ? (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                                New
                              </span>
                            ) : null}

                            <span className="rounded-full border border-[#eadcc9] bg-white px-2 py-0.5 text-xs font-bold text-[#8b5a2b]">
                              {status}
                            </span>
                          </div>

                          <p className="mt-1 text-sm font-semibold text-gray-600">
                            {getClientName(request)}
                          </p>

                          <p className="mt-1 text-xs font-bold text-[#8b5a2b]">
                            {formatDate(match.created_at)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {status !== 'accepted' ? (
                            <button
                              type="button"
                              onClick={() =>
                                updateServiceRequestStatus(match.id, 'accepted')
                              }
                              disabled={updatingId === match.id}
                              className="rounded-full bg-[#0b5b2f] px-2.5 py-1.5 text-[11px] font-black text-white disabled:opacity-60"
                            >
                              Accept
                            </button>
                          ) : null}

                          {status !== 'declined' ? (
                            <button
                              type="button"
                              onClick={() =>
                                updateServiceRequestStatus(match.id, 'declined')
                              }
                              disabled={updatingId === match.id}
                              className="rounded-full bg-[#fff0f1] px-2.5 py-1.5 text-[11px] font-black text-[#c62828] disabled:opacity-60"
                            >
                              Decline
                            </button>
                          ) : null}

                          {status === 'pending' ? (
                            <button
                              type="button"
                              onClick={() =>
                                updateServiceRequestStatus(match.id, 'viewed')
                              }
                              disabled={updatingId === match.id}
                              className="rounded-full border border-[#e2cfbc] bg-white px-2.5 py-1.5 text-[11px] font-black text-[#2c3e2f] disabled:opacity-60"
                            >
                              Viewed
                            </button>
                          ) : null}

                          {locationUrl ? (
                            <a
                              href={locationUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-[#e2cfbc] bg-white px-2.5 py-1.5 text-[11px] font-black text-[#0b5b2f]"
                            >
                              Location
                            </a>
                          ) : null}

                          {phoneNumber ? (
                            <a
                              href={`tel:${phoneNumber}`}
                              className="rounded-full border border-[#e2cfbc] bg-white px-2.5 py-1.5 text-[11px] font-black text-[#0b5b2f]"
                            >
                              Call
                            </a>
                          ) : null}

                          {request?.email ? (
                            <a
                              href={`mailto:${request.email}`}
                              className="rounded-full border border-[#e2cfbc] bg-white px-2.5 py-1.5 text-[11px] font-black text-[#0b5b2f]"
                            >
                              Email
                            </a>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 rounded-xl border border-[#eadcc9] bg-white p-4 text-sm text-[#4f3b25] md:grid-cols-2">
                        <div>
                          <p className="text-xs font-black uppercase text-gray-400">
                            Address
                          </p>
                          <p className="mt-1 font-semibold">
                            {getRequestAddress(request) ||
                              'No address provided'}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-black uppercase text-gray-400">
                            Preferred time
                          </p>
                          <p className="mt-1 font-semibold">
                            {formatServiceDate(
                              request?.preferred_date ?? null,
                              request?.preferred_time ?? null,
                              request?.preferred_time_window ?? null
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-black uppercase text-gray-400">
                            Phone
                          </p>
                          <p className="mt-1 font-semibold">
                            {request?.phone || 'No phone'}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-black uppercase text-gray-400">
                            Email
                          </p>
                          <p className="mt-1 font-semibold">
                            {request?.email || 'No email'}
                          </p>
                        </div>

                        <div className="md:col-span-2">
                          <p className="text-xs font-black uppercase text-gray-400">
                            Project description
                          </p>
                          <p className="mt-1 whitespace-pre-line font-semibold leading-6">
                            {request?.project_description ||
                              'No project description.'}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

        {!loading ? (
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-[#2c3e2f]">
                Contact Requests
              </h3>
            </div>

            {visibleRequests.length === 0 ? (
              <p className="text-gray-400">
                {showArchived ? 'No archived requests yet.' : 'No requests yet.'}
              </p>
            ) : (
              <div className="space-y-4">
                {visibleRequests.map((request) => {
                  const sourceLabel = getSourceLabel(
                    request.source_channel,
                    request.event_type
                  );
                  const sourceIcon = getSourceIcon(
                    request.source_channel,
                    request.event_type
                  );
                  const unread = request.worker_seen === false;
                  const sourceUrlAvailable = canOpenSourceUrl(
                    request.source_url
                  );
                  const phoneReplyUrl = getPhoneReplyUrl(request.phone);

                  return (
                    <article
                      key={request.id}
                      className={`rounded-2xl border p-4 ${
                        unread
                          ? 'border-[#0b5b2f] bg-[#f7fff9]'
                          : 'border-[#eadcc9] bg-[#fbf8f3]'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#f1e6d8] text-sm font-black text-[#0b5b2f]">
                            <span>{sourceIcon}</span>

                            {unread ? (
                              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" />
                            ) : null}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-[#2c3e2f]">
                                {request.name || 'Client'}
                              </h3>

                              {unread ? (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                                  New
                                </span>
                              ) : null}

                              <span className="rounded-full border border-[#eadcc9] bg-white px-2 py-0.5 text-xs font-bold text-[#8b5a2b]">
                                {sourceLabel}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-gray-500">
                              {request.email}
                            </p>

                            {request.phone ? (
                              <p className="mt-1 text-sm text-gray-500">
                                {request.phone}
                              </p>
                            ) : null}

                            <p className="mt-1 text-xs font-semibold text-[#8b5a2b]">
                              {getEventLabel(request.event_type)} •{' '}
                              {formatDate(request.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {sourceUrlAvailable ? (
                            <a
                              href={request.source_url ?? '#'}
                              target={
                                request.source_url?.startsWith('http')
                                  ? '_blank'
                                  : undefined
                              }
                              rel={
                                request.source_url?.startsWith('http')
                                  ? 'noreferrer'
                                  : undefined
                              }
                              className="rounded-full border border-[#e2cfbc] bg-white px-3 py-2 text-xs font-bold text-[#0b5b2f] hover:bg-[#f1e6d8]"
                            >
                              Open Source
                            </a>
                          ) : null}

                          {canReplyByEmail(request.email) ? (
                            <a
                              href={getReplyMailUrl(
                                request,
                                worker?.name ?? null
                              )}
                              className="rounded-full border border-[#e2cfbc] bg-[#f1e6d8] px-3 py-2 text-xs font-bold text-[#0b5b2f] hover:bg-[#eadcc9]"
                            >
                              Reply by Email
                            </a>
                          ) : null}

                          {phoneReplyUrl ? (
                            <a
                              href={phoneReplyUrl}
                              className="rounded-full border border-[#e2cfbc] bg-[#f1e6d8] px-3 py-2 text-xs font-bold text-[#0b5b2f] hover:bg-[#eadcc9]"
                            >
                              Call Client
                            </a>
                          ) : null}

                          {unread ? (
                            <button
                              type="button"
                              onClick={() => markRequestAsRead(request.id)}
                              disabled={updatingId === request.id}
                              className="rounded-full bg-[#0b5b2f] px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                            >
                              Mark read
                            </button>
                          ) : null}

                          {request.is_archived ? (
                            <button
                              type="button"
                              onClick={() => restoreRequest(request.id)}
                              disabled={updatingId === request.id}
                              className="rounded-full bg-[#f1e6d8] px-3 py-2 text-xs font-bold text-[#2c3e2f] disabled:opacity-60"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => archiveRequest(request.id)}
                              disabled={updatingId === request.id}
                              className="rounded-full bg-[#fff0f1] px-3 py-2 text-xs font-bold text-[#c62828] disabled:opacity-60"
                            >
                              Archive
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border border-[#eadcc9] bg-white p-4">
                        <p className="whitespace-pre-line text-sm leading-6 text-[#4f3b25]">
                          {request.message || 'No request text.'}
                        </p>
                      </div>

                      {request.moderation_status &&
                      request.moderation_status !== 'normal' ? (
                        <div className="mt-3 rounded-xl border border-[#e2cfbc] bg-[#fefcf5] px-3 py-2 text-xs font-bold text-[#8b5a2b]">
                          Moderation: {request.moderation_status}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}