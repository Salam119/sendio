export type ChatRole =
  | "client"
  | "worker"
  | "company"
  | "admin"
  | "super_admin";

export type ChatReaction = "like" | "dislike" | "heart";

export type ConversationStatus =
  | "active"
  | "archived"
  | "frozen"
  | "closed";

export type DeliveryStatus = "sent" | "delivered" | "read";

export type ChatParticipant = {
  userId: string;
  role: ChatRole;
  displayName: string;
  profileUrl: string | null;
  avatarUrl: string | null;
};

export type StoredMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
  deliveryStatus: DeliveryStatus;
};

export type StoredReaction = {
  messageId: string;
  userId: string;
  reaction: ChatReaction;
  createdAt: string;
  updatedAt: string;
};

export type ConversationRecord = {
  id: string;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
};

export type SocketAttachment = {
  userId: string;
  role: ChatRole;
  connectedAt: string;
};

export type ClientSocketEvent =
  | { type: "message.send"; clientId: string; body: string }
  | { type: "message.delete"; messageId: string }
  | {
      type: "reaction.set";
      messageId: string;
      reaction: ChatReaction;
    }
  | { type: "reaction.remove"; messageId: string }
  | { type: "typing.start" }
  | { type: "typing.stop" }
  | { type: "messages.read"; messageIds: string[] }
  | { type: "conversation.archive" }
  | { type: "conversation.restore" }
  | {
      type: "conversation.block";
      targetUserId: string;
    }
  | {
      type: "conversation.unblock";
      targetUserId: string;
    }
  | {
      type: "conversation.report";
      messageId: string | null;
      reason: string;
    }
  | { type: "ping" };

export type ServerSocketEvent =
  | {
      type: "ready";
      conversationId: string;
      currentUserId: string;
      messages: StoredMessage[];
      reactions: StoredReaction[];
      archived: boolean;
      blocked: boolean;
    }
  | {
      type: "message.created";
      message: StoredMessage;
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
      reaction: ChatReaction | null;
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
      status: ConversationStatus;
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
