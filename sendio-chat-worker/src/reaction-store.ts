import type {
  ChatReaction,
  StoredReaction,
} from "./types";

type ReactionRow = {
  message_id: string;
  user_id: string;
  reaction: ChatReaction;
  created_at: string;
  updated_at: string;
};

function mapReaction(row: ReactionRow): StoredReaction {
  return {
    messageId: row.message_id,
    userId: row.user_id,
    reaction: row.reaction,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ChatReactionStore {
  constructor(private readonly sql: SqlStorage) {}

  setReaction(
    messageId: string,
    userId: string,
    reaction: ChatReaction,
  ): StoredReaction {
    const messageRows = this.sql
      .exec<{ deleted_at: string | null }>(
        `
          SELECT deleted_at
          FROM messages
          WHERE id = ?
          LIMIT 1
        `,
        messageId,
      )
      .toArray();

    const message = messageRows[0];

    if (!message) {
      throw new Error("message_not_found");
    }

    if (message.deleted_at) {
      throw new Error("message_deleted");
    }

    const now = new Date().toISOString();

    this.sql.exec(
      `
        INSERT INTO reactions (
          message_id,
          user_id,
          reaction,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(message_id, user_id) DO UPDATE SET
          reaction = excluded.reaction,
          updated_at = excluded.updated_at
      `,
      messageId,
      userId,
      reaction,
      now,
      now,
    );

    const storedReaction = this.getReaction(messageId, userId);

    if (!storedReaction) {
      throw new Error("reaction_not_saved");
    }

    return storedReaction;
  }

  removeReaction(
    messageId: string,
    userId: string,
  ): boolean {
    const existing = this.getReaction(messageId, userId);

    if (!existing) {
      return false;
    }

    this.sql.exec(
      `
        DELETE FROM reactions
        WHERE message_id = ?
          AND user_id = ?
      `,
      messageId,
      userId,
    );

    return true;
  }

  getReaction(
    messageId: string,
    userId: string,
  ): StoredReaction | null {
    const rows = this.sql
      .exec<ReactionRow>(
        `
          SELECT
            message_id,
            user_id,
            reaction,
            created_at,
            updated_at
          FROM reactions
          WHERE message_id = ?
            AND user_id = ?
          LIMIT 1
        `,
        messageId,
        userId,
      )
      .toArray();

    const reaction = rows[0];

    return reaction ? mapReaction(reaction) : null;
  }

  listReactionsForMessages(
    messageIds: string[],
  ): StoredReaction[] {
    const uniqueMessageIds = [
      ...new Set(messageIds.filter(Boolean)),
    ].slice(0, 100);

    if (uniqueMessageIds.length === 0) return [];

    const placeholders = uniqueMessageIds
      .map(() => "?")
      .join(", ");

    return this.sql
      .exec<ReactionRow>(
        `
          SELECT
            message_id,
            user_id,
            reaction,
            created_at,
            updated_at
          FROM reactions
          WHERE message_id IN (${placeholders})
          ORDER BY created_at ASC
        `,
        ...uniqueMessageIds,
      )
      .toArray()
      .map(mapReaction);
  }

  listMessageReactions(
    messageId: string,
  ): StoredReaction[] {
    return this.sql
      .exec<ReactionRow>(
        `
          SELECT
            message_id,
            user_id,
            reaction,
            created_at,
            updated_at
          FROM reactions
          WHERE message_id = ?
          ORDER BY created_at ASC
        `,
        messageId,
      )
      .toArray()
      .map(mapReaction);
  }
}
