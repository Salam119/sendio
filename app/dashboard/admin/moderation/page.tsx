'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type AdminRole = 'admin' | 'super_admin';

type ArchiveKind = 'company' | 'worker';
type ViewMode = 'all' | 'unread' | 'companies' | 'workers' | 'archived';

type CompanyMessageRow = {
  id: string;
  company_id: string | null;
  client_id: string | null;
  name: string;
  email: string;
  message: string;
  created_at: string | null;
  status: string | null;
  company_seen: boolean | null;
  admin_seen: boolean | null;
  is_archived: boolean | null;
  moderation_status: string | null;
  admin_note: string | null;
  source_channel: string | null;
  source_url: string | null;
  event_type: string | null;
};

type WorkerRequestRow = {
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

type OwnerRow = {
  id: string;
  name: string;
  slug: string | null;
};

type AdminArchiveItem = {
  kind: ArchiveKind;
  id: string;
  owner_id: string | null;
  owner_name: string;
  owner_href: string | null;
  client_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  created_at: string | null;
  status: string | null;
  owner_seen: boolean | null;
  admin_seen: boolean | null;
  is_archived: boolean | null;
  moderation_status: string | null;
  admin_note: string | null;
  source_channel: string | null;
  source_url: string | null;
  event_type: string | null;
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

function getTimeValue(value: string | null) {
  if (!value) return 0;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 0;

  return date.getTime();
}

function getSourceLabel(source: string | null, eventType: string | null) {
  if (eventType === 'message' || source === 'sendio') return 'Sendio';
  if (eventType === 'request') return 'Sendio Request';
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

function getEventLabel(eventType: string | null, kind: ArchiveKind) {
  if (eventType === 'message') return 'Company message';
  if (eventType === 'request') return 'Worker request';
  if (eventType === 'contact_click') return 'External contact click';

  return kind === 'company' ? 'Company activity' : 'Worker activity';
}

function getKindLabel(kind: ArchiveKind) {
  return kind === 'company' ? 'Company' : 'Worker';
}

function getKindIcon(kind: ArchiveKind) {
  return kind === 'company' ? '🏢' : '🛠️';
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

function getReplyMailUrl(item: AdminArchiveItem) {
  const email = item.email.trim();
  const subject = 'Reply from Sendio admin';
  const body = `Hello ${item.name || 'Client'},\n\n`;

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

function getCompanyHref(owner: OwnerRow | undefined, fallbackId: string | null) {
  const identifier = owner?.slug?.trim() || owner?.id || fallbackId;

  if (!identifier) return null;

  return `/companies/${encodeURIComponent(identifier)}`;
}

function getWorkerHref(owner: OwnerRow | undefined, fallbackId: string | null) {
  const identifier = owner?.slug?.trim() || owner?.id || fallbackId;

  if (!identifier) return null;

  return `/workers/${encodeURIComponent(identifier)}`;
}

function buildOwnerMap(rows: OwnerRow[]) {
  return rows.reduce<Record<string, OwnerRow>>((map, row) => {
    map[row.id] = row;
    return map;
  }, {});
}

function getItemKey(item: AdminArchiveItem) {
  return `${item.kind}:${item.id}`;
}

function getTableName(kind: ArchiveKind) {
  return kind === 'company' ? 'company_messages' : 'worker_requests';
}

export default function AdminModerationPage() {
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [items, setItems] = useState<AdminArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageStatus, setPageStatus] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [moderationStatusDrafts, setModerationStatusDrafts] = useState<
    Record<string, string>
  >({});
  const [adminNoteDrafts, setAdminNoteDrafts] = useState<Record<string, string>>(
    {}
  );

  const unreadCount = useMemo(() => {
    return items.filter(
      (item) => item.admin_seen === false && item.is_archived !== true
    ).length;
  }, [items]);

  const archivedCount = useMemo(() => {
    return items.filter((item) => item.is_archived === true).length;
  }, [items]);

  const companyCount = useMemo(() => {
    return items.filter((item) => item.kind === 'company').length;
  }, [items]);

  const workerCount = useMemo(() => {
    return items.filter((item) => item.kind === 'worker').length;
  }, [items]);

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (viewMode === 'unread') {
        return item.admin_seen === false && item.is_archived !== true;
      }

      if (viewMode === 'companies') {
        return item.kind === 'company' && item.is_archived !== true;
      }

      if (viewMode === 'workers') {
        return item.kind === 'worker' && item.is_archived !== true;
      }

      if (viewMode === 'archived') {
        return item.is_archived === true;
      }

      return item.is_archived !== true;
    });
  }, [items, viewMode]);

  useEffect(() => {
    let isMounted = true;

    async function loadArchive() {
      setLoading(true);
      setPageStatus(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (userError || !user) {
        setAdminRole(null);
        setItems([]);
        setPageStatus('You must be signed in as an admin.');
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (profileError) {
        setAdminRole(null);
        setItems([]);
        setPageStatus(profileError.message);
        setLoading(false);
        return;
      }

      const role = profileData?.role;

      if (role !== 'admin' && role !== 'super_admin') {
        setAdminRole(null);
        setItems([]);
        setPageStatus('Access denied. Admin role is required.');
        setLoading(false);
        return;
      }

      setAdminRole(role);

      const [companyMessagesResult, workerRequestsResult] = await Promise.all([
        supabase
          .from('company_messages')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('worker_requests')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      if (!isMounted) return;

      if (companyMessagesResult.error) {
        setItems([]);
        setPageStatus(companyMessagesResult.error.message);
        setLoading(false);
        return;
      }

      if (workerRequestsResult.error) {
        setItems([]);
        setPageStatus(workerRequestsResult.error.message);
        setLoading(false);
        return;
      }

      const companyMessages =
        (companyMessagesResult.data ?? []) as CompanyMessageRow[];
      const workerRequests =
        (workerRequestsResult.data ?? []) as WorkerRequestRow[];

      const companyIds = Array.from(
        new Set(
          companyMessages
            .map((message) => message.company_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      const workerIds = Array.from(
        new Set(
          workerRequests
            .map((request) => request.worker_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      const [companiesResult, workersResult] = await Promise.all([
        companyIds.length > 0
          ? supabase
              .from('companies')
              .select('id, name, slug')
              .in('id', companyIds)
          : Promise.resolve({ data: [], error: null }),

        workerIds.length > 0
          ? supabase
              .from('workers')
              .select('id, name, slug')
              .in('id', workerIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (!isMounted) return;

      if (companiesResult.error) {
        setPageStatus(companiesResult.error.message);
        setLoading(false);
        return;
      }

      if (workersResult.error) {
        setPageStatus(workersResult.error.message);
        setLoading(false);
        return;
      }

      const companiesMap = buildOwnerMap(
        (companiesResult.data ?? []) as OwnerRow[]
      );
      const workersMap = buildOwnerMap((workersResult.data ?? []) as OwnerRow[]);

      const normalizedCompanyItems: AdminArchiveItem[] = companyMessages.map(
        (message) => {
          const owner = message.company_id
            ? companiesMap[message.company_id]
            : undefined;

          return {
            kind: 'company',
            id: message.id,
            owner_id: message.company_id,
            owner_name: owner?.name || 'Unknown company',
            owner_href: getCompanyHref(owner, message.company_id),
            client_id: message.client_id,
            name: message.name,
            email: message.email,
            phone: null,
            message: message.message,
            created_at: message.created_at,
            status: message.status,
            owner_seen: message.company_seen,
            admin_seen: message.admin_seen,
            is_archived: message.is_archived,
            moderation_status: message.moderation_status,
            admin_note: message.admin_note,
            source_channel: message.source_channel,
            source_url: message.source_url,
            event_type: message.event_type,
          };
        }
      );

      const normalizedWorkerItems: AdminArchiveItem[] = workerRequests.map(
        (request) => {
          const owner = request.worker_id
            ? workersMap[request.worker_id]
            : undefined;

          return {
            kind: 'worker',
            id: request.id,
            owner_id: request.worker_id,
            owner_name: owner?.name || 'Unknown worker',
            owner_href: getWorkerHref(owner, request.worker_id),
            client_id: request.client_id,
            name: request.name,
            email: request.email,
            phone: request.phone,
            message: request.message,
            created_at: request.created_at,
            status: request.status,
            owner_seen: request.worker_seen,
            admin_seen: request.admin_seen,
            is_archived: request.is_archived,
            moderation_status: request.moderation_status,
            admin_note: request.admin_note,
            source_channel: request.source_channel,
            source_url: request.source_url,
            event_type: request.event_type,
          };
        }
      );

      const combinedItems = [
        ...normalizedCompanyItems,
        ...normalizedWorkerItems,
      ].sort((a, b) => getTimeValue(b.created_at) - getTimeValue(a.created_at));

      const nextModerationDrafts: Record<string, string> = {};
      const nextNoteDrafts: Record<string, string> = {};

      combinedItems.forEach((item) => {
        const key = getItemKey(item);
        nextModerationDrafts[key] = item.moderation_status || 'normal';
        nextNoteDrafts[key] = item.admin_note || '';
      });

      setItems(combinedItems);
      setModerationStatusDrafts(nextModerationDrafts);
      setAdminNoteDrafts(nextNoteDrafts);
      setLoading(false);
    }

    void loadArchive();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  async function updateItem(
    item: AdminArchiveItem,
    payload: Record<string, string | boolean | null>
  ) {
    const key = getItemKey(item);
    setUpdatingKey(key);
    setPageStatus(null);

    const { error } = await supabase
      .from(getTableName(item.kind))
      .update(payload)
      .eq('id', item.id);

    setUpdatingKey(null);

    if (error) {
      setPageStatus(error.message);
      return false;
    }

    setItems((currentItems) =>
      currentItems.map((currentItem) =>
        getItemKey(currentItem) === key
          ? {
              ...currentItem,
              ...payload,
            }
          : currentItem
      )
    );

    return true;
  }

  async function markAdminRead(item: AdminArchiveItem) {
    await updateItem(item, { admin_seen: true });
  }

  async function markAllAdminRead() {
    setPageStatus(null);

    const [companyResult, workerResult] = await Promise.all([
      supabase
        .from('company_messages')
        .update({ admin_seen: true })
        .eq('admin_seen', false),

      supabase
        .from('worker_requests')
        .update({ admin_seen: true })
        .eq('admin_seen', false),
    ]);

    if (companyResult.error) {
      setPageStatus(companyResult.error.message);
      return;
    }

    if (workerResult.error) {
      setPageStatus(workerResult.error.message);
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) => ({
        ...item,
        admin_seen: true,
      }))
    );
  }

  async function archiveItem(item: AdminArchiveItem) {
    await updateItem(item, {
      is_archived: true,
      admin_seen: true,
      status: 'archived',
    });
  }

  async function restoreItem(item: AdminArchiveItem) {
    await updateItem(item, {
      is_archived: false,
      status: 'seen',
    });
  }

  async function saveModeration(item: AdminArchiveItem) {
    const key = getItemKey(item);
    const moderationStatus = moderationStatusDrafts[key] || 'normal';
    const adminNote = adminNoteDrafts[key]?.trim() || null;

    await updateItem(item, {
      moderation_status: moderationStatus,
      admin_note: adminNote,
      admin_seen: true,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#2c3e2f]">
            Archive Moderation
          </h1>

          <p className="text-gray-500 mt-2">
            Review company messages, worker requests, and external contact
            activity.
          </p>

          {adminRole ? (
            <p className="mt-2 text-xs font-bold uppercase text-[#0b5b2f]">
              Role: {adminRole}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/admin"
            className="rounded-full bg-[#f1e6d8] px-4 py-2 text-sm font-bold text-[#2c3e2f] border border-[#e2cfbc]"
          >
            Admin Dashboard
          </Link>

          <button
            type="button"
            onClick={() => setRefreshKey((value) => value + 1)}
            className="rounded-full bg-[#0b5b2f] px-4 py-2 text-sm font-bold text-white"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <button
          type="button"
          onClick={() => setViewMode('all')}
          className={`rounded-2xl border p-4 text-left ${
            viewMode === 'all'
              ? 'border-[#0b5b2f] bg-[#f7fff9]'
              : 'border-[#e2cfbc] bg-white'
          }`}
        >
          <p className="text-sm font-bold text-gray-500">Inbox</p>
          <p className="text-2xl font-black text-[#2c3e2f]">
            {items.filter((item) => item.is_archived !== true).length}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('unread')}
          className={`rounded-2xl border p-4 text-left ${
            viewMode === 'unread'
              ? 'border-[#0b5b2f] bg-[#f7fff9]'
              : 'border-[#e2cfbc] bg-white'
          }`}
        >
          <p className="text-sm font-bold text-gray-500">Unread</p>
          <p className="text-2xl font-black text-[#0b5b2f]">{unreadCount}</p>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('companies')}
          className={`rounded-2xl border p-4 text-left ${
            viewMode === 'companies'
              ? 'border-[#0b5b2f] bg-[#f7fff9]'
              : 'border-[#e2cfbc] bg-white'
          }`}
        >
          <p className="text-sm font-bold text-gray-500">Companies</p>
          <p className="text-2xl font-black text-[#2c3e2f]">{companyCount}</p>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('workers')}
          className={`rounded-2xl border p-4 text-left ${
            viewMode === 'workers'
              ? 'border-[#0b5b2f] bg-[#f7fff9]'
              : 'border-[#e2cfbc] bg-white'
          }`}
        >
          <p className="text-sm font-bold text-gray-500">Workers</p>
          <p className="text-2xl font-black text-[#2c3e2f]">{workerCount}</p>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('archived')}
          className={`rounded-2xl border p-4 text-left ${
            viewMode === 'archived'
              ? 'border-[#0b5b2f] bg-[#f7fff9]'
              : 'border-[#e2cfbc] bg-white'
          }`}
        >
          <p className="text-sm font-bold text-gray-500">Archived</p>
          <p className="text-2xl font-black text-[#8b5a2b]">{archivedCount}</p>
        </button>
      </div>

      <div className="rounded-2xl border border-[#e2cfbc] bg-white p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#2c3e2f]">
              Moderation Inbox
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Admin can read, archive, restore, flag, and add internal notes.
            </p>
          </div>

          <button
            type="button"
            onClick={markAllAdminRead}
            disabled={unreadCount === 0}
            className="rounded-full bg-[#0b5b2f] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark all admin read
          </button>
        </div>

        {pageStatus ? (
          <div className="mb-4 rounded-xl border border-[#e2cfbc] bg-[#fefcf5] px-4 py-3 text-sm font-semibold text-[#4f3b25]">
            {pageStatus}
          </div>
        ) : null}

        {loading ? (
          <p className="text-gray-400">Loading moderation archive...</p>
        ) : null}

        {!loading && visibleItems.length === 0 ? (
          <p className="text-gray-400">No archive items found.</p>
        ) : null}

        {!loading && visibleItems.length > 0 ? (
          <div className="space-y-4">
            {visibleItems.map((item) => {
              const key = getItemKey(item);
              const unread = item.admin_seen === false;
              const sourceUrlAvailable = canOpenSourceUrl(item.source_url);
              const phoneReplyUrl = getPhoneReplyUrl(item.phone);
              const itemUpdating = updatingKey === key;

              return (
                <article
                  key={key}
                  className={`rounded-2xl border p-4 ${
                    unread
                      ? 'border-[#0b5b2f] bg-[#f7fff9]'
                      : 'border-[#eadcc9] bg-[#fbf8f3]'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#f1e6d8] text-sm font-black text-[#0b5b2f]">
                        <span>{getKindIcon(item.kind)}</span>

                        {unread ? (
                          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" />
                        ) : null}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-[#2c3e2f]">
                            {item.name || 'Client'}
                          </h3>

                          {unread ? (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                              New for admin
                            </span>
                          ) : null}

                          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-[#8b5a2b] border border-[#eadcc9]">
                            {getKindLabel(item.kind)}
                          </span>

                          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-[#0b5b2f] border border-[#eadcc9]">
                            {getSourceLabel(
                              item.source_channel,
                              item.event_type
                            )}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-gray-500">
                          Client: {item.email}
                          {item.phone ? ` • ${item.phone}` : ''}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          Owner:{' '}
                          {item.owner_href ? (
                            <Link
                              href={item.owner_href}
                              target="_blank"
                              className="font-bold text-[#0b5b2f]"
                            >
                              {item.owner_name}
                            </Link>
                          ) : (
                            <span>{item.owner_name}</span>
                          )}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-[#8b5a2b]">
                          {getEventLabel(item.event_type, item.kind)} •{' '}
                          {formatDate(item.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {sourceUrlAvailable ? (
                        <a
                          href={item.source_url ?? '#'}
                          target={
                            item.source_url?.startsWith('http')
                              ? '_blank'
                              : undefined
                          }
                          rel={
                            item.source_url?.startsWith('http')
                              ? 'noreferrer'
                              : undefined
                          }
                          className="rounded-full bg-white px-3 py-2 text-xs font-bold text-[#0b5b2f] border border-[#e2cfbc] hover:bg-[#f1e6d8]"
                        >
                          Open Source
                        </a>
                      ) : null}

                      {canReplyByEmail(item.email) ? (
                        <a
                          href={getReplyMailUrl(item)}
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
                          onClick={() => markAdminRead(item)}
                          disabled={itemUpdating}
                          className="rounded-full bg-[#0b5b2f] px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                        >
                          Mark admin read
                        </button>
                      ) : null}

                      {item.is_archived ? (
                        <button
                          type="button"
                          onClick={() => restoreItem(item)}
                          disabled={itemUpdating}
                          className="rounded-full bg-[#f1e6d8] px-3 py-2 text-xs font-bold text-[#2c3e2f] disabled:opacity-60"
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => archiveItem(item)}
                          disabled={itemUpdating}
                          className="rounded-full bg-[#fff0f1] px-3 py-2 text-xs font-bold text-[#c62828] disabled:opacity-60"
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-white border border-[#eadcc9] p-4">
                    <p className="whitespace-pre-line text-sm leading-6 text-[#4f3b25]">
                      {item.message || 'No text.'}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_auto] md:items-end">
                    <label className="block">
                      <span className="mb-1 block text-xs font-black uppercase text-[#8b5a2b]">
                        Moderation
                      </span>

                      <select
                        value={moderationStatusDrafts[key] ?? 'normal'}
                        onChange={(event) =>
                          setModerationStatusDrafts((current) => ({
                            ...current,
                            [key]: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-[#e2cfbc] bg-[#fefcf5] px-3 py-2 text-sm font-bold text-[#2c3e2f]"
                      >
                        <option value="normal">normal</option>
                        <option value="review">review</option>
                        <option value="flagged">flagged</option>
                        <option value="blocked">blocked</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs font-black uppercase text-[#8b5a2b]">
                        Admin note
                      </span>

                      <input
                        value={adminNoteDrafts[key] ?? ''}
                        onChange={(event) =>
                          setAdminNoteDrafts((current) => ({
                            ...current,
                            [key]: event.target.value,
                          }))
                        }
                        placeholder="Internal admin note"
                        className="w-full rounded-xl border border-[#e2cfbc] bg-white px-3 py-2 text-sm font-semibold text-[#2c3e2f]"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => saveModeration(item)}
                      disabled={itemUpdating}
                      className="rounded-full bg-[#0b5b2f] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                    >
                      Save
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}