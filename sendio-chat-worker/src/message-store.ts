import type {
  DeliveryStatus,
  StoredMessage,
} from "./types";

type MessageRow = {
  id: string;
  sender_id: string;
  body: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  delivery_status: DeliveryStatus;
};

function mapMessage(
  conversationId: string,
  row: MessageRow,
): StoredMessage {
  return {
    id: row.id,
    conversationId,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
    deliveryStatus: row.delivery_status,
  };
}

function cleanMessageBody(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export class ChatMessageStore {
  constructor(
    private readonly sql: SqlStorage,
    private readonly conversationId: string,
  ) {}

  createMessage(
    senderId: string,
    body: string,
  ): StoredMessage {
    const cleanedBody = cleanMessageBody(body);

    if (!cleanedBody) {
      throw new Error("message_empty");
    }

    if (cleanedBody.length > 2000) {
      throw new Error("message_too_long");
    }

    const message: StoredMessage = {
      id: crypto.randomUUID(),
      conversationId: this.conversationId,
      senderId,
      body: cleanedBody,
      createdAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
      deletedBy: null,
      deliveryStatus: "sent",
    };

    this.sql.exec(
      `
        INSERT INTO messages (
          id,
          sender_id,
          body,
          created_at,
          edited_at,
          deleted_at,
          deleted_by,
          delivery_status
        )
        VALUES (?, ?, ?, ?, NULL, NULL, NULL, 'sent')
      `,
      message.id,
      message.senderId,
      message.body,
      message.createdAt,
    );

    this.touchConversation(message.createdAt);

    return message;
  }

  getMessage(messageId: string): StoredMessage | null {
    const rows = this.sql
      .exec<MessageRow>(
        `
          SELECT
            id,
            sender_id,
            body,
            created_at,
            edited_at,
            deleted_at,
            deleted_by,
            delivery_status
          FROM messages
          WHERE id = ?
          LIMIT 1
        `,
        messageId,
      )
      .toArray();

    const message = rows[0];

    return message
      ? mapMessage(this.conversationId, message)
      : null;
  }

  listMessages(limit = 50): StoredMessage[] {
    const safeLimit = Math.max(1, Math.min(limit, 100));

    return this.sql
      .exec<MessageRow>(
        `
          SELECT
            id,
            sender_id,
            body,
            created_at,
            edited_at,
            deleted_at,
            deleted_by,
            delivery_status
          FROM messages
          ORDER BY created_at DESC
          LIMIT ?
        `,
        safeLimit,
      )
      .toArray()
      .reverse()
      .map((row) => mapMessage(this.conversationId, row));
  }

  deleteOwnMessage(
    messageId: string,
    userId: string,
  ): StoredMessage {
    const message = this.getMessage(messageId);

    if (!message) {
      throw new Error("message_not_found");
    }

    if (message.senderId !== userId) {
      throw new Error("message_delete_forbidden");
    }

    if (message.deletedAt) {
      return message;
    }

    const deletedAt = new Date().toISOString();

    this.sql.exec(
      `
        UPDATE messages
        SET
          body = NULL,
          deleted_at = ?,
          deleted_by = ?
        WHERE id = ?
      `,
      deletedAt,
      userId,
      messageId,
    );

    this.sql.exec(
      `
        DELETE FROM reactions
        WHERE message_id = ?
      `,
      messageId,
    );

    this.touchConversation(deletedAt);

    const deletedMessage = this.getMessage(messageId);

    if (!deletedMessage) {
      throw new Error("message_delete_failed");
    }

    return deletedMessage;
  }

  deleteMessageByAdmin(
    messageId: string,
    adminId: string,
  ): StoredMessage {
    const message = this.getMessage(messageId);

    if (!message) {
      throw new Error("message_not_found");
    }

    if (message.deletedAt) {
      return message;
    }

    const deletedAt = new Date().toISOString();

    this.sql.exec(
      `
        UPDATE messages
        SET
          body = NULL,
          deleted_at = ?,
          deleted_by = ?
        WHERE id = ?
      `,
      deletedAt,
      adminId,
      messageId,
    );

    this.sql.exec(
      `
        DELETE FROM reactions
        WHERE message_id = ?
      `,
      messageId,
    );

    this.touchConversation(deletedAt);

    const deletedMessage = this.getMessage(messageId);

    if (!deletedMessage) {
      throw new Error("message_delete_failed");
    }

    return deletedMessage;
  }

  updateDeliveryStatus(
    messageId: string,
    status: DeliveryStatus,
  ): void {
    this.sql.exec(
      `
        UPDATE messages
        SET delivery_status = ?
        WHERE id = ?
          AND deleted_at IS NULL
      `,
      status,
      messageId,
    );
  }

  private touchConversation(updatedAt: string): void {
    this.sql.exec(
      `
        UPDATE conversation
        SET updated_at = ?
        WHERE id = ?
      `,
      updatedAt,
      this.conversationId,
    );
  }
}
