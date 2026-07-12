'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type InboxSource = 'company_messages' | 'service_requests';

type CompanyMessage = {
  id: string;
  company_id: string | null;
  client_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  created_at: string | null;
  status: string | null;
  request_status: string | null;
  company_seen: boolean | null;
  admin_seen: boolean | null;
  is_archived: boolean | null;
  moderation_status: string | null;
  admin_note: string | null;
  source_channel: string | null;
  source_url: string | null;
  event_type: string | null;
  inbox_source?: InboxSource;
  service_request_id?: string | null;
  service_match_id?: string | null;
  service_category_id?: string | null;
  service_name?: string | null;
  service_slug?: string | null;
  service_icon?: string | null;
  city?: string | null;
  postal_code?: string | null;
  street?: string | null;
  house_number?: string | null;
  preferred_date?: string | null;
  preferred_time?: string | null;
  preferred_time_window?: string | null;
  cancelled_reason?: string | null;
};

type ServiceRequestRow = {
  id: string;
  service_category_id: string | null;
  service_name: string | null;
  service_slug: string | null;
  client_id: string | null;
  selected_company_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  postal_code: string | null;
  street: string | null;
  house_number: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  preferred_time_window: string | null;
  project_description: string | null;
  status: string | null;
  provider_seen: boolean | null;
  submitted_at: string | null;
  created_at: string | null;
  cancelled_reason: string | null;
};

type ServiceRequestMatchRow = {
  id: string;
  request_id: string | null;
  company_id: string | null;
  status: string | null;
  created_at: string | null;
};

type ServiceCategoryRow = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
};

type CompanyRow = {
  id: string;
  name: string;
};

type InboxSectionKey =
  | 'serviceRequests'
  | 'sendioMessages'
  | 'email'
  | 'whatsapp'
  | 'phone'
  | 'social'
  | 'archived'
  | 'stats';

type InboxSection = {
  key: InboxSectionKey;
  eyebrow: string;
  title: string;
  description: string;
  icon: string;
  items: CompanyMessage[];
};

const SERVICE_ICON_MAP: Record<string, string> = {
  sparkles: '🧹',
  home: '🏠',
  brush: '🎨',
  building: '🏢',
  window: '🪟',
  layers: '🧽',
  wrench: '🔧',
  pipe: '🚰',
  drop: '💧',
  toilet: '🚽',
  faucet: '🚰',
  bulb: '💡',
  plug: '🔌',
  fan: '🌀',
  camera: '📷',
  paint: '🖌️',
  truck: '🚚',
  box: '📦',
  tree: '🌳',
  leaf: '🍃',
  scissors: '✂️',
  hammer: '🔨',
  key: '🔑',
  roof: '🏠',
  chimney: '🏚️',
  bug: '🐞',
  floor: '🧱',
  tile: '▦',
  kitchen: '🍽️',
  water: '💧',
  cabinet: '🗄️',
  store: '🏪',
  phone: '📱',
  computer: '💻',
  printer: '🖨️',
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

function cleanPhone(phone: string | null | undefined) {
  return phone?.replace(/[^\d+]/g, '') ?? '';
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

function getPhoneReplyUrl(phone: string | null | undefined) {
  const cleanValue = cleanPhone(phone);

  if (!cleanValue) return null;

  return `tel:${cleanValue}`;
}

function isCentralServiceRequest(message: CompanyMessage) {
  return message.inbox_source === 'service_requests';
}

function getServiceIcon(icon: string | null | undefined) {
  const normalizedIcon = icon?.trim().toLowerCase();

  if (!normalizedIcon) {
    return '🧰';
  }

  return SERVICE_ICON_MAP[normalizedIcon] ?? '🧰';
}

function getSourceLabel(message: CompanyMessage) {
  const source = message.source_channel;
  const eventType = message.event_type;

  if (isCentralServiceRequest(message)) {
    return 'Linked Service Request';
  }

  if (eventType === 'service_request' || source === 'sendio_service_request') {
    return 'Service Request';
  }

  if (eventType === 'message' || source === 'sendio') return 'Sendio Message';
  if (source === 'whatsapp') return 'WhatsApp';
  if (source === 'email') return 'Email';
  if (source === 'phone') return 'Phone';
  if (source === 'website') return 'Website';
  if (source === 'facebook') return 'Facebook';
  if (source === 'instagram') return 'Instagram';
  if (source === 'linkedin') return 'LinkedIn';
  if (source === 'x') return 'X';
  if (source === 'map' || source === 'maps') return 'Maps';

  return 'Contact';
}

function getSourceIcon(message: CompanyMessage) {
  const source = message.source_channel;
  const eventType = message.event_type;

  if (isCentralServiceRequest(message)) {
    return getServiceIcon(message.service_icon);
  }

  if (eventType === 'service_request' || source === 'sendio_service_request') {
    return '🧰';
  }

  if (eventType === 'message' || source === 'sendio') return '✉️';
  if (source === 'whatsapp') return '🟢';
  if (source === 'email') return '📧';
  if (source === 'phone') return '☎️';
  if (source === 'website') return '🌐';
  if (source === 'facebook') return 'f';
  if (source === 'instagram') return '◎';
  if (source === 'linkedin') return 'in';
  if (source === 'x') return '𝕏';
  if (source === 'map' || source === 'maps') return '📍';

  return '•';
}

function getRequestStatusLabel(value: string | null) {
  const normalizedValue = value?.trim().toLowerCase() ?? '';

  if (normalizedValue === 'accepted') return 'Accepted';
  if (normalizedValue === 'declined') return 'Declined';
  if (normalizedValue === 'cancelled') return 'Cancelled';
  if (normalizedValue === 'completed') return 'Completed';
  if (normalizedValue === 'viewed') return 'Viewed';
  if (normalizedValue === 'in_progress') return 'In progress';
  if (normalizedValue === 'submitted' || normalizedValue === 'pending') {
    return 'Pending';
  }

  return 'New';
}

function getRequestStatusClass(value: string | null) {
  const normalizedValue = value?.trim().toLowerCase() ?? '';

  if (
    normalizedValue === 'accepted' ||
    normalizedValue === 'completed' ||
    normalizedValue === 'in_progress'
  ) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalizedValue === 'declined' || normalizedValue === 'cancelled') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  if (normalizedValue === 'viewed') {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }

  return 'border-sky-200 bg-sky-50 text-sky-700';
}

function getServiceRequestAddress(message: CompanyMessage) {
  return [
    message.street,
    message.house_number,
    message.postal_code,
    message.city,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
}

function getPreferredServiceTime(message: CompanyMessage) {
  return [
    message.preferred_date,
    message.preferred_time || message.preferred_time_window,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' • ');
}

function canRespondToServiceRequest(message: CompanyMessage) {
  const status = message.request_status?.trim().toLowerCase() ?? '';

  return !['cancelled', 'completed'].includes(status);
}

function sortInboxItems(items: CompanyMessage[]) {
  return [...items].sort((first, second) => {
    const firstTime = first.created_at ? new Date(first.created_at).getTime() : 0;
    const secondTime = second.created_at ? new Date(second.created_at).getTime() : 0;

    return secondTime - firstTime;
  });
}

export default function MessagesPage() {
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [messages, setMessages] = useState<CompanyMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageStatus, setPageStatus] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<
    Partial<Record<InboxSectionKey, boolean>>
  >({});

  const activeMessages = useMemo(
    () => messages.filter((message) => message.is_archived !== true),
    [messages]
  );

  const archivedMessages = useMemo(
    () => messages.filter((message) => message.is_archived === true),
    [messages]
  );

  const serviceRequestMessages = useMemo(
    () =>
      activeMessages.filter(
        (message) =>
          message.event_type === 'service_request' ||
          message.source_channel === 'sendio_service_request'
      ),
    [activeMessages]
  );

  const sendioMessages = useMemo(
    () =>
      activeMessages.filter(
        (message) =>
          (message.event_type === 'message' ||
            message.source_channel === 'sendio') &&
          message.event_type !== 'service_request' &&
          message.source_channel !== 'sendio_service_request'
      ),
    [activeMessages]
  );

  const emailMessages = useMemo(
    () =>
      activeMessages.filter(
        (message) =>
          message.event_type === 'contact_click' &&
          message.source_channel === 'email'
      ),
    [activeMessages]
  );

  const whatsappMessages = useMemo(
    () =>
      activeMessages.filter(
        (message) =>
          message.event_type === 'contact_click' &&
          message.source_channel === 'whatsapp'
      ),
    [activeMessages]
  );

  const phoneMessages = useMemo(
    () =>
      activeMessages.filter(
        (message) =>
          message.event_type === 'contact_click' &&
          (message.source_channel === 'phone' ||
            message.source_channel === 'call')
      ),
    [activeMessages]
  );

  const socialMessages = useMemo(
    () =>
      activeMessages.filter((message) => {
        if (message.event_type !== 'contact_click') return false;

        return !['email', 'whatsapp', 'phone', 'call'].includes(
          message.source_channel ?? ''
        );
      }),
    [activeMessages]
  );

  const unreadCount = useMemo(
    () =>
      activeMessages.filter((message) => message.company_seen === false).length,
    [activeMessages]
  );

  const stats = useMemo(
    () => ({
      serviceRequests: serviceRequestMessages.length,
      sendioMessages: sendioMessages.length,
      email: emailMessages.length,
      whatsapp: whatsappMessages.length,
      phone: phoneMessages.length,
      social: socialMessages.length,
      archived: archivedMessages.length,
      unread: unreadCount,
      total: messages.length,
    }),
    [
      serviceRequestMessages.length,
      sendioMessages.length,
      emailMessages.length,
      whatsappMessages.length,
      phoneMessages.length,
      socialMessages.length,
      archivedMessages.length,
      unreadCount,
      messages.length,
    ]
  );

  const inboxSections: InboxSection[] = useMemo(
    () => [
      {
        key: 'serviceRequests',
        eyebrow: 'Client work requests',
        title: 'Service Requests',
        description: 'Accept, decline, contact, and track linked service requests.',
        icon: '🧰',
        items: serviceRequestMessages,
      },
      {
        key: 'sendioMessages',
        eyebrow: 'Written profile messages',
        title: 'Sendio Messages',
        description: 'General messages sent from the public company profile.',
        icon: '✉️',
        items: sendioMessages,
      },
      {
        key: 'email',
        eyebrow: 'Email contact clicks',
        title: 'Email',
        description: 'Clients who opened your email contact.',
        icon: '📧',
        items: emailMessages,
      },
      {
        key: 'whatsapp',
        eyebrow: 'WhatsApp contact clicks',
        title: 'WhatsApp',
        description: 'Clients who opened WhatsApp.',
        icon: '🟢',
        items: whatsappMessages,
      },
      {
        key: 'phone',
        eyebrow: 'Call contact clicks',
        title: 'Phone',
        description: 'Clients who opened phone contact.',
        icon: '☎️',
        items: phoneMessages,
      },
      {
        key: 'social',
        eyebrow: 'Website, maps, and socials',
        title: 'Social / External',
        description: 'Website, maps, Facebook, Instagram, LinkedIn, X.',
        icon: '🌐',
        items: socialMessages,
      },
      {
        key: 'archived',
        eyebrow: 'Hidden history',
        title: 'Archived',
        description: 'Restore or delete old archived activity.',
        icon: '🗄️',
        items: archivedMessages,
      },
    ],
    [
      serviceRequestMessages,
      sendioMessages,
      emailMessages,
      whatsappMessages,
      phoneMessages,
      socialMessages,
      archivedMessages,
    ]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadMessages() {
      setLoading(true);
      setPageStatus(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

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

      if (!isMounted) return;

      if (companyError || !companyData) {
        setCompany(null);
        setMessages([]);
        setPageStatus('Company profile was not found for this account.');
        setLoading(false);
        return;
      }

      const selectedCompany = companyData as CompanyRow;
      setCompany(selectedCompany);

      const serviceRequestSelect =
        'id, service_category_id, service_name, service_slug, client_id, selected_company_id, first_name, last_name, email, phone, city, postal_code, street, house_number, preferred_date, preferred_time, preferred_time_window, project_description, status, provider_seen, submitted_at, created_at, cancelled_reason';

      const [
        messagesResult,
        matchesResult,
        selectedRequestsResult,
      ] = await Promise.all([
        supabase
          .from('company_messages')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('service_request_matches')
          .select('id, request_id, company_id, status, created_at')
          .eq('provider_type', 'company')
          .eq('company_id', selectedCompany.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('service_requests')
          .select(serviceRequestSelect)
          .eq('selected_company_id', selectedCompany.id)
          .order('created_at', { ascending: false }),
      ]);

      if (!isMounted) return;

      const warningMessages = [
        messagesResult.error?.message,
        matchesResult.error?.message,
        selectedRequestsResult.error?.message,
      ].filter(Boolean) as string[];

      const legacyMessages = ((messagesResult.data ?? []) as CompanyMessage[]).map(
        (message) => ({
          ...message,
          inbox_source: 'company_messages' as const,
        })
      );

      const serviceMatches =
        (matchesResult.data ?? []) as ServiceRequestMatchRow[];

      const directServiceRequests =
        (selectedRequestsResult.data ?? []) as ServiceRequestRow[];

      const directRequestIds = new Set(
        directServiceRequests.map((request) => request.id)
      );

      const matchedRequestIds = serviceMatches
        .map((match) => match.request_id)
        .filter((requestId): requestId is string => Boolean(requestId));

      const missingMatchedRequestIds = Array.from(
        new Set(
          matchedRequestIds.filter((requestId) => !directRequestIds.has(requestId))
        )
      );

      let matchedServiceRequests: ServiceRequestRow[] = [];

      if (missingMatchedRequestIds.length > 0) {
        const { data, error } = await supabase
          .from('service_requests')
          .select(serviceRequestSelect)
          .in('id', missingMatchedRequestIds);

        if (!isMounted) return;

        if (error) {
          warningMessages.push(error.message);
        } else {
          matchedServiceRequests = (data ?? []) as ServiceRequestRow[];
        }
      }

      const serviceRequestMap = new Map<string, ServiceRequestRow>();

      [...directServiceRequests, ...matchedServiceRequests].forEach((request) => {
        serviceRequestMap.set(request.id, request);
      });

      const serviceRequests = Array.from(serviceRequestMap.values());
      const serviceCategoryIds = Array.from(
        new Set(
          serviceRequests
            .map((request) => request.service_category_id)
            .filter((categoryId): categoryId is string => Boolean(categoryId))
        )
      );

      let serviceCategories: ServiceCategoryRow[] = [];

      if (serviceCategoryIds.length > 0) {
        const { data, error } = await supabase
          .from('service_categories')
          .select('id, name, slug, icon')
          .in('id', serviceCategoryIds);

        if (!isMounted) return;

        if (error) {
          warningMessages.push(error.message);
        } else {
          serviceCategories = (data ?? []) as ServiceCategoryRow[];
        }
      }

      const matchByRequestId = new Map<string, ServiceRequestMatchRow>();

      serviceMatches.forEach((match) => {
        if (match.request_id && !matchByRequestId.has(match.request_id)) {
          matchByRequestId.set(match.request_id, match);
        }
      });

      const categoryById = new Map(
        serviceCategories.map((category) => [category.id, category])
      );

      const centralServiceRequests: CompanyMessage[] = serviceRequests.map(
        (request) => {
          const match = matchByRequestId.get(request.id) ?? null;
          const category = request.service_category_id
            ? categoryById.get(request.service_category_id) ?? null
            : null;
          const clientName =
            [request.first_name, request.last_name]
              .map((part) => part?.trim())
              .filter(Boolean)
              .join(' ') ||
            request.email?.split('@')[0] ||
            'Client';

          return {
            id: `service-request:${request.id}`,
            company_id: selectedCompany.id,
            client_id: request.client_id,
            name: clientName,
            email: request.email ?? '',
            phone: request.phone,
            message:
              request.project_description?.trim() ||
              'No request details were added.',
            created_at: request.submitted_at || request.created_at,
            status: request.status,
            request_status: match?.status || request.status || 'pending',
            company_seen: request.provider_seen,
            admin_seen: null,
            is_archived: false,
            moderation_status: null,
            admin_note: null,
            source_channel: 'sendio_service_request',
            source_url: null,
            event_type: 'service_request',
            inbox_source: 'service_requests',
            service_request_id: request.id,
            service_match_id: match?.id ?? null,
            service_category_id: request.service_category_id,
            service_name:
              category?.name || request.service_name || 'Service request',
            service_slug: category?.slug || request.service_slug,
            service_icon: category?.icon ?? null,
            city: request.city,
            postal_code: request.postal_code,
            street: request.street,
            house_number: request.house_number,
            preferred_date: request.preferred_date,
            preferred_time: request.preferred_time,
            preferred_time_window: request.preferred_time_window,
            cancelled_reason: request.cancelled_reason,
          };
        }
      );

      setMessages(sortInboxItems([...centralServiceRequests, ...legacyMessages]));

      if (warningMessages.length > 0) {
        setPageStatus(Array.from(new Set(warningMessages)).join(' • '));
      }

      setLoading(false);
    }

    void loadMessages();

    return () => {
      isMounted = false;
    };
  }, []);

  function toggleSection(sectionKey: InboxSectionKey) {
    setExpandedSections((current) => ({
      ...current,
      [sectionKey]: !current[sectionKey],
    }));
  }

  async function updateMessage(
    messageId: string,
    updates: Partial<CompanyMessage>
  ) {
    const selectedMessage =
      messages.find((message) => message.id === messageId) ?? null;

    if (!selectedMessage) {
      return false;
    }

    setUpdatingId(messageId);
    setPageStatus(null);

    if (isCentralServiceRequest(selectedMessage)) {
      if (!selectedMessage.service_request_id) {
        setUpdatingId(null);
        setPageStatus('The linked service request could not be identified.');
        return false;
      }

      const requestUpdates: { provider_seen?: boolean } = {};

      if (typeof updates.company_seen === 'boolean') {
        requestUpdates.provider_seen = updates.company_seen;
      }

      if (Object.keys(requestUpdates).length === 0) {
        setUpdatingId(null);
        return true;
      }

      const { error } = await supabase
        .from('service_requests')
        .update(requestUpdates)
        .eq('id', selectedMessage.service_request_id)
        .eq('selected_company_id', company?.id ?? '');

      setUpdatingId(null);

      if (error) {
        setPageStatus(error.message);
        return false;
      }
    } else {
      const { error } = await supabase
        .from('company_messages')
        .update(updates)
        .eq('id', messageId);

      setUpdatingId(null);

      if (error) {
        setPageStatus(error.message);
        return false;
      }
    }

    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId ? { ...message, ...updates } : message
      )
    );

    return true;
  }

  async function markMessageAsRead(messageId: string) {
    await updateMessage(messageId, {
      company_seen: true,
    });
  }

  async function archiveMessage(messageId: string) {
    await updateMessage(messageId, {
      is_archived: true,
      company_seen: true,
    });
  }

  async function restoreMessage(messageId: string) {
    await updateMessage(messageId, {
      is_archived: false,
      company_seen: true,
    });
  }

  async function updateRequestStatus(
    messageId: string,
    requestStatus: 'accepted' | 'declined'
  ) {
    const selectedMessage =
      messages.find((message) => message.id === messageId) ?? null;

    if (!selectedMessage) {
      return;
    }

    if (!isCentralServiceRequest(selectedMessage)) {
      await updateMessage(messageId, {
        request_status: requestStatus,
        company_seen: true,
      });
      return;
    }

    if (
      !selectedMessage.service_request_id ||
      !canRespondToServiceRequest(selectedMessage)
    ) {
      return;
    }

    setUpdatingId(messageId);
    setPageStatus(null);

    const matchUpdate = selectedMessage.service_match_id
      ? supabase
          .from('service_request_matches')
          .update({ status: requestStatus })
          .eq('id', selectedMessage.service_match_id)
          .eq('company_id', company?.id ?? '')
      : supabase
          .from('service_request_matches')
          .update({ status: requestStatus })
          .eq('request_id', selectedMessage.service_request_id)
          .eq('company_id', company?.id ?? '');

    const [matchResult, requestResult] = await Promise.all([
      matchUpdate,
      supabase
        .from('service_requests')
        .update({
          status: requestStatus,
          provider_seen: true,
        })
        .eq('id', selectedMessage.service_request_id)
        .eq('selected_company_id', company?.id ?? ''),
    ]);

    setUpdatingId(null);

    const errorMessage =
      matchResult.error?.message || requestResult.error?.message || '';

    if (errorMessage) {
      setPageStatus(errorMessage);
      return;
    }

    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              status: requestStatus,
              request_status: requestStatus,
              company_seen: true,
            }
          : message
      )
    );
  }

  async function deleteMessage(messageId: string) {
    const selectedMessage =
      messages.find((message) => message.id === messageId) ?? null;

    if (!selectedMessage || isCentralServiceRequest(selectedMessage)) {
      return;
    }

    const confirmed = window.confirm('Delete this item permanently?');

    if (!confirmed) return;

    setUpdatingId(messageId);
    setPageStatus(null);

    const { error } = await supabase
      .from('company_messages')
      .delete()
      .eq('id', messageId);

    setUpdatingId(null);

    if (error) {
      setPageStatus(error.message);
      return;
    }

    setMessages((currentMessages) =>
      currentMessages.filter((message) => message.id !== messageId)
    );
  }

  async function markAllAsRead() {
    if (!company) return;

    setPageStatus(null);

    const centralRequestIds = messages
      .filter(
        (message) =>
          isCentralServiceRequest(message) &&
          message.company_seen === false &&
          Boolean(message.service_request_id)
      )
      .map((message) => message.service_request_id as string);

    const [messagesResult, requestsResult] = await Promise.all([
      supabase
        .from('company_messages')
        .update({
          company_seen: true,
        })
        .eq('company_id', company.id)
        .eq('company_seen', false),

      centralRequestIds.length > 0
        ? supabase
            .from('service_requests')
            .update({ provider_seen: true })
            .in('id', centralRequestIds)
            .eq('selected_company_id', company.id)
        : Promise.resolve({ error: null }),
    ]);

    const errorMessage =
      messagesResult.error?.message || requestsResult.error?.message || '';

    if (errorMessage) {
      setPageStatus(errorMessage);
      return;
    }

    setMessages((currentMessages) =>
      currentMessages.map((message) => ({
        ...message,
        company_seen: true,
      }))
    );
  }

  function renderMessageItem(
    message: CompanyMessage,
    sectionKey: InboxSectionKey,
    isPreviousItem = false
  ) {
    const unread = message.company_seen === false;
    const sourceUrlAvailable = canOpenSourceUrl(message.source_url);
    const phoneReplyUrl = getPhoneReplyUrl(message.phone);
    const isServiceRequest =
      message.event_type === 'service_request' ||
      message.source_channel === 'sendio_service_request';
    const centralServiceRequest = isCentralServiceRequest(message);
    const requestCanBeAnswered =
      isServiceRequest && canRespondToServiceRequest(message);
    const isArchived = message.is_archived === true;
    const serviceRequestAddress = getServiceRequestAddress(message);
    const preferredServiceTime = getPreferredServiceTime(message);

    return (
      <article
        key={message.id}
        className={`rounded-[24px] border p-4 ${
          unread
            ? 'border-sky-200 bg-sky-50'
            : 'border-[var(--sendio-border,#dbeafe)] bg-[var(--sendio-soft,#f8fbff)]'
        } ${isPreviousItem ? 'opacity-95' : ''}`}
      >
        <div className="flex items-start gap-3">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--sendio-border,#dbeafe)] bg-white text-sm font-black text-[var(--sendio-text,#111827)]">
            <span>{getSourceIcon(message)}</span>

            {unread ? (
              <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-black text-[var(--sendio-text,#111827)]">
                {message.name || 'Client'}
              </h3>

              {unread ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-black text-emerald-700">
                  New
                </span>
              ) : null}

              <span className="rounded-full border border-[var(--sendio-border,#dbeafe)] bg-white px-2 py-0.5 text-[11px] font-black text-[var(--sendio-muted,#374151)]">
                {getSourceLabel(message)}
              </span>

              {isServiceRequest ? (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${getRequestStatusClass(
                    message.request_status
                  )}`}
                >
                  {getRequestStatusLabel(message.request_status)}
                </span>
              ) : null}
            </div>

            <p className="mt-1 truncate text-sm font-bold text-[var(--sendio-muted,#374151)]">
              {message.email || 'No email'}
            </p>

            {message.phone ? (
              <p className="mt-1 text-sm font-bold text-[var(--sendio-muted,#374151)]">
                {message.phone}
              </p>
            ) : null}

            <p className="mt-1 text-xs font-black text-[var(--sendio-muted,#374151)]">
              {formatDate(message.created_at)}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[var(--sendio-border,#dbeafe)] bg-white p-4">
          <p className="whitespace-pre-line text-sm font-semibold leading-6 text-[var(--sendio-text,#111827)]">
            {message.message || 'No message text.'}
          </p>
        </div>

        {centralServiceRequest ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--sendio-border,#dbeafe)] bg-white px-3 py-3">
              <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-[var(--sendio-muted,#374151)]">
                Service
              </span>
              <strong className="mt-1 block text-sm font-black text-[var(--sendio-text,#111827)]">
                {message.service_name || 'Service request'}
              </strong>
            </div>

            <div className="rounded-2xl border border-[var(--sendio-border,#dbeafe)] bg-white px-3 py-3">
              <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-[var(--sendio-muted,#374151)]">
                Preferred date and time
              </span>
              <strong className="mt-1 block text-sm font-black text-[var(--sendio-text,#111827)]">
                {preferredServiceTime || 'Flexible'}
              </strong>
            </div>

            <div className="rounded-2xl border border-[var(--sendio-border,#dbeafe)] bg-white px-3 py-3 sm:col-span-2">
              <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-[var(--sendio-muted,#374151)]">
                Client address
              </span>
              <strong className="mt-1 block text-sm font-black text-[var(--sendio-text,#111827)]">
                {serviceRequestAddress || 'No address saved'}
              </strong>
            </div>

            {message.cancelled_reason ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-black text-rose-700 sm:col-span-2">
                Cancellation: {message.cancelled_reason}
              </div>
            ) : null}
          </div>
        ) : null}

        {message.moderation_status &&
        message.moderation_status !== 'normal' ? (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">
            Moderation: {message.moderation_status}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {requestCanBeAnswered && message.request_status !== 'accepted' ? (
            <button
              type="button"
              onClick={() => updateRequestStatus(message.id, 'accepted')}
              disabled={updatingId === message.id}
              className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
            >
              Accept
            </button>
          ) : null}

          {requestCanBeAnswered && message.request_status !== 'declined' ? (
            <button
              type="button"
              onClick={() => updateRequestStatus(message.id, 'declined')}
              disabled={updatingId === message.id}
              className="rounded-full bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 ring-1 ring-rose-200 disabled:opacity-60"
            >
              Decline
            </button>
          ) : null}

          {centralServiceRequest && message.service_slug ? (
            <a
              href={`/services/${message.service_slug}`}
              className="rounded-full border border-[var(--sendio-border,#dbeafe)] bg-white px-3 py-2 text-xs font-black text-[var(--sendio-text,#111827)]"
            >
              View Service
            </a>
          ) : null}

          {sourceUrlAvailable ? (
            <a
              href={message.source_url ?? '#'}
              target={message.source_url?.startsWith('http') ? '_blank' : undefined}
              rel={message.source_url?.startsWith('http') ? 'noreferrer' : undefined}
              className="rounded-full border border-[var(--sendio-border,#dbeafe)] bg-white px-3 py-2 text-xs font-black text-[var(--sendio-text,#111827)]"
            >
              Open Source
            </a>
          ) : null}

          {canReplyByEmail(message.email) ? (
            <a
              href={getReplyMailUrl(message, company?.name ?? null)}
              className="rounded-full border border-[var(--sendio-border,#dbeafe)] bg-white px-3 py-2 text-xs font-black text-[var(--sendio-text,#111827)]"
            >
              Email
            </a>
          ) : null}

          {phoneReplyUrl ? (
            <a
              href={phoneReplyUrl}
              className="rounded-full border border-[var(--sendio-border,#dbeafe)] bg-white px-3 py-2 text-xs font-black text-[var(--sendio-text,#111827)]"
            >
              Call
            </a>
          ) : null}

          {unread ? (
            <button
              type="button"
              onClick={() => markMessageAsRead(message.id)}
              disabled={updatingId === message.id}
              className="rounded-full bg-[var(--sendio-text,#111827)] px-3 py-2 text-xs font-black text-white disabled:opacity-60"
            >
              Read
            </button>
          ) : null}

          {!centralServiceRequest ? (
            <>
              {isArchived ? (
                <button
                  type="button"
                  onClick={() => restoreMessage(message.id)}
                  disabled={updatingId === message.id}
                  className="rounded-full border border-[var(--sendio-border,#dbeafe)] bg-white px-3 py-2 text-xs font-black text-[var(--sendio-text,#111827)] disabled:opacity-60"
                >
                  Restore
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => archiveMessage(message.id)}
                  disabled={updatingId === message.id}
                  className="rounded-full border border-[var(--sendio-border,#dbeafe)] bg-white px-3 py-2 text-xs font-black text-[var(--sendio-text,#111827)] disabled:opacity-60"
                >
                  Archive
                </button>
              )}

              <button
                type="button"
                onClick={() => deleteMessage(message.id)}
                disabled={updatingId === message.id}
                className="rounded-full bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 ring-1 ring-rose-200 disabled:opacity-60"
              >
                Delete
              </button>
            </>
          ) : null}

        </div>

        {sectionKey === 'archived' ? (
          <p className="mt-3 text-xs font-bold text-[var(--sendio-muted,#374151)]">
            This item is archived. Restore it to move it back to the active inbox.
          </p>
        ) : null}
      </article>
    );
  }

  function renderInboxSection(section: InboxSection) {
    const latestItem = section.items[0] ?? null;
    const previousItems = section.items.slice(1);
    const expanded = Boolean(expandedSections[section.key]);

    return (
      <section
        key={section.key}
        className="rounded-[28px] border border-[var(--sendio-border,#dbeafe)] bg-white p-5 shadow-sm"
      >
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-[var(--sendio-border,#dbeafe)] pb-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--sendio-muted,#374151)]">
              {section.eyebrow}
            </p>

            <h2 className="mt-2 text-2xl font-black text-[var(--sendio-text,#111827)]">
              {section.title}
            </h2>

            <p className="mt-2 text-sm font-semibold text-[var(--sendio-muted,#374151)]">
              {section.description}
            </p>
          </div>

          <div className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[var(--sendio-border,#dbeafe)] bg-[var(--sendio-soft,#f8fbff)] text-sm font-black text-[var(--sendio-text,#111827)]">
            {section.items.length}
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between rounded-2xl border border-[var(--sendio-border,#dbeafe)] bg-[var(--sendio-soft,#f8fbff)] px-4 py-3">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--sendio-text,#111827)]">
            Latest
          </span>

          <span className="text-xs font-black text-[var(--sendio-muted,#374151)]">
            Only the newest item is visible
          </span>
        </div>

        {latestItem ? (
          <div className="space-y-3">
            {renderMessageItem(latestItem, section.key)}

            {previousItems.length > 0 ? (
              <button
                type="button"
                onClick={() => toggleSection(section.key)}
                className="w-full rounded-2xl border border-[var(--sendio-border,#dbeafe)] bg-[var(--sendio-soft,#f8fbff)] px-4 py-3 text-sm font-black text-[var(--sendio-text,#111827)] hover:bg-[var(--sendio-soft-hover,#e3efff)]"
              >
                {expanded
                  ? 'Hide previous items'
                  : `Show previous items (${previousItems.length})`}
              </button>
            ) : null}

            {expanded && previousItems.length > 0 ? (
              <div className="space-y-3 border-t border-dashed border-[var(--sendio-border,#dbeafe)] pt-3">
                {previousItems.map((message) =>
                  renderMessageItem(message, section.key, true)
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--sendio-border,#dbeafe)] bg-[var(--sendio-soft,#f8fbff)] p-5 text-sm font-black text-[var(--sendio-muted,#374151)]">
            No {section.title.toLowerCase()} yet.
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-[var(--sendio-border,#dbeafe)] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[var(--sendio-muted,#374151)]">
              Company Inbox
            </p>

            <h1 className="mt-2 text-3xl font-black text-[var(--sendio-text,#111827)]">
              {company ? `${company.name} Messages` : 'Messages'}
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-semibold text-[var(--sendio-muted,#374151)]">
              Service requests, Sendio messages, contact clicks, archives, and
              stats are separated into readable cards.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-[var(--sendio-border,#dbeafe)] bg-[var(--sendio-soft,#f8fbff)] px-3 py-2 text-xs font-black text-[var(--sendio-text,#111827)]">
              {stats.unread} unread
            </span>

            <span className="rounded-full border border-[var(--sendio-border,#dbeafe)] bg-[var(--sendio-soft,#f8fbff)] px-3 py-2 text-xs font-black text-[var(--sendio-text,#111827)]">
              {stats.archived} archived
            </span>

            <button
              type="button"
              onClick={markAllAsRead}
              disabled={stats.unread === 0}
              className="rounded-full bg-[var(--sendio-text,#111827)] px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark all read
            </button>
          </div>
        </div>

        {pageStatus ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-700">
            {pageStatus}
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className="rounded-[28px] border border-[var(--sendio-border,#dbeafe)] bg-white p-6 text-sm font-black text-[var(--sendio-muted,#374151)]">
          Loading messages...
        </p>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            {inboxSections.slice(0, 2).map(renderInboxSection)}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {inboxSections.slice(2, 5).map(renderInboxSection)}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {inboxSections.slice(5, 7).map(renderInboxSection)}

            <section className="rounded-[28px] border border-[var(--sendio-border,#dbeafe)] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-4 border-b border-[var(--sendio-border,#dbeafe)] pb-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--sendio-muted,#374151)]">
                    Inbox numbers
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-[var(--sendio-text,#111827)]">
                    Stats
                  </h2>

                  <p className="mt-2 text-sm font-semibold text-[var(--sendio-muted,#374151)]">
                    Live counters from linked requests and company messages.
                  </p>
                </div>

                <div className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[var(--sendio-border,#dbeafe)] bg-[var(--sendio-soft,#f8fbff)] text-sm font-black">
                  Σ
                </div>
              </div>

              <div className="grid gap-2">
                {[
                  ['Service Requests', stats.serviceRequests],
                  ['Sendio Messages', stats.sendioMessages],
                  ['Email', stats.email],
                  ['WhatsApp', stats.whatsapp],
                  ['Phone', stats.phone],
                  ['Social / External', stats.social],
                  ['Archived', stats.archived],
                  ['Unread', stats.unread],
                  ['Total', stats.total],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-2xl border border-[var(--sendio-border,#dbeafe)] bg-[var(--sendio-soft,#f8fbff)] px-4 py-3"
                  >
                    <span className="text-sm font-black text-[var(--sendio-text,#111827)]">
                      {label}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[var(--sendio-muted,#374151)]">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
