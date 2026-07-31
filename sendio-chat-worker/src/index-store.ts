import type {
  ChatParticipant,
  ChatRole,
  ConversationStatus,
} from "./types";

export type ChatUserSettings = {
  profileChatEnabled: boolean;
  soundEnabled: boolean;
};

export type ChatModerationStatus =
  | "active"
  | "suspended"
  | "deleted";

export type ChatEvidenceMessage = {
  id: string;
  senderId: string;
  body: string | null;
  createdAt: string;
  deletedAt: string | null;
};

export type ChatReportEvidence = {
  capturedAt: string;
  participants: ChatParticipant[];
  messages: ChatEvidenceMessage[];
};

export type AdminChatReport = {
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
  reporter: ChatParticipant | null;
  reportedUser: ChatParticipant | null;
  evidence: ChatReportEvidence | null;
  reportedUserStatus: ChatModerationStatus;
};

export type ChatUserModeration = {
  userId: string;
  status: ChatModerationStatus;
  reason: string | null;
  actionBy: string | null;
  updatedAt: string | null;
};

export type IndexedConversation = {
  id: string;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  lastSenderId: string | null;
  unreadCount: number;
  archivedAt: string | null;
  otherParticipant: ChatParticipant | null;
};

type UserRow = {
  user_id: string;
  role: ChatRole;
  display_name: string;
  profile_url: string | null;
  avatar_url: string | null;
};

type SettingsRow = {
  profile_chat_enabled: number;
  sound_enabled: number;
};

type ConversationRow = {
  id: string;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  last_sender_id: string | null;
  unread_count: number;
  archived_at: string | null;
  other_user_id: string | null;
  other_role: ChatRole | null;
  other_display_name: string | null;
  other_profile_url: string | null;
  other_avatar_url: string | null;
};


type ModerationRow = {
  user_id: string;
  status: ChatModerationStatus;
  reason: string | null;
  action_by: string | null;
  updated_at: string;
};

type AdminReportRow = {
  id: string;
  conversation_id: string;
  message_id: string | null;
  reporter_id: string;
  reported_user_id: string | null;
  reason: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  evidence_json: string | null;
  reporter_role: ChatRole | null;
  reporter_name: string | null;
  reporter_profile_url: string | null;
  reporter_avatar_url: string | null;
  reported_role: ChatRole | null;
  reported_name: string | null;
  reported_profile_url: string | null;
  reported_avatar_url: string | null;
  reported_user_status: ChatModerationStatus | null;
};

function mapUser(row: UserRow): ChatParticipant {
  return {
    userId: row.user_id,
    role: row.role,
    displayName: row.display_name,
    profileUrl: row.profile_url,
    avatarUrl: row.avatar_url,
  };
}

function createConversationKey(
  firstUserId: string,
  secondUserId: string,
): string {
  return [firstUserId, secondUserId].sort().join(":");
}

export class ChatIndexStore {
  constructor(private readonly database: D1Database) {}

  async upsertUser(user: ChatParticipant): Promise<void> {
    const now = new Date().toISOString();

    await this.database
      .prepare(
        `
          INSERT INTO chat_users (
            user_id,
            role,
            display_name,
            profile_url,
            avatar_url,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            role = excluded.role,
            display_name = excluded.display_name,
            profile_url = excluded.profile_url,
            avatar_url = excluded.avatar_url,
            updated_at = excluded.updated_at
        `,
      )
      .bind(
        user.userId,
        user.role,
        user.displayName,
        user.profileUrl,
        user.avatarUrl,
        now,
      )
      .run();

    await this.database
      .prepare(
        `
          INSERT INTO user_chat_settings (
            user_id,
            profile_chat_enabled,
            sound_enabled,
            updated_at
          )
          VALUES (?, 1, 1, ?)
          ON CONFLICT(user_id) DO NOTHING
        `,
      )
      .bind(user.userId, now)
      .run();
  }

  async getUser(
    userId: string,
  ): Promise<ChatParticipant | null> {
    const row = await this.database
      .prepare(
        `
          SELECT
            user_id,
            role,
            display_name,
            profile_url,
            avatar_url
          FROM chat_users
          WHERE user_id = ?
          LIMIT 1
        `,
      )
      .bind(userId)
      .first<UserRow>();

    return row ? mapUser(row) : null;
  }

  async getSettings(
    userId: string,
  ): Promise<ChatUserSettings> {
    const row = await this.database
      .prepare(
        `
          SELECT
            profile_chat_enabled,
            sound_enabled
          FROM user_chat_settings
          WHERE user_id = ?
          LIMIT 1
        `,
      )
      .bind(userId)
      .first<SettingsRow>();

    return {
      profileChatEnabled:
        row?.profile_chat_enabled === 1,
      soundEnabled:
        row?.sound_enabled !== 0,
    };
  }

  async updateSettings(
    userId: string,
    settings: Partial<ChatUserSettings>,
  ): Promise<ChatUserSettings> {
    const current = await this.getSettings(userId);
    const next: ChatUserSettings = {
      profileChatEnabled:
        settings.profileChatEnabled ??
        current.profileChatEnabled,
      soundEnabled:
        settings.soundEnabled ??
        current.soundEnabled,
    };

    await this.database
      .prepare(
        `
          UPDATE user_chat_settings
          SET
            profile_chat_enabled = ?,
            sound_enabled = ?,
            updated_at = ?
          WHERE user_id = ?
        `,
      )
      .bind(
        next.profileChatEnabled ? 1 : 0,
        next.soundEnabled ? 1 : 0,
        new Date().toISOString(),
        userId,
      )
      .run();

    return next;
  }

  async getOrCreateConversation(
    creator: ChatParticipant,
    recipient: ChatParticipant,
  ): Promise<string> {
    if (creator.userId === recipient.userId) {
      throw new Error("conversation_with_self_forbidden");
    }

    await this.upsertUser(creator);
    await this.upsertUser(recipient);

    const conversationKey = createConversationKey(
      creator.userId,
      recipient.userId,
    );

    const existing = await this.database
      .prepare(
        `
          SELECT id
          FROM conversations
          WHERE conversation_key = ?
          LIMIT 1
        `,
      )
      .bind(conversationKey)
      .first<{ id: string }>();

    if (existing?.id) {
      return existing.id;
    }

    const conversationId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.database.batch([
      this.database
        .prepare(
          `
            INSERT INTO conversations (
              id,
              conversation_key,
              status,
              created_by,
              created_at,
              updated_at,
              last_message_at,
              last_sender_id
            )
            VALUES (?, ?, 'active', ?, ?, ?, NULL, NULL)
          `,
        )
        .bind(
          conversationId,
          conversationKey,
          creator.userId,
          now,
          now,
        ),
      this.database
        .prepare(
          `
            INSERT INTO conversation_members (
              conversation_id,
              user_id,
              role,
              joined_at,
              archived_at,
              last_read_at,
              unread_count
            )
            VALUES (?, ?, ?, ?, NULL, NULL, 0)
          `,
        )
        .bind(
          conversationId,
          creator.userId,
          creator.role,
          now,
        ),
      this.database
        .prepare(
          `
            INSERT INTO conversation_members (
              conversation_id,
              user_id,
              role,
              joined_at,
              archived_at,
              last_read_at,
              unread_count
            )
            VALUES (?, ?, ?, ?, NULL, NULL, 0)
          `,
        )
        .bind(
          conversationId,
          recipient.userId,
          recipient.role,
          now,
        ),
    ]);

    return conversationId;
  }

  async isConversationMember(
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    const row = await this.database
      .prepare(
        `
          SELECT 1 AS allowed
          FROM conversation_members
          WHERE conversation_id = ?
            AND user_id = ?
          LIMIT 1
        `,
      )
      .bind(conversationId, userId)
      .first<{ allowed: number }>();

    return row?.allowed === 1;
  }

  async listConversationMembers(
    conversationId: string,
  ): Promise<ChatParticipant[]> {
    const result = await this.database
      .prepare(
        `
          SELECT
            users.user_id,
            users.role,
            users.display_name,
            users.profile_url,
            users.avatar_url
          FROM conversation_members AS members
          INNER JOIN chat_users AS users
            ON users.user_id = members.user_id
          WHERE members.conversation_id = ?
          ORDER BY members.joined_at ASC
        `,
      )
      .bind(conversationId)
      .all<UserRow>();

    return result.results.map(mapUser);
  }

  async listUserConversations(
    userId: string,
  ): Promise<IndexedConversation[]> {
    const result = await this.database
      .prepare(
        `
          SELECT
            conversations.id,
            conversations.status,
            conversations.created_at,
            conversations.updated_at,
            conversations.last_message_at,
            conversations.last_sender_id,
            self_member.unread_count,
            self_member.archived_at,
            other_user.user_id AS other_user_id,
            other_user.role AS other_role,
            other_user.display_name AS other_display_name,
            other_user.profile_url AS other_profile_url,
            other_user.avatar_url AS other_avatar_url
          FROM conversation_members AS self_member
          INNER JOIN conversations
            ON conversations.id = self_member.conversation_id
          LEFT JOIN conversation_members AS other_member
            ON other_member.conversation_id = conversations.id
            AND other_member.user_id <> self_member.user_id
          LEFT JOIN chat_users AS other_user
            ON other_user.user_id = other_member.user_id
          WHERE self_member.user_id = ?
          ORDER BY
            COALESCE(
              conversations.last_message_at,
              conversations.created_at
            ) DESC
        `,
      )
      .bind(userId)
      .all<ConversationRow>();

    return result.results.map((row) => ({
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastMessageAt: row.last_message_at,
      lastSenderId: row.last_sender_id,
      unreadCount: Number(row.unread_count),
      archivedAt: row.archived_at,
      otherParticipant:
        row.other_user_id &&
        row.other_role &&
        row.other_display_name
          ? {
              userId: row.other_user_id,
              role: row.other_role,
              displayName: row.other_display_name,
              profileUrl: row.other_profile_url,
              avatarUrl: row.other_avatar_url,
            }
          : null,
    }));
  }

  async recordNewMessage(
    conversationId: string,
    senderId: string,
  ): Promise<void> {
    const now = new Date().toISOString();

    await this.database.batch([
      this.database
        .prepare(
          `
            UPDATE conversations
            SET
              updated_at = ?,
              last_message_at = ?,
              last_sender_id = ?
            WHERE id = ?
          `,
        )
        .bind(now, now, senderId, conversationId),
      this.database
        .prepare(
          `
            UPDATE conversation_members
            SET
              unread_count = unread_count + 1,
              archived_at = NULL
            WHERE conversation_id = ?
              AND user_id <> ?
          `,
        )
        .bind(conversationId, senderId),
    ]);
  }

  async markConversationRead(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    await this.database
      .prepare(
        `
          UPDATE conversation_members
          SET
            unread_count = 0,
            last_read_at = ?
          WHERE conversation_id = ?
            AND user_id = ?
        `,
      )
      .bind(
        new Date().toISOString(),
        conversationId,
        userId,
      )
      .run();
  }

  async setArchived(
    conversationId: string,
    userId: string,
    archived: boolean,
  ): Promise<void> {
    await this.database
      .prepare(
        `
          UPDATE conversation_members
          SET archived_at = ?
          WHERE conversation_id = ?
            AND user_id = ?
        `,
      )
      .bind(
        archived ? new Date().toISOString() : null,
        conversationId,
        userId,
      )
      .run();
  }

  async isBlockedBetween(
    firstUserId: string,
    secondUserId: string,
  ): Promise<boolean> {
    const row = await this.database
      .prepare(
        `
          SELECT COUNT(*) AS blocked_count
          FROM chat_blocks
          WHERE (
            blocker_id = ?
            AND blocked_id = ?
          )
          OR (
            blocker_id = ?
            AND blocked_id = ?
          )
        `,
      )
      .bind(
        firstUserId,
        secondUserId,
        secondUserId,
        firstUserId,
      )
      .first<{ blocked_count: number }>();

    return Number(row?.blocked_count ?? 0) > 0;
  }

  async blockUser(
    blockerId: string,
    blockedId: string,
  ): Promise<void> {
    if (blockerId === blockedId) {
      throw new Error("cannot_block_self");
    }

    await this.database
      .prepare(
        `
          INSERT INTO chat_blocks (
            blocker_id,
            blocked_id,
            created_at
          )
          VALUES (?, ?, ?)
          ON CONFLICT(blocker_id, blocked_id) DO NOTHING
        `,
      )
      .bind(
        blockerId,
        blockedId,
        new Date().toISOString(),
      )
      .run();
  }

  async unblockUser(
    blockerId: string,
    blockedId: string,
  ): Promise<void> {
    await this.database
      .prepare(
        `
          DELETE FROM chat_blocks
          WHERE blocker_id = ?
            AND blocked_id = ?
        `,
      )
      .bind(blockerId, blockedId)
      .run();
  }
  async createReport(
    conversationId: string,
    reporterId: string,
    reportedUserId: string | null,
    messageId: string | null,
    reason: string,
    evidence: ChatReportEvidence,
  ): Promise<string> {
    const cleanedReason = reason.replace(/\s+/g, " ").trim();

    if (!cleanedReason) {
      throw new Error("report_reason_required");
    }

    if (cleanedReason.length > 500) {
      throw new Error("report_reason_too_long");
    }

    const isMember = await this.isConversationMember(
      conversationId,
      reporterId,
    );

    if (!isMember) {
      throw new Error("conversation_access_forbidden");
    }

    const reportId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.database
      .prepare(
        `
          INSERT INTO chat_reports (
            id,
            conversation_id,
            message_id,
            reporter_id,
            reported_user_id,
            reason,
            status,
            created_at,
            updated_at,
            resolved_at,
            resolved_by,
            evidence_json
          )
          VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, NULL, NULL, ?)
        `,
      )
      .bind(
        reportId,
        conversationId,
        messageId,
        reporterId,
        reportedUserId,
        cleanedReason,
        now,
        now,
        JSON.stringify(evidence),
      )
      .run();

    return reportId;
  }

  async getUserModeration(
    userId: string,
  ): Promise<ChatUserModeration> {
    const row = await this.database
      .prepare(
        `
          SELECT user_id, status, reason, action_by, updated_at
          FROM chat_user_moderation
          WHERE user_id = ?
          LIMIT 1
        `,
      )
      .bind(userId)
      .first<ModerationRow>();

    return row
      ? {
          userId: row.user_id,
          status: row.status,
          reason: row.reason,
          actionBy: row.action_by,
          updatedAt: row.updated_at,
        }
      : {
          userId,
          status: "active",
          reason: null,
          actionBy: null,
          updatedAt: null,
        };
  }

  async setUserModeration(
    userId: string,
    status: ChatModerationStatus,
    adminId: string,
    reason: string | null,
  ): Promise<ChatUserModeration> {
    const now = new Date().toISOString();
    const cleanedReason = reason?.replace(/\s+/g, " ").trim() || null;

    await this.database
      .prepare(
        `
          INSERT INTO chat_user_moderation (
            user_id,
            status,
            reason,
            action_by,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            status = excluded.status,
            reason = excluded.reason,
            action_by = excluded.action_by,
            updated_at = excluded.updated_at
        `,
      )
      .bind(userId, status, cleanedReason, adminId, now, now)
      .run();

    return this.getUserModeration(userId);
  }

  async listAdminReports(): Promise<AdminChatReport[]> {
    const result = await this.database
      .prepare(
        `
          SELECT
            reports.id,
            reports.conversation_id,
            reports.message_id,
            reports.reporter_id,
            reports.reported_user_id,
            reports.reason,
            reports.status,
            reports.created_at,
            reports.updated_at,
            reports.resolved_at,
            reports.resolved_by,
            reports.evidence_json,
            reporter.role AS reporter_role,
            reporter.display_name AS reporter_name,
            reporter.profile_url AS reporter_profile_url,
            reporter.avatar_url AS reporter_avatar_url,
            reported.role AS reported_role,
            reported.display_name AS reported_name,
            reported.profile_url AS reported_profile_url,
            reported.avatar_url AS reported_avatar_url,
            COALESCE(moderation.status, 'active') AS reported_user_status
          FROM chat_reports AS reports
          LEFT JOIN chat_users AS reporter
            ON reporter.user_id = reports.reporter_id
          LEFT JOIN chat_users AS reported
            ON reported.user_id = reports.reported_user_id
          LEFT JOIN chat_user_moderation AS moderation
            ON moderation.user_id = reports.reported_user_id
          ORDER BY
            CASE reports.status
              WHEN 'open' THEN 0
              WHEN 'reviewing' THEN 1
              ELSE 2
            END,
            reports.created_at DESC
        `,
      )
      .all<AdminReportRow>();

    return result.results.map((row) => {
      let evidence: ChatReportEvidence | null = null;

      if (row.evidence_json) {
        try {
          evidence = JSON.parse(row.evidence_json) as ChatReportEvidence;
        } catch {
          evidence = null;
        }
      }

      return {
        id: row.id,
        conversationId: row.conversation_id,
        messageId: row.message_id,
        reporterId: row.reporter_id,
        reportedUserId: row.reported_user_id,
        reason: row.reason,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        resolvedAt: row.resolved_at,
        resolvedBy: row.resolved_by,
        reporter:
          row.reporter_role && row.reporter_name
            ? {
                userId: row.reporter_id,
                role: row.reporter_role,
                displayName: row.reporter_name,
                profileUrl: row.reporter_profile_url,
                avatarUrl: row.reporter_avatar_url,
              }
            : null,
        reportedUser:
          row.reported_user_id && row.reported_role && row.reported_name
            ? {
                userId: row.reported_user_id,
                role: row.reported_role,
                displayName: row.reported_name,
                profileUrl: row.reported_profile_url,
                avatarUrl: row.reported_avatar_url,
              }
            : null,
        evidence,
        reportedUserStatus: row.reported_user_status ?? "active",
      };
    });
  }

  async updateReportStatus(
    reportId: string,
    status: "open" | "reviewing" | "resolved" | "dismissed",
    adminId: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    const isFinal = status === "resolved" || status === "dismissed";

    await this.database
      .prepare(
        `
          UPDATE chat_reports
          SET
            status = ?,
            updated_at = ?,
            resolved_at = ?,
            resolved_by = ?
          WHERE id = ?
        `,
      )
      .bind(
        status,
        now,
        isFinal ? now : null,
        isFinal ? adminId : null,
        reportId,
      )
      .run();
  }

  async recordAdminAction(
    conversationId: string,
    adminId: string,
    action: string,
    targetUserId: string | null,
    targetMessageId: string | null,
    reason: string | null,
  ): Promise<void> {
    await this.database
      .prepare(
        `
          INSERT INTO admin_chat_actions (
            id,
            conversation_id,
            admin_id,
            action,
            target_user_id,
            target_message_id,
            reason,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .bind(
        crypto.randomUUID(),
        conversationId,
        adminId,
        action,
        targetUserId,
        targetMessageId,
        reason?.replace(/\s+/g, " ").trim() || null,
        new Date().toISOString(),
      )
      .run();
  }
  async findConversationBetween(
    firstUserId: string,
    secondUserId: string,
  ): Promise<string | null> {
    if (firstUserId === secondUserId) {
      return null;
    }

    const conversationKey = createConversationKey(
      firstUserId,
      secondUserId,
    );

    const row = await this.database
      .prepare(
        `
          SELECT id
          FROM conversations
          WHERE conversation_key = ?
          LIMIT 1
        `,
      )
      .bind(conversationKey)
      .first<{ id: string }>();

    return row?.id ?? null;
  }
}
