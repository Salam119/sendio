export type ReadReceipt = {
  messageId: string;
  userId: string;
  readAt: string;
};

type ReadRow = {
  message_id: string;
  user_id: string;
  read_at: string;
};

function mapReadReceipt(row: ReadRow): ReadReceipt {
  return {
    messageId: row.message_id,
    userId: row.user_id,
    readAt: row.read_at,
  };
}

export class ChatReadStore {
  constructor(private readonly sql: SqlStorage) {}

  markMessagesRead(
    userId: string,
    messageIds: string[],
  ): ReadReceipt[] {
    const uniqueMessageIds = [
      ...new Set(messageIds.filter(Boolean)),
    ].slice(0, 100);

    if (uniqueMessageIds.length === 0) {
      return [];
    }

    const readAt = new Date().toISOString();
    const receipts: ReadReceipt[] = [];

    for (const messageId of uniqueMessageIds) {
      const rows = this.sql
        .exec<{
          sender_id: string;
          deleted_at: string | null;
        }>(
          `
            SELECT sender_id, deleted_at
            FROM messages
            WHERE id = ?
            LIMIT 1
          `,
          messageId,
        )
        .toArray();

      const message = rows[0];

      if (
        !message ||
        message.deleted_at ||
        message.sender_id === userId
      ) {
        continue;
      }

      this.sql.exec(
        `
          INSERT INTO message_reads (
            message_id,
            user_id,
            read_at
          )
          VALUES (?, ?, ?)
          ON CONFLICT(message_id, user_id) DO UPDATE SET
            read_at = excluded.read_at
        `,
        messageId,
        userId,
        readAt,
      );

      this.sql.exec(
        `
          UPDATE messages
          SET delivery_status = 'read'
          WHERE id = ?
            AND deleted_at IS NULL
        `,
        messageId,
      );

      receipts.push({
        messageId,
        userId,
        readAt,
      });
    }

    return receipts;
  }

  countUnread(userId: string): number {
    const rows = this.sql
      .exec<{ unread_count: number }>(
        `
          SELECT COUNT(*) AS unread_count
          FROM messages
          WHERE sender_id <> ?
            AND deleted_at IS NULL
            AND NOT EXISTS (
              SELECT 1
              FROM message_reads
              WHERE message_reads.message_id = messages.id
                AND message_reads.user_id = ?
            )
        `,
        userId,
        userId,
      )
      .toArray();

    return Number(rows[0]?.unread_count ?? 0);
  }

  listReadReceipts(
    messageId: string,
  ): ReadReceipt[] {
    return this.sql
      .exec<ReadRow>(
        `
          SELECT message_id, user_id, read_at
          FROM message_reads
          WHERE message_id = ?
          ORDER BY read_at ASC
        `,
        messageId,
      )
      .toArray()
      .map(mapReadReceipt);
  }
}
