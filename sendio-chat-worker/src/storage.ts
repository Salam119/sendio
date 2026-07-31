import type {
  ChatParticipant,
  ChatRole,
  ConversationRecord,
  ConversationStatus,
} from "./types";

const CHAT_ROOM_SCHEMA = [
  `
    CREATE TABLE IF NOT EXISTS conversation (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'archived', 'frozen', 'closed')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS participants (
      user_id TEXT PRIMARY KEY,
      role TEXT NOT NULL
        CHECK (role IN ('client', 'worker', 'company', 'admin', 'super_admin')),
      display_name TEXT NOT NULL,
      profile_url TEXT,
      avatar_url TEXT,
      joined_at TEXT NOT NULL,
      archived_at TEXT
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      body TEXT,
      created_at TEXT NOT NULL,
      edited_at TEXT,
      deleted_at TEXT,
      deleted_by TEXT,
      delivery_status TEXT NOT NULL DEFAULT 'sent'
        CHECK (delivery_status IN ('sent', 'delivered', 'read')),
      FOREIGN KEY (sender_id) REFERENCES participants(user_id)
    )
  `,
  `
    CREATE INDEX IF NOT EXISTS messages_created_at_idx
    ON messages(created_at)
  `,
  `
    CREATE TABLE IF NOT EXISTS reactions (
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reaction TEXT NOT NULL
        CHECK (reaction IN ('like', 'dislike', 'heart')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (message_id, user_id),
      FOREIGN KEY (message_id) REFERENCES messages(id),
      FOREIGN KEY (user_id) REFERENCES participants(user_id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS message_reads (
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      read_at TEXT NOT NULL,
      PRIMARY KEY (message_id, user_id),
      FOREIGN KEY (message_id) REFERENCES messages(id),
      FOREIGN KEY (user_id) REFERENCES participants(user_id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS blocked_users (
      blocker_id TEXT NOT NULL,
      blocked_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (blocker_id, blocked_id),
      FOREIGN KEY (blocker_id) REFERENCES participants(user_id),
      FOREIGN KEY (blocked_id) REFERENCES participants(user_id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL,
      message_id TEXT,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      resolved_by TEXT,
      FOREIGN KEY (reporter_id) REFERENCES participants(user_id),
      FOREIGN KEY (message_id) REFERENCES messages(id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS admin_actions (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_user_id TEXT,
      target_message_id TEXT,
      reason TEXT,
      created_at TEXT NOT NULL
    )
  `,
] as const;

type ConversationRow = {
  id: string;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
};

type ParticipantRow = {
  user_id: string;
  role: ChatRole;
  display_name: string;
  profile_url: string | null;
  avatar_url: string | null;
};

function mapConversation(row: ConversationRow): ConversationRecord {
  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapParticipant(row: ParticipantRow): ChatParticipant {
  return {
    userId: row.user_id,
    role: row.role,
    displayName: row.display_name,
    profileUrl: row.profile_url,
    avatarUrl: row.avatar_url,
  };
}

export class ChatRoomStore {
  constructor(private readonly sql: SqlStorage) {}

  initialize(): void {
    this.sql.exec("PRAGMA foreign_keys = ON");

    for (const statement of CHAT_ROOM_SCHEMA) {
      this.sql.exec(statement);
    }
  }

  ensureConversation(conversationId: string): ConversationRecord {
    const now = new Date().toISOString();

    this.sql.exec(
      `
        INSERT INTO conversation (
          id,
          status,
          created_at,
          updated_at
        )
        VALUES (?, 'active', ?, ?)
        ON CONFLICT(id) DO NOTHING
      `,
      conversationId,
      now,
      now,
    );

    const rows = this.sql
      .exec<ConversationRow>(
        `
          SELECT id, status, created_at, updated_at
          FROM conversation
          WHERE id = ?
          LIMIT 1
        `,
        conversationId,
      )
      .toArray();

    const conversation = rows[0];

    if (!conversation) {
      throw new Error("conversation_not_created");
    }

    return mapConversation(conversation);
  }

  getConversation(): ConversationRecord | null {
    const rows = this.sql
      .exec<ConversationRow>(
        `
          SELECT id, status, created_at, updated_at
          FROM conversation
          LIMIT 1
        `,
      )
      .toArray();

    const conversation = rows[0];

    return conversation ? mapConversation(conversation) : null;
  }

  upsertParticipant(participant: ChatParticipant): void {
    const now = new Date().toISOString();

    this.sql.exec(
      `
        INSERT INTO participants (
          user_id,
          role,
          display_name,
          profile_url,
          avatar_url,
          joined_at,
          archived_at
        )
        VALUES (?, ?, ?, ?, ?, ?, NULL)
        ON CONFLICT(user_id) DO UPDATE SET
          role = excluded.role,
          display_name = excluded.display_name,
          profile_url = excluded.profile_url,
          avatar_url = excluded.avatar_url
      `,
      participant.userId,
      participant.role,
      participant.displayName,
      participant.profileUrl,
      participant.avatarUrl,
      now,
    );
  }

  getParticipant(userId: string): ChatParticipant | null {
    const rows = this.sql
      .exec<ParticipantRow>(
        `
          SELECT
            user_id,
            role,
            display_name,
            profile_url,
            avatar_url
          FROM participants
          WHERE user_id = ?
          LIMIT 1
        `,
        userId,
      )
      .toArray();

    const participant = rows[0];

    return participant ? mapParticipant(participant) : null;
  }

  listParticipants(): ChatParticipant[] {
    return this.sql
      .exec<ParticipantRow>(
        `
          SELECT
            user_id,
            role,
            display_name,
            profile_url,
            avatar_url
          FROM participants
          ORDER BY joined_at ASC
        `,
      )
      .toArray()
      .map(mapParticipant);
  }
}
