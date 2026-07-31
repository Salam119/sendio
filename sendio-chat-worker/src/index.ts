import { DurableObject } from "cloudflare:workers";
import {
  authenticateChatRequest,
  type AuthenticatedChatContext,
} from "./chat-auth";
import {
  type AdminChatReport,
  type ChatModerationStatus,
  type ChatUserSettings,
} from "./index-store";
import { ensureChatIndexSchema } from "./index-schema";
import {
  loadChatRecipient,
  type ChatRecipientType,
  type ChatWorkerEnv,
} from "./profile";
import { ChatRealtimeController } from "./realtime";
import { ChatControlStore } from "./control-store";
import { ChatMessageStore } from "./message-store";
import { ChatReactionStore } from "./reaction-store";
import { ChatReadStore } from "./read-store";
import { SocketTicketStore } from "./socket-ticket-store";
import { ChatRoomStore } from "./storage";
import type {
  ChatParticipant,
  SocketAttachment,
} from "./types";

const ALLOWED_ORIGINS = new Set([
  "https://sendio.be",
  "https://www.sendio.be",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

const JSON_HEADERS = {
  "content-type": "application/json; charset=UTF-8",
  "cache-control": "no-store",
};

type SettingsPatch = {
  profileChatEnabled?: unknown;
  soundEnabled?: unknown;
};
type ConversationCreateBody = {
  recipientType?: unknown;
  recipientIdentifier?: unknown;
};

type AdminReportStatusBody = {
  status?: unknown;
};

type AdminUserModerationBody = {
  status?: unknown;
  reason?: unknown;
};

type AdminDeleteMessageBody = {
  messageId?: unknown;
};

type ChatSocketAttachment = SocketAttachment & {
  conversationId: string;
};

function getCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");

  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return {
      vary: "Origin",
    };
  }

  return {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-headers":
      "authorization, content-type",
    "access-control-allow-methods":
      "GET, POST, PATCH, DELETE, OPTIONS",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function jsonResponse(
  request: Request,
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...getCorsHeaders(request),
    },
  });
}

function emptyResponse(
  request: Request,
  status = 204,
): Response {
  return new Response(null, {
    status,
    headers: getCorsHeaders(request),
  });
}

function errorResponse(
  request: Request,
  code: string,
  status: number,
): Response {
  return jsonResponse(
    request,
    {
      error: code,
    },
    status,
  );
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isAdminRole(
  role: ChatParticipant["role"],
): role is "admin" | "super_admin" {
  return role === "admin" || role === "super_admin";
}

function isReportStatus(
  value: unknown,
): value is "open" | "reviewing" | "resolved" | "dismissed" {
  return (
    value === "open" ||
    value === "reviewing" ||
    value === "resolved" ||
    value === "dismissed"
  );
}

function isModerationStatus(
  value: unknown,
): value is ChatModerationStatus {
  return (
    value === "active" ||
    value === "suspended" ||
    value === "deleted"
  );
}

function canModerateTarget(
  admin: ChatParticipant,
  target: ChatParticipant,
): boolean {
  if (admin.userId === target.userId) return false;
  if (target.role === "super_admin") return false;
  if (admin.role === "admin" && target.role === "admin") {
    return false;
  }

  return isAdminRole(admin.role);
}

function requireAdmin(
  request: Request,
  auth: AuthenticatedChatContext,
): Response | null {
  return isAdminRole(auth.participant.role)
    ? null
    : errorResponse(request, "admin_access_forbidden", 403);
}

async function handleSession(
  request: Request,
  auth: AuthenticatedChatContext,
): Promise<Response> {
  const [settings, conversations] = await Promise.all([
    auth.indexStore.getSettings(auth.participant.userId),
    auth.indexStore.listUserConversations(
      auth.participant.userId,
    ),
  ]);

  return jsonResponse(request, {
    user: auth.participant,
    settings,
    conversations,
  });
}

async function handleSettingsPatch(
  request: Request,
  auth: AuthenticatedChatContext,
): Promise<Response> {
  let body: SettingsPatch;

  try {
    body = (await request.json()) as SettingsPatch;
  } catch {
    return errorResponse(
      request,
      "invalid_json",
      400,
    );
  }

  const update: Partial<ChatUserSettings> = {};

  if (body.soundEnabled !== undefined) {
    if (!isBoolean(body.soundEnabled)) {
      return errorResponse(
        request,
        "invalid_sound_setting",
        400,
      );
    }

    update.soundEnabled = body.soundEnabled;
  }

  if (body.profileChatEnabled !== undefined) {
    if (!isBoolean(body.profileChatEnabled)) {
      return errorResponse(
        request,
        "invalid_profile_chat_setting",
        400,
      );
    }

    if (
      auth.participant.role !== "company" &&
      auth.participant.role !== "worker"
    ) {
      return errorResponse(
        request,
        "profile_chat_setting_forbidden",
        403,
      );
    }

    update.profileChatEnabled =
      body.profileChatEnabled;
  }

  if (Object.keys(update).length === 0) {
    return errorResponse(
      request,
      "settings_update_required",
      400,
    );
  }

  const settings =
    await auth.indexStore.updateSettings(
      auth.participant.userId,
      update,
    );

  return jsonResponse(request, {
    settings,
  });
}

async function handleConversationCreate(
  request: Request,
  env: ChatWorkerEnv,
  auth: AuthenticatedChatContext,
): Promise<Response> {
  let body: ConversationCreateBody;

  try {
    body = (await request.json()) as ConversationCreateBody;
  } catch {
    return errorResponse(
      request,
      "invalid_json",
      400,
    );
  }

  if (
    body.recipientType !== "company" &&
    body.recipientType !== "worker"
  ) {
    return errorResponse(
      request,
      "recipient_type_invalid",
      400,
    );
  }

  if (
    typeof body.recipientIdentifier !== "string" ||
    !body.recipientIdentifier.trim()
  ) {
    return errorResponse(
      request,
      "recipient_identifier_invalid",
      400,
    );
  }

  try {
    const recipient = await loadChatRecipient(
      env,
      request,
      body.recipientType as ChatRecipientType,
      body.recipientIdentifier,
    );

    if (
      recipient.userId === auth.participant.userId
    ) {
      return errorResponse(
        request,
        "conversation_with_self_forbidden",
        400,
      );
    }

    const existingConversationId =
      await auth.indexStore.findConversationBetween(
        auth.participant.userId,
        recipient.userId,
      );

    if (existingConversationId) {
      const settings = await auth.indexStore.getSettings(
        auth.participant.userId,
      );

      return jsonResponse(request, {
        conversationId: existingConversationId,
        recipient,
        existing: true,
        settings,
      });
    }

    await auth.indexStore.upsertUser(recipient);

    const recipientSettings =
      await auth.indexStore.getSettings(
        recipient.userId,
      );

    if (!recipientSettings.profileChatEnabled) {
      return errorResponse(
        request,
        "recipient_chat_disabled",
        403,
      );
    }

    const conversationId =
      await auth.indexStore.getOrCreateConversation(
        auth.participant,
        recipient,
      );

    const settings = await auth.indexStore.getSettings(
      auth.participant.userId,
    );

    return jsonResponse(
      request,
      {
        conversationId,
        recipient,
        existing: false,
        settings,
      },
      201,
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "conversation_creation_failed";

    if (code === "recipient_not_found") {
      return errorResponse(
        request,
        code,
        404,
      );
    }

    if (
      code === "recipient_identifier_invalid" ||
      code === "conversation_with_self_forbidden"
    ) {
      return errorResponse(
        request,
        code,
        400,
      );
    }

    if (code === "profile_lookup_failed") {
      return errorResponse(
        request,
        code,
        502,
      );
    }

    return errorResponse(
      request,
      "conversation_creation_failed",
      500,
    );
  }
}
async function findAdminReport(
  auth: AuthenticatedChatContext,
  reportId: string,
): Promise<AdminChatReport | null> {
  const reports = await auth.indexStore.listAdminReports();
  return reports.find((report) => report.id === reportId) ?? null;
}

async function handleAdminReportsList(
  request: Request,
  auth: AuthenticatedChatContext,
): Promise<Response> {
  const denied = requireAdmin(request, auth);
  if (denied) return denied;

  const reports = await auth.indexStore.listAdminReports();
  return jsonResponse(request, { reports });
}

async function handleAdminReportStatus(
  request: Request,
  auth: AuthenticatedChatContext,
  reportId: string,
): Promise<Response> {
  const denied = requireAdmin(request, auth);
  if (denied) return denied;

  let body: AdminReportStatusBody;

  try {
    body = (await request.json()) as AdminReportStatusBody;
  } catch {
    return errorResponse(request, "invalid_json", 400);
  }

  if (!isReportStatus(body.status)) {
    return errorResponse(request, "report_status_invalid", 400);
  }

  const report = await findAdminReport(auth, reportId);
  if (!report) return errorResponse(request, "report_not_found", 404);

  await auth.indexStore.updateReportStatus(
    reportId,
    body.status,
    auth.participant.userId,
  );
  await auth.indexStore.recordAdminAction(
    report.conversationId,
    auth.participant.userId,
    `report_${body.status}`,
    report.reportedUserId,
    report.messageId,
    report.reason,
  );

  return jsonResponse(request, { ok: true });
}

async function handleAdminUserModeration(
  request: Request,
  auth: AuthenticatedChatContext,
  reportId: string,
): Promise<Response> {
  const denied = requireAdmin(request, auth);
  if (denied) return denied;

  let body: AdminUserModerationBody;

  try {
    body = (await request.json()) as AdminUserModerationBody;
  } catch {
    return errorResponse(request, "invalid_json", 400);
  }

  if (!isModerationStatus(body.status)) {
    return errorResponse(request, "moderation_status_invalid", 400);
  }

  const report = await findAdminReport(auth, reportId);
  if (!report) return errorResponse(request, "report_not_found", 404);
  if (!report.reportedUser) {
    return errorResponse(request, "reported_user_not_found", 404);
  }
  if (!canModerateTarget(auth.participant, report.reportedUser)) {
    return errorResponse(request, "moderation_target_forbidden", 403);
  }

  const reason =
    typeof body.reason === "string"
      ? body.reason.slice(0, 500)
      : report.reason;
  const moderation = await auth.indexStore.setUserModeration(
    report.reportedUser.userId,
    body.status,
    auth.participant.userId,
    reason,
  );
  await auth.indexStore.recordAdminAction(
    report.conversationId,
    auth.participant.userId,
    `user_${body.status}`,
    report.reportedUser.userId,
    report.messageId,
    reason,
  );

  return jsonResponse(request, { moderation });
}

async function handleAdminMessageDelete(
  request: Request,
  env: ChatWorkerEnv,
  auth: AuthenticatedChatContext,
  reportId: string,
): Promise<Response> {
  const denied = requireAdmin(request, auth);
  if (denied) return denied;

  const report = await findAdminReport(auth, reportId);
  if (!report) return errorResponse(request, "report_not_found", 404);
  if (!report.messageId) {
    return errorResponse(request, "reported_message_missing", 400);
  }

  const roomId = env.CHAT_ROOM.idFromName(report.conversationId);
  const room = env.CHAT_ROOM.get(roomId);
  const response = await room.fetch(
    new Request("https://sendio-chat.internal/admin/delete-message", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-sendio-admin-id": auth.participant.userId,
        "x-sendio-conversation-id": report.conversationId,
      },
      body: JSON.stringify({ messageId: report.messageId }),
    }),
  );

  if (!response.ok) {
    return errorResponse(request, "admin_message_delete_failed", 400);
  }

  await auth.indexStore.recordAdminAction(
    report.conversationId,
    auth.participant.userId,
    "message_deleted",
    report.reportedUserId,
    report.messageId,
    report.reason,
  );

  return jsonResponse(request, { ok: true });
}

async function handleTicketCreate(
  request: Request,
  env: ChatWorkerEnv,
  auth: AuthenticatedChatContext,
  conversationId: string,
): Promise<Response> {
  const ticketStore = new SocketTicketStore(
    env.sendio_chat_index,
  );

  try {
    const ticketData = await ticketStore.createTicket(
      auth.participant.userId,
      conversationId,
    );

    const socketUrl = new URL(
      "/v1/chat/socket",
      request.url,
    );

    socketUrl.protocol =
      socketUrl.protocol === "https:"
        ? "wss:"
        : "ws:";

    socketUrl.searchParams.set(
      "ticket",
      ticketData.ticket,
    );

    return jsonResponse(request, {
      socketUrl: socketUrl.toString(),
      expiresAt: ticketData.expiresAt,
    });
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "ticket_creation_failed";

    return errorResponse(
      request,
      code,
      code === "conversation_access_forbidden"
        ? 403
        : 400,
    );
  }
}

async function handleSocketUpgrade(
  request: Request,
  env: ChatWorkerEnv,
): Promise<Response> {
  if (
    request.headers.get("upgrade")?.toLowerCase() !==
    "websocket"
  ) {
    return errorResponse(
      request,
      "websocket_upgrade_required",
      426,
    );
  }

  const url = new URL(request.url);
  const ticket = url.searchParams.get("ticket");

  if (!ticket) {
    return errorResponse(
      request,
      "socket_ticket_required",
      401,
    );
  }

  const ticketStore = new SocketTicketStore(
    env.sendio_chat_index,
  );

  const consumedTicket =
    await ticketStore.consumeTicket(ticket);

  if (!consumedTicket) {
    return errorResponse(
      request,
      "socket_ticket_invalid",
      401,
    );
  }

  const participant = await new (
    await import("./index-store")
  ).ChatIndexStore(
    env.sendio_chat_index,
  ).getUser(consumedTicket.userId);

  if (!participant) {
    return errorResponse(
      request,
      "chat_user_not_found",
      404,
    );
  }

  const roomId = env.CHAT_ROOM.idFromName(
    consumedTicket.conversationId,
  );

  const room = env.CHAT_ROOM.get(roomId);
  const headers = new Headers(request.headers);

  headers.set(
    "x-sendio-user-id",
    consumedTicket.userId,
  );
  headers.set(
    "x-sendio-conversation-id",
    consumedTicket.conversationId,
  );

  return room.fetch(
    new Request(
      "https://sendio-chat.internal/socket",
      {
        method: "GET",
        headers,
      },
    ),
  );
}

export class ChatRoom extends DurableObject<ChatWorkerEnv> {
  private readonly roomStore: ChatRoomStore;
  private readonly chatEnv: ChatWorkerEnv;

  constructor(
    ctx: DurableObjectState,
    env: ChatWorkerEnv,
  ) {
    super(ctx, env);

    this.chatEnv = env;
    this.roomStore = new ChatRoomStore(
      this.ctx.storage.sql,
    );

    this.roomStore.initialize();

    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair(
        "ping",
        "pong",
      ),
    );
  }

  async fetch(request: Request): Promise<Response> {
    const internalUrl = new URL(request.url);

    if (
      request.method === "POST" &&
      internalUrl.pathname === "/admin/delete-message"
    ) {
      const adminId = request.headers.get("x-sendio-admin-id");
      const conversationId = request.headers.get(
        "x-sendio-conversation-id",
      );

      if (!adminId || !conversationId) {
        return errorResponse(request, "admin_identity_missing", 401);
      }

      let body: AdminDeleteMessageBody;

      try {
        body = (await request.json()) as AdminDeleteMessageBody;
      } catch {
        return errorResponse(request, "invalid_json", 400);
      }

      if (typeof body.messageId !== "string" || !body.messageId) {
        return errorResponse(request, "message_id_invalid", 400);
      }

      const messageStore = new ChatMessageStore(
        this.ctx.storage.sql,
        conversationId,
      );
      const deleted = messageStore.deleteMessageByAdmin(
        body.messageId,
        adminId,
      );
      const event = JSON.stringify({
        type: "message.deleted",
        messageId: deleted.id,
        deletedAt: deleted.deletedAt,
        deletedBy: adminId,
      });

      for (const socket of this.ctx.getWebSockets()) {
        try {
          socket.send(event);
        } catch {
          // Closing sockets are ignored.
        }
      }

      return jsonResponse(request, { ok: true });
    }

    if (
      request.headers.get("upgrade")?.toLowerCase() !==
      "websocket"
    ) {
      return errorResponse(
        request,
        "websocket_upgrade_required",
        426,
      );
    }

    const userId = request.headers.get(
      "x-sendio-user-id",
    );
    const conversationId = request.headers.get(
      "x-sendio-conversation-id",
    );

    if (!userId || !conversationId) {
      return errorResponse(
        request,
        "socket_identity_missing",
        401,
      );
    }

    const { ChatIndexStore } = await import(
      "./index-store"
    );

    const indexStore = new ChatIndexStore(
      this.chatEnv.sendio_chat_index,
    );

    const isMember =
      await indexStore.isConversationMember(
        conversationId,
        userId,
      );

    if (!isMember) {
      return errorResponse(
        request,
        "conversation_access_forbidden",
        403,
      );
    }

    const participant =
      await indexStore.getUser(userId);

    if (!participant) {
      return errorResponse(
        request,
        "participant_not_found",
        404,
      );
    }

    const members =
      await indexStore.listConversationMembers(
        conversationId,
      );

    this.roomStore.ensureConversation(
      conversationId,
    );

    for (const member of members) {
      this.roomStore.upsertParticipant(member);
    }

    const messageStore = new ChatMessageStore(
      this.ctx.storage.sql,
      conversationId,
    );
    const reactionStore = new ChatReactionStore(
      this.ctx.storage.sql,
    );
    const readStore = new ChatReadStore(
      this.ctx.storage.sql,
    );
    const controlStore = new ChatControlStore(
      this.ctx.storage.sql,
    );

    const initialMessages = messageStore.listMessages(100);
    const unreadMessageIds = initialMessages
      .filter(
        (message) =>
          message.senderId !== participant.userId &&
          !message.deletedAt,
      )
      .map((message) => message.id);
    const readReceipts = readStore.markMessagesRead(
      participant.userId,
      unreadMessageIds,
    );

    if (readReceipts.length > 0) {
      await indexStore.markConversationRead(
        conversationId,
        participant.userId,
      );
    }

    const messages = messageStore.listMessages(100);
    const reactions = reactionStore.listReactionsForMessages(
      messages.map((message) => message.id),
    );
    const otherParticipant = members.find(
      (member) => member.userId !== participant.userId,
    );
    const archived = controlStore.isArchivedForUser(
      participant.userId,
    );
    const blocked = otherParticipant
      ? controlStore.isBlockedBetween(
          participant.userId,
          otherParticipant.userId,
        )
      : false;

    const pair = new WebSocketPair();
    const [client, server] = Object.values(
      pair,
    ) as [WebSocket, WebSocket];

    const attachment: ChatSocketAttachment = {
      userId: participant.userId,
      role: participant.role,
      connectedAt: new Date().toISOString(),
      conversationId,
    };

    server.serializeAttachment(attachment);
    this.ctx.acceptWebSocket(server);

    server.send(
      JSON.stringify({
        type: "ready",
        conversationId,
        currentUserId: participant.userId,
        messages,
        reactions,
        archived,
        blocked,
      }),
    );

    if (readReceipts.length > 0) {
      const readEvent = JSON.stringify({
        type: "messages.read",
        userId: participant.userId,
        messageIds: readReceipts.map(
          (receipt) => receipt.messageId,
        ),
        readAt: readReceipts[0].readAt,
      });

      for (const connectedSocket of this.ctx.getWebSockets()) {
        const socketAttachment =
          connectedSocket.deserializeAttachment() as
            | Partial<ChatSocketAttachment>
            | null;

        if (
          socketAttachment?.userId &&
          socketAttachment.userId !== participant.userId
        ) {
          try {
            connectedSocket.send(readEvent);
          } catch {
            // A closing socket must not prevent the new connection.
          }
        }
      }
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(
    socket: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    const controller =
      this.getRealtimeController(socket);

    if (!controller) {
      socket.send(
        JSON.stringify({
          type: "error",
          code: "socket_identity_missing",
        }),
      );

      return;
    }

    await controller.handleMessage(
      socket,
      message,
    );
  }

  webSocketClose(
    socket: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean,
  ): void {
    const controller =
      this.getRealtimeController(socket);

    controller?.handleClose(socket);
  }

  webSocketError(
    socket: WebSocket,
    _error: unknown,
  ): void {
    const controller =
      this.getRealtimeController(socket);

    controller?.handleClose(socket);
  }

  private getRealtimeController(
    socket: WebSocket,
  ): ChatRealtimeController | null {
    const attachment =
      socket.deserializeAttachment() as
        | Partial<ChatSocketAttachment>
        | null;

    if (
      !attachment ||
      typeof attachment.conversationId !== "string"
    ) {
      return null;
    }

    return new ChatRealtimeController(
      this.ctx,
      this.chatEnv,
      this.ctx.storage.sql,
      attachment.conversationId,
    );
  }
}

export default {
  async fetch(
    request: Request,
    env: ChatWorkerEnv,
    _ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return emptyResponse(request);
    }

    if (
      request.method === "GET" &&
      url.pathname === "/health"
    ) {
      return jsonResponse(request, {
        ok: true,
        service: "sendio-chat-worker",
        realtime: "durable-object-hibernation",
        uploads: false,
        messageSound: "sendio-signature-chime",
      });
    }

    if (url.pathname.startsWith("/v1/chat/")) {
      try {
        await ensureChatIndexSchema(env.sendio_chat_index);
      } catch (error) {
        console.error("sendio_chat_schema_failed", error);
        return errorResponse(
          request,
          "chat_storage_unavailable",
          503,
        );
      }
    }

    if (
      request.method === "GET" &&
      url.pathname === "/v1/chat/socket"
    ) {
      return handleSocketUpgrade(
        request,
        env,
      );
    }

    if (!url.pathname.startsWith("/v1/chat/")) {
      return errorResponse(
        request,
        "not_found",
        404,
      );
    }

    let auth: AuthenticatedChatContext | null;

    try {
      auth = await authenticateChatRequest(
        request,
        env,
      );
    } catch (error) {
      console.error("sendio_chat_identity_lookup_failed", error);
      return errorResponse(
        request,
        error instanceof Error &&
          /^[a-z0-9_]+$/i.test(error.message)
          ? error.message
          : "identity_lookup_failed",
        403,
      );
    }

    if (!auth) {
      return errorResponse(
        request,
        "unauthorized",
        401,
      );
    }

    if (
      request.method === "GET" &&
      url.pathname === "/v1/chat/session"
    ) {
      return handleSession(request, auth);
    }

    if (
      request.method === "PATCH" &&
      url.pathname === "/v1/chat/settings"
    ) {
      return handleSettingsPatch(
        request,
        auth,
      );
    }

    if (
      request.method === "POST" &&
      url.pathname === "/v1/chat/conversations"
    ) {
      return handleConversationCreate(
        request,
        env,
        auth,
      );
    }
    if (
      request.method === "GET" &&
      url.pathname === "/v1/chat/admin/reports"
    ) {
      return handleAdminReportsList(request, auth);
    }

    const adminReportStatusMatch = url.pathname.match(
      /^\/v1\/chat\/admin\/reports\/([^/]+)\/status$/,
    );

    if (
      request.method === "PATCH" &&
      adminReportStatusMatch?.[1]
    ) {
      return handleAdminReportStatus(
        request,
        auth,
        decodeURIComponent(adminReportStatusMatch[1]),
      );
    }

    const adminUserModerationMatch = url.pathname.match(
      /^\/v1\/chat\/admin\/reports\/([^/]+)\/user$/,
    );

    if (
      request.method === "POST" &&
      adminUserModerationMatch?.[1]
    ) {
      return handleAdminUserModeration(
        request,
        auth,
        decodeURIComponent(adminUserModerationMatch[1]),
      );
    }

    const adminMessageDeleteMatch = url.pathname.match(
      /^\/v1\/chat\/admin\/reports\/([^/]+)\/message$/,
    );

    if (
      request.method === "DELETE" &&
      adminMessageDeleteMatch?.[1]
    ) {
      return handleAdminMessageDelete(
        request,
        env,
        auth,
        decodeURIComponent(adminMessageDeleteMatch[1]),
      );
    }

    const ticketMatch = url.pathname.match(
      /^\/v1\/chat\/conversations\/([^/]+)\/ticket$/,
    );

    if (
      request.method === "POST" &&
      ticketMatch?.[1]
    ) {
      return handleTicketCreate(
        request,
        env,
        auth,
        decodeURIComponent(ticketMatch[1]),
      );
    }

    return errorResponse(
      request,
      "not_found",
      404,
    );
  },
} satisfies ExportedHandler<ChatWorkerEnv>;
