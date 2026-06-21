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

  const cleanPhone = phone.trim().replace(/\s/g, '');

  if (!cleanPhone) return null;

  return `tel:${cleanPhone}`;
}

export default function WorkerRequestsPage() {
  const [worker, setWorker] = useState<WorkerRow | null>(null);
  const [requests, setRequests] = useState<WorkerRequest[]>([]);
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

  const archivedCount = useMemo(() => {
    return requests.filter((request) => request.is_archived === true).length;
  }, [requests]);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    setPageStatus(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

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

    if (workerError || !workerData) {
      setWorker(null);
      setRequests([]);
      setPageStatus('Worker profile was not found for this account.');
      setLoading(false);
      return;
    }

    const selectedWorker = workerData as WorkerRow;

    setWorker(selectedWorker);

    const { data: requestsData, error: requestsError } = await supabase
      .from('worker_requests')
      .select('*')
      .eq('worker_id', selectedWorker.id)
      .order('created_at', { ascending: false });

    if (requestsError) {
      setRequests([]);
      setPageStatus(requestsError.message);
      setLoading(false);
      return;
    }

    setRequests((requestsData ?? []) as WorkerRequest[]);
    setLoading(false);
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

    const { error } = await supabase
      .from('worker_requests')
      .update({
        worker_seen: true,
        status: 'seen',
      })
      .eq('worker_id', worker.id)
      .eq('worker_seen', false);

    if (error) {
      setPageStatus(error.message);
      return;
    }

    setRequests((currentRequests) =>
      currentRequests.map((request) => ({
        ...request,
        worker_seen: true,
        status: request.status === 'new' ? 'seen' : request.status,
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

        <p className="text-gray-500 mt-2">
          Customer service requests and external contact activity.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#e2cfbc] p-6">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
          <div>
            <h2 className="text-xl font-semibold text-[#2c3e2f]">
              {worker ? `${worker.name} Inbox` : 'Inbox'}
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Internal Sendio service requests and external contact clicks are
              archived here.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#fefcf5] text-sm font-semibold text-[#2c3e2f] border border-[#e2cfbc]">
              {unreadCount} Unread
            </span>

            <button
              type="button"
              onClick={() => setShowArchived((value) => !value)}
              className="px-3 py-1 rounded-full bg-[#fefcf5] text-sm font-semibold text-[#2c3e2f] border border-[#e2cfbc] hover:bg-[#f1e6d8]"
            >
              {showArchived ? 'Show Inbox' : `Archived (${archivedCount})`}
            </button>

            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="px-3 py-1 rounded-full bg-[#0b5b2f] text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
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

        {!loading && visibleRequests.length === 0 ? (
          <p className="text-gray-400">
            {showArchived ? 'No archived requests yet.' : 'No requests yet.'}
          </p>
        ) : null}

        {!loading && visibleRequests.length > 0 ? (
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
              const sourceUrlAvailable = canOpenSourceUrl(request.source_url);
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

                          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-[#8b5a2b] border border-[#eadcc9]">
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
                          className="rounded-full bg-white px-3 py-2 text-xs font-bold text-[#0b5b2f] border border-[#e2cfbc] hover:bg-[#f1e6d8]"
                        >
                          Open Source
                        </a>
                      ) : null}

                      {canReplyByEmail(request.email) ? (
                        <a
                          href={getReplyMailUrl(request, worker?.name ?? null)}
                          className="rounded-full bg-[#f1e6d8] px-3 py-2 text-xs font-bold text-[#0b5b2f] border border-[#e2cfbc] hover:bg-[#eadcc9]"
                        >
                          Reply by Email
                        </a>
                      ) : null}

                      {phoneReplyUrl ? (
                        <a
                          href={phoneReplyUrl}
                          className="rounded-full bg-[#f1e6d8] px-3 py-2 text-xs font-bold text-[#0b5b2f] border border-[#e2cfbc] hover:bg-[#eadcc9]"
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

                  <div className="mt-4 rounded-xl bg-white border border-[#eadcc9] p-4">
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
        ) : null}
      </div>
    </div>
  );
}