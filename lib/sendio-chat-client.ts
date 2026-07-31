import { supabase } from "@/lib/supabase";

export type SendioChatRole =
  | "client"
  | "worker"
  | "company"
  | "admin"
  | "super_admin";

export type SendioChatReaction = "like" | "dislike" | "heart";
export type SendioDeliveryStatus = "sent" | "delivered" | "read";

export type SendioChatParticipant = {
  userId: string;
  role: SendioChatRole;
  displayName: string;
  profileUrl: string | null;
  avatarUrl: string | null;
};

export type SendioStoredMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
  deliveryStatus: SendioDeliveryStatus;
};

export type SendioStoredReaction = {
  messageId: string;
  userId: string;
  reaction: SendioChatReaction;
  createdAt: string;
  updatedAt: string;
};

export type SendioChatSettings = {
  profileChatEnabled: boolean;
  soundEnabled: boolean;
};

export type SendioIndexedConversation = {
  id: string;
  status: "active" | "archived" | "frozen" | "closed";
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  lastSenderId: string | null;
  unreadCount: number;
  archivedAt: string | null;
  otherParticipant: SendioChatParticipant | null;
};

export type SendioChatSession = {
  user: SendioChatParticipant;
  settings: SendioChatSettings;
  conversations: SendioIndexedConversation[];
};

export type SendioChatModerationStatus =
  | "active"
  | "suspended"
  | "deleted";

export type SendioChatReportEvidence = {
  capturedAt: string;
  participants: SendioChatParticipant[];
  messages: Array<{
    id: string;
    senderId: string;
    body: string | null;
    createdAt: string;
    deletedAt: string | null;
  }>;
};

export type SendioAdminChatReport = {
  id: string;
  conversationId: string;
  messageId: string | null;
  reporterId: string;
  reportedUserId: string | null;
  reason: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  reporter: SendioChatParticipant | null;
  reportedUser: SendioChatParticipant | null;
  evidence: SendioChatReportEvidence | null;
  reportedUserStatus: SendioChatModerationStatus;
};

export type SendioClientSocketEvent =
  | { type: "message.send"; clientId: string; body: string }
  | { type: "message.delete"; messageId: string }
  | {
      type: "reaction.set";
      messageId: string;
      reaction: SendioChatReaction;
    }
  | { type: "reaction.remove"; messageId: string }
  | { type: "typing.start" }
  | { type: "typing.stop" }
  | { type: "messages.read"; messageIds: string[] }
  | { type: "conversation.archive" }
  | { type: "conversation.restore" }
  | { type: "conversation.block"; targetUserId: string }
  | { type: "conversation.unblock"; targetUserId: string }
  | {
      type: "conversation.report";
      messageId: string | null;
      reason: string;
    }
  | { type: "ping" };

export type SendioServerSocketEvent =
  | {
      type: "ready";
      conversationId: string;
      currentUserId: string;
      messages: SendioStoredMessage[];
      reactions: SendioStoredReaction[];
      archived: boolean;
      blocked: boolean;
    }
  | {
      type: "message.created";
      message: SendioStoredMessage;
      clientId: string;
    }
  | {
      type: "message.deleted";
      messageId: string;
      deletedAt: string;
      deletedBy: string;
    }
  | {
      type: "reaction.updated";
      messageId: string;
      userId: string;
      reaction: SendioChatReaction | null;
    }
  | {
      type: "typing.changed";
      userId: string;
      isTyping: boolean;
    }
  | {
      type: "messages.read";
      userId: string;
      messageIds: string[];
      readAt: string;
    }
  | {
      type: "conversation.updated";
      status: "active" | "archived" | "frozen" | "closed";
    }
  | {
      type: "user.blocked";
      userId: string;
      targetUserId: string;
    }
  | {
      type: "user.unblocked";
      userId: string;
      targetUserId: string;
    }
  | { type: "report.created"; reportId: string }
  | { type: "error"; code: string }
  | { type: "pong" };

type ConversationCreateResponse = {
  conversationId: string;
  recipient: SendioChatParticipant;
  existing: boolean;
  settings: SendioChatSettings;
};

type SocketTicketResponse = {
  socketUrl: string;
  expiresAt: string;
};

type SettingsResponse = {
  settings: SendioChatSettings;
};

const CHAT_URL =
  process.env.NEXT_PUBLIC_SENDIO_CHAT_URL?.replace(/\/+$/, "");

function getChatUrl(): string {
  if (!CHAT_URL) throw new Error("chat_url_missing");
  return CHAT_URL;
}

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error("chat_auth_required");
  }

  return session.access_token;
}

async function chatRequest<T extends object>(
  path: string,
  init: RequestInit = {},
  explicitAccessToken?: string,
): Promise<T> {
  const accessToken = explicitAccessToken ?? (await getAccessToken());
  const response = await fetch(`${getChatUrl()}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  let data: T | { error?: string } = {} as T;

  try {
    data = (await response.json()) as T | { error?: string };
  } catch {
    data = {} as T;
  }

  if (!response.ok) {
    throw new Error(
      "error" in data && data.error
        ? data.error
        : "chat_request_failed",
    );
  }

  return data as T;
}


export function getSendioChatSession(
  accessToken?: string,
): Promise<SendioChatSession> {
  return chatRequest<SendioChatSession>(
    "/v1/chat/session",
    {
      method: "GET",
    },
    accessToken,
  );
}

export function createSendioConversation(
  recipientType: "company" | "worker",
  recipientIdentifier: string,
): Promise<ConversationCreateResponse> {
  return chatRequest<ConversationCreateResponse>(
    "/v1/chat/conversations",
    {
      method: "POST",
      body: JSON.stringify({
        recipientType,
        recipientIdentifier,
      }),
    },
  );
}

export function updateSendioChatSettings(
  settings: Partial<SendioChatSettings>,
): Promise<SettingsResponse> {
  return chatRequest<SettingsResponse>("/v1/chat/settings", {
    method: "PATCH",
    body: JSON.stringify(settings),
  });
}

export function createSendioSocketTicket(
  conversationId: string,
): Promise<SocketTicketResponse> {
  return chatRequest<SocketTicketResponse>(
    `/v1/chat/conversations/${encodeURIComponent(conversationId)}/ticket`,
    { method: "POST" },
  );
}

export async function openSendioChatSocket(
  conversationId: string,
): Promise<WebSocket> {
  const ticket = await createSendioSocketTicket(conversationId);
  return new WebSocket(ticket.socketUrl);
}

export function getSendioAdminChatReports(): Promise<{
  reports: SendioAdminChatReport[];
}> {
  return chatRequest<{ reports: SendioAdminChatReport[] }>(
    "/v1/chat/admin/reports",
    { method: "GET" },
  );
}

export function updateSendioAdminChatReportStatus(
  reportId: string,
  status: "open" | "reviewing" | "resolved" | "dismissed",
): Promise<{ ok: boolean }> {
  return chatRequest<{ ok: boolean }>(
    `/v1/chat/admin/reports/${encodeURIComponent(reportId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

export function moderateSendioChatUser(
  reportId: string,
  status: SendioChatModerationStatus,
  reason: string,
): Promise<{
  moderation: {
    userId: string;
    status: SendioChatModerationStatus;
    reason: string | null;
    actionBy: string | null;
    updatedAt: string | null;
  };
}> {
  return chatRequest<{
    moderation: {
      userId: string;
      status: SendioChatModerationStatus;
      reason: string | null;
      actionBy: string | null;
      updatedAt: string | null;
    };
  }>(
    `/v1/chat/admin/reports/${encodeURIComponent(reportId)}/user`,
    {
      method: "POST",
      body: JSON.stringify({ status, reason }),
    },
  );
}

export function deleteSendioReportedMessage(
  reportId: string,
): Promise<{ ok: boolean }> {
  return chatRequest<{ ok: boolean }>(
    `/v1/chat/admin/reports/${encodeURIComponent(reportId)}/message`,
    { method: "DELETE" },
  );
}

export function sendSendioSocketEvent(
  socket: WebSocket,
  event: SendioClientSocketEvent,
): void {
  if (socket.readyState !== WebSocket.OPEN) {
    throw new Error("chat_socket_not_open");
  }

  socket.send(JSON.stringify(event));
}
