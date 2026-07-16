import type { SupabaseClient } from '@supabase/supabase-js';

export type SendioRecipientType =
  | 'company'
  | 'worker'
  | 'client'
  | 'admin'
  | 'super_admin';

export type SendioNotification = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  recipient_type: SendioRecipientType;
  event_type: string;
  source_table: string;
  source_id: string;
  title: string;
  body: string | null;
  target_url: string;
  metadata: Record<string, unknown>;
  is_seen: boolean;
  is_archived: boolean | null;
  seen_at: string | null;
  created_at: string;
};

export type CreateSendioNotificationInput = {
  recipientId: string;
  actorId: string | null;
  recipientType: SendioRecipientType;
  eventType: string;
  sourceTable: string;
  sourceId: string;
  title: string;
  body?: string | null;
  targetUrl: string;
  metadata?: Record<string, unknown>;
};

const CONTACT_OPENED_REVERSE_EVENTS: Record<
  string,
  {
    eventType: string;
    title: string;
    body: string;
    targetUrl: string;
  }
> = {
  company_contact_message: {
    eventType: 'client_company_message_opened',
    title: 'Your message was opened',
    body: 'The company opened your Sendio message.',
    targetUrl: '/clients',
  },

  company_contact_email: {
    eventType: 'client_company_email_opened',
    title: 'Your email contact was opened',
    body: 'The company opened your email contact.',
    targetUrl: '/clients',
  },

  company_contact_phone: {
    eventType: 'client_company_phone_opened',
    title: 'Your phone contact was viewed',
    body: 'The company viewed your phone contact.',
    targetUrl: '/clients',
  },

  company_contact_whatsapp: {
    eventType: 'client_company_whatsapp_opened',
    title: 'Your WhatsApp contact was viewed',
    body: 'The company viewed your WhatsApp contact.',
    targetUrl: '/clients',
  },

  company_contact_social: {
    eventType: 'client_company_social_opened',
    title: 'Your social contact was viewed',
    body: 'The company opened your social contact.',
    targetUrl: '/clients',
  },

  worker_contact_message: {
    eventType: 'client_worker_message_opened',
    title: 'Your message was opened',
    body: 'The worker opened your Sendio message.',
    targetUrl: '/clients',
  },

  worker_contact_email: {
    eventType: 'client_worker_email_opened',
    title: 'Your email contact was opened',
    body: 'The worker opened your email contact.',
    targetUrl: '/clients',
  },

  worker_contact_phone: {
    eventType: 'client_worker_phone_opened',
    title: 'Your phone contact was viewed',
    body: 'The worker viewed your phone contact.',
    targetUrl: '/clients',
  },

  worker_contact_whatsapp: {
    eventType: 'client_worker_whatsapp_opened',
    title: 'Your WhatsApp contact was viewed',
    body: 'The worker viewed your WhatsApp contact.',
    targetUrl: '/clients',
  },

  worker_contact_social: {
    eventType: 'client_worker_social_opened',
    title: 'Your social contact was viewed',
    body: 'The worker opened your social contact.',
    targetUrl: '/clients',
  },

  company_service_request_received: {
    eventType: 'client_company_service_request_opened',
    title: 'Your service request was opened',
    body: 'The company opened your service request.',
    targetUrl: '/clients',
  },

  worker_service_request_received: {
    eventType: 'client_worker_service_request_opened',
    title: 'Your service request was opened',
    body: 'The worker opened your service request.',
    targetUrl: '/clients',
  },
};

const IGNORED_EXACT_CONTACT_EVENTS = new Set([
  'contact_click',

  'company_contact_phone',
  'company_contact_whatsapp',
  'company_contact_social',

  'worker_contact_phone',
  'worker_contact_whatsapp',
  'worker_contact_social',
]);

export function isImportantFloatingSendioNotification(
  notification: SendioNotification
) {
  const eventType = String(notification.event_type ?? '')
    .trim()
    .toLowerCase();

  if (!eventType) {
    return false;
  }

  if (notification.is_seen) {
    return false;
  }

  if (notification.is_archived === true) {
    return false;
  }

  /*
   * Email notifications are important.
   * This includes email contact and email-opened notifications.
   */
  if (eventType.includes('email')) {
    return true;
  }

  /*
   * Written messages are important.
   * This includes Sendio messages, WhatsApp messages,
   * SMS messages, phone-written messages and social messages.
   *
   * Message-opened notifications also remain visible.
   */
  if (
    eventType.includes('message') ||
    eventType.includes('sms')
  ) {
    return true;
  }

  /*
   * Hide only contact clicks that do not confirm
   * that a written message was sent.
   */
  if (IGNORED_EXACT_CONTACT_EVENTS.has(eventType)) {
    return false;
  }

  if (eventType.includes('contact_click')) {
    return false;
  }

  /*
   * Hide calls and opening external contact methods.
   */
  const isIgnoredContactActivity =
    eventType.includes('phone_opened') ||
    eventType.includes('whatsapp_opened') ||
    eventType.includes('social_opened') ||
    eventType.includes('website_opened') ||
    eventType.includes('map_opened') ||
    eventType.includes('maps_opened') ||
    eventType.includes('call_opened');

  if (isIgnoredContactActivity) {
    return false;
  }

  /*
   * Keep every other real unread notification visible.
   *
   * This preserves:
   * - new service requests
   * - accepted requests
   * - declined requests
   * - cancelled requests
   * - request status changes
   * - service request opened notifications
   * - account and administration notifications
   */
  return true;
}

export function getSendioNotificationTargetUrl(
  notification: SendioNotification
) {
        if (notification.source_table === 'company_ads') {
  if (notification.recipient_type === 'admin') {
    return notification.target_url || '/dashboard/admin/ads';
  }

  return notification.target_url || '/dashboard/company/ads';
}

  if (notification.recipient_type === 'client') {
    return '/clients';
  }

  if (notification.recipient_type === 'company') {
    return '/dashboard/company/messages';
  }

  if (notification.recipient_type === 'worker') {
    return '/dashboard/worker/requests';
  }

  return notification.target_url || '/';
}

export async function createSendioNotification(
  supabase: SupabaseClient,
  input: CreateSendioNotificationInput
) {
  const payload = {
    recipient_id: input.recipientId,
    actor_id: input.actorId,
    recipient_type: input.recipientType,
    event_type: input.eventType,
    source_table: input.sourceTable,
    source_id: input.sourceId,
    title: input.title,
    body: input.body ?? null,
    target_url: input.targetUrl,
    metadata: input.metadata ?? {},
    is_seen: false,
    seen_at: null,
  };

  const { error } = await supabase
    .from('sendio_notifications')
    .upsert(payload, {
      onConflict:
        'recipient_id,event_type,source_table,source_id',
      ignoreDuplicates: true,
    });

  if (error) {
    console.error(
      'SENDIO NOTIFICATION CREATE ERROR:',
      error
    );

    return false;
  }

  return true;
}

export async function getUnreadSendioNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 5
) {
  const fetchLimit = Math.max(limit * 20, 50);

  const { data, error } = await supabase
    .from('sendio_notifications')
    .select('*')
    .eq('recipient_id', userId)
    .eq('is_seen', false)
    .or('is_archived.is.null,is_archived.eq.false')
    .order('created_at', { ascending: false })
    .limit(fetchLimit);

  if (error) {
    throw error;
  }

  return ((data ?? []) as SendioNotification[])
    .filter(isImportantFloatingSendioNotification)
    .slice(0, limit);
}

export async function markSendioNotificationSeen(
  supabase: SupabaseClient,
  notificationId: string,
  userId: string
) {
  const { error } = await supabase
    .from('sendio_notifications')
    .update({
      is_seen: true,
      seen_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .eq('recipient_id', userId);

  if (error) {
    throw error;
  }
}

export async function openSendioNotification(
  supabase: SupabaseClient,
  notificationId: string,
  currentUserId: string
) {
  const { data: notification, error } = await supabase
    .from('sendio_notifications')
    .select('*')
    .eq('id', notificationId)
    .eq('recipient_id', currentUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!notification) {
    return null;
  }

  const typedNotification =
    notification as SendioNotification;

  await markSendioNotificationSeen(
    supabase,
    typedNotification.id,
    currentUserId
  );

  await createReverseClientOpenedNotification(
    supabase,
    typedNotification,
    currentUserId
  );

  return getSendioNotificationTargetUrl(
    typedNotification
  );
}

async function createReverseClientOpenedNotification(
  supabase: SupabaseClient,
  notification: SendioNotification,
  openerUserId: string
) {
  const reverseEvent =
    CONTACT_OPENED_REVERSE_EVENTS[
      notification.event_type
    ];

  if (!reverseEvent) {
    return;
  }

  if (!notification.actor_id) {
    return;
  }

  if (notification.actor_id === openerUserId) {
    return;
  }

  await createSendioNotification(supabase, {
    recipientId: notification.actor_id,
    actorId: openerUserId,
    recipientType: 'client',
    eventType: reverseEvent.eventType,
    sourceTable: notification.source_table,
    sourceId: notification.source_id,
    title: reverseEvent.title,
    body: reverseEvent.body,
    targetUrl: reverseEvent.targetUrl,
    metadata: {
      opened_from_notification_id: notification.id,
      original_event_type: notification.event_type,
      original_recipient_type:
        notification.recipient_type,
      ...(notification.metadata ?? {}),
    },
  });
}

export function getFloatingNotificationsEnabled() {
  if (typeof window === 'undefined') {
    return true;
  }

  return (
    window.localStorage.getItem(
      'sendio_floating_notifications'
    ) !== 'disabled'
  );
}

export function setFloatingNotificationsEnabled(
  enabled: boolean
) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    'sendio_floating_notifications',
    enabled ? 'enabled' : 'disabled'
  );
}
