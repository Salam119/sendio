'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type CompanyMessage = {
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

type CompanyRow = {
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
  if (eventType === 'message' || source === 'sendio') return 'Sendio Message';
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
  if (eventType === 'message' || source === 'sendio') return '💬';
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
  if (eventType === 'message') return 'Internal message';
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

function getReplyMailUrl(message: CompanyMessage, companyName: string | null) {
  const email = message.email.trim();
  const subject = `Reply from ${companyName || 'Sendio'}`;
  const body = `Hello ${message.name || 'Client'},\n\n`;

  return `mailto:${email}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

export default function MessagesPage() {
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [messages, setMessages] = useState<CompanyMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageStatus, setPageStatus] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const visibleMessages = useMemo(() => {
    return messages.filter((message) =>
      showArchived ? message.is_archived === true : message.is_archived !== true
    );
  }, [messages, showArchived]);

  const unreadCount = useMemo(() => {
    return messages.filter(
      (message) =>
        message.company_seen === false && message.is_archived !== true
    ).length;
  }, [messages]);

  const archivedCount = useMemo(() => {
    return messages.filter((message) => message.is_archived === true).length;
  }, [messages]);

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    setLoading(true);
    setPageStatus(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setPageStatus('You must be signed in to view company messages.');
      setLoading(false);
      return;
    }

    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (companyError || !companyData) {
      setCompany(null);
      setMessages([]);
      setPageStatus('Company profile was not found for this account.');
      setLoading(false);
      return;
    }

    const selectedCompany = companyData as CompanyRow;

    setCompany(selectedCompany);

    const { data: messagesData, error: messagesError } = await supabase
      .from('company_messages')
      .select('*')
      .eq('company_id', selectedCompany.id)
      .order('created_at', { ascending: false });

    if (messagesError) {
      setMessages([]);
      setPageStatus(messagesError.message);
      setLoading(false);
      return;
    }

    setMessages((messagesData ?? []) as CompanyMessage[]);
    setLoading(false);
  }

  async function markMessageAsRead(messageId: string) {
    setUpdatingId(messageId);
    setPageStatus(null);

    const { error } = await supabase
      .from('company_messages')
      .update({
        company_seen: true,
        status: 'seen',
      })
      .eq('id', messageId);

    setUpdatingId(null);

    if (error) {
      setPageStatus(error.message);
      return;
    }

    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              company_seen: true,
              status: 'seen',
            }
          : message
      )
    );
  }

  async function markAllAsRead() {
    if (!company) return;

    setPageStatus(null);

    const { error } = await supabase
      .from('company_messages')
      .update({
        company_seen: true,
        status: 'seen',
      })
      .eq('company_id', company.id)
      .eq('company_seen', false);

    if (error) {
      setPageStatus(error.message);
      return;
    }

    setMessages((currentMessages) =>
      currentMessages.map((message) => ({
        ...message,
        company_seen: true,
        status: message.status === 'new' ? 'seen' : message.status,
      }))
    );
  }

  async function archiveMessage(messageId: string) {
    setUpdatingId(messageId);
    setPageStatus(null);

    const { error } = await supabase
      .from('company_messages')
      .update({
        is_archived: true,
        company_seen: true,
        status: 'archived',
      })
      .eq('id', messageId);

    setUpdatingId(null);

    if (error) {
      setPageStatus(error.message);
      return;
    }

    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              is_archived: true,
              company_seen: true,
              status: 'archived',
            }
          : message
      )
    );
  }

  async function restoreMessage(messageId: string) {
    setUpdatingId(messageId);
    setPageStatus(null);

    const { error } = await supabase
      .from('company_messages')
      .update({
        is_archived: false,
        status: 'seen',
      })
      .eq('id', messageId);

    setUpdatingId(null);

    if (error) {
      setPageStatus(error.message);
      return;
    }

    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              is_archived: false,
              status: 'seen',
            }
          : message
      )
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#2c3e2f]">Messages</h1>

        <p className="text-gray-500 mt-2">
          Customer inquiries, Sendio messages, and external contact activity.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#e2cfbc] p-6">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
          <div>
            <h2 className="text-xl font-semibold text-[#2c3e2f]">
              {company ? `${company.name} Inbox` : 'Inbox'}
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Internal Sendio messages and external contact clicks are archived
              here.
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

        {loading ? <p className="text-gray-400">Loading messages...</p> : null}

        {!loading && visibleMessages.length === 0 ? (
          <p className="text-gray-400">
            {showArchived ? 'No archived messages yet.' : 'No messages yet.'}
          </p>
        ) : null}

        {!loading && visibleMessages.length > 0 ? (
          <div className="space-y-4">
            {visibleMessages.map((message) => {
              const sourceLabel = getSourceLabel(
                message.source_channel,
                message.event_type
              );
              const sourceIcon = getSourceIcon(
                message.source_channel,
                message.event_type
              );
              const unread = message.company_seen === false;
              const sourceUrlAvailable = canOpenSourceUrl(message.source_url);

              return (
                <article
                  key={message.id}
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
                            {message.name || 'Client'}
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
                          {message.email}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-[#8b5a2b]">
                          {getEventLabel(message.event_type)} •{' '}
                          {formatDate(message.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {sourceUrlAvailable ? (
                        <a
                          href={message.source_url ?? '#'}
                          target={
                            message.source_url?.startsWith('http')
                              ? '_blank'
                              : undefined
                          }
                          rel={
                            message.source_url?.startsWith('http')
                              ? 'noreferrer'
                              : undefined
                          }
                          className="rounded-full bg-white px-3 py-2 text-xs font-bold text-[#0b5b2f] border border-[#e2cfbc] hover:bg-[#f1e6d8]"
                        >
                          Open Source
                        </a>
                      ) : null}

                      {canReplyByEmail(message.email) ? (
                        <a
                          href={getReplyMailUrl(message, company?.name ?? null)}
                          className="rounded-full bg-[#f1e6d8] px-3 py-2 text-xs font-bold text-[#0b5b2f] border border-[#e2cfbc] hover:bg-[#eadcc9]"
                        >
                          Reply by Email
                        </a>
                      ) : null}

                      {unread ? (
                        <button
                          type="button"
                          onClick={() => markMessageAsRead(message.id)}
                          disabled={updatingId === message.id}
                          className="rounded-full bg-[#0b5b2f] px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                        >
                          Mark read
                        </button>
                      ) : null}

                      {message.is_archived ? (
                        <button
                          type="button"
                          onClick={() => restoreMessage(message.id)}
                          disabled={updatingId === message.id}
                          className="rounded-full bg-[#f1e6d8] px-3 py-2 text-xs font-bold text-[#2c3e2f] disabled:opacity-60"
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => archiveMessage(message.id)}
                          disabled={updatingId === message.id}
                          className="rounded-full bg-[#fff0f1] px-3 py-2 text-xs font-bold text-[#c62828] disabled:opacity-60"
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-white border border-[#eadcc9] p-4">
                    <p className="whitespace-pre-line text-sm leading-6 text-[#4f3b25]">
                      {message.message || 'No message text.'}
                    </p>
                  </div>

                  {message.moderation_status &&
                  message.moderation_status !== 'normal' ? (
                    <div className="mt-3 rounded-xl border border-[#e2cfbc] bg-[#fefcf5] px-3 py-2 text-xs font-bold text-[#8b5a2b]">
                      Moderation: {message.moderation_status}
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
