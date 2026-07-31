import type {
  ChatParticipant,
  ChatRole,
  ConversationStatus,
} from "./types";

export type ChatReport = {
  id: string;
  reporterId: string;
  messageId: string | null;
  reason: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  createdAt: string;
};

type ReportRow = {
  id: string;
  reporter_id: string;
  message_id: string | null;
  reason: string;
  status: ChatReport["status"];
  created_at: string;
};

const ADMIN_ROLES: ChatRole[] = [
  "admin",
  "super_admin",
];

function cleanReason(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function mapReport(row: ReportRow): ChatReport {
  return {
    id: row.id,
    reporterId: row.reporter_id,
    messageId: row.message_id,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
  };
}

export class ChatControlStore {
  constructor(private readonly sql: SqlStorage) {}

  archiveForUser(userId: string): void {
    const archivedAt = new Date().toISOString();

    this.ensureParticipantExists(userId);

    this.sql.exec(
      `
        UPDATE participants
        SET archived_at = ?
        WHERE user_id = ?
      `,
      archivedAt,
      userId,
    );
  }

  restoreForUser(userId: string): void {
    this.ensureParticipantExists(userId);

    this.sql.exec(
      `
        UPDATE participants
        SET archived_at = NULL
        WHERE user_id = ?
      `,
      userId,
    );
  }

  isArchivedForUser(userId: string): boolean {
    const rows = this.sql
      .exec<{ archived_at: string | null }>(
        `
          SELECT archived_at
          FROM participants
          WHERE user_id = ?
          LIMIT 1
        `,
        userId,
      )
      .toArray();

    return Boolean(rows[0]?.archived_at);
  }

  blockUser(
    blockerId: string,
    blockedId: string,
  ): void {
    if (blockerId === blockedId) {
      throw new Error("cannot_block_self");
    }

    this.ensureParticipantExists(blockerId);
    this.ensureParticipantExists(blockedId);

    this.sql.exec(
      `
        INSERT INTO blocked_users (
          blocker_id,
          blocked_id,
          created_at
        )
        VALUES (?, ?, ?)
        ON CONFLICT(blocker_id, blocked_id) DO NOTHING
      `,
      blockerId,
      blockedId,
      new Date().toISOString(),
    );
  }

  unblockUser(
    blockerId: string,
    blockedId: string,
  ): void {
    this.sql.exec(
      `
        DELETE FROM blocked_users
        WHERE blocker_id = ?
          AND blocked_id = ?
      `,
      blockerId,
      blockedId,
    );
  }

  isBlockedBetween(
    firstUserId: string,
    secondUserId: string,
  ): boolean {
    const rows = this.sql
      .exec<{ blocked_count: number }>(
        `
          SELECT COUNT(*) AS blocked_count
          FROM blocked_users
          WHERE (
            blocker_id = ?
            AND blocked_id = ?
          )
          OR (
            blocker_id = ?
            AND blocked_id = ?
          )
        `,
        firstUserId,
        secondUserId,
        secondUserId,
        firstUserId,
      )
      .toArray();

    return Number(rows[0]?.blocked_count ?? 0) > 0;
  }

  createReport(
    reporterId: string,
    messageId: string | null,
    reason: string,
  ): ChatReport {
    this.ensureParticipantExists(reporterId);

    const cleanedReason = cleanReason(reason);

    if (!cleanedReason) {
      throw new Error("report_reason_required");
    }

    if (cleanedReason.length > 500) {
      throw new Error("report_reason_too_long");
    }

    if (messageId) {
      const messageRows = this.sql
        .exec<{ id: string }>(
          `
            SELECT id
            FROM messages
            WHERE id = ?
            LIMIT 1
          `,
          messageId,
        )
        .toArray();

      if (!messageRows[0]) {
        throw new Error("message_not_found");
      }
    }

    const report: ChatReport = {
      id: crypto.randomUUID(),
      reporterId,
      messageId,
      reason: cleanedReason,
      status: "open",
      createdAt: new Date().toISOString(),
    };

    this.sql.exec(
      `
        INSERT INTO reports (
          id,
          reporter_id,
          message_id,
          reason,
          status,
          created_at,
          resolved_at,
          resolved_by
        )
        VALUES (?, ?, ?, ?, 'open', ?, NULL, NULL)
      `,
      report.id,
      report.reporterId,
      report.messageId,
      report.reason,
      report.createdAt,
    );

    return report;
  }

  listOpenReports(): ChatReport[] {
    return this.sql
      .exec<ReportRow>(
        `
          SELECT
            id,
            reporter_id,
            message_id,
            reason,
            status,
            created_at
          FROM reports
          WHERE status IN ('open', 'reviewing')
          ORDER BY created_at ASC
        `,
      )
      .toArray()
      .map(mapReport);
  }

  setConversationStatus(
    admin: ChatParticipant,
    status: ConversationStatus,
    reason: string | null,
  ): void {
    if (!ADMIN_ROLES.includes(admin.role)) {
      throw new Error("admin_action_forbidden");
    }

    const conversationRows = this.sql
      .exec<{ id: string }>(
        `
          SELECT id
          FROM conversation
          LIMIT 1
        `,
      )
      .toArray();

    const conversation = conversationRows[0];

    if (!conversation) {
      throw new Error("conversation_not_found");
    }

    const now = new Date().toISOString();

    this.sql.exec(
      `
        UPDATE conversation
        SET
          status = ?,
          updated_at = ?
        WHERE id = ?
      `,
      status,
      now,
      conversation.id,
    );

    this.recordAdminAction(
      admin.userId,
      `conversation.${status}`,
      null,
      null,
      reason,
    );
  }

  recordAdminMessageDeletion(
    admin: ChatParticipant,
    messageId: string,
    reason: string,
  ): void {
    if (!ADMIN_ROLES.includes(admin.role)) {
      throw new Error("admin_action_forbidden");
    }

    const cleanedReason = cleanReason(reason);

    if (!cleanedReason) {
      throw new Error("admin_reason_required");
    }

    this.recordAdminAction(
      admin.userId,
      "message.delete",
      null,
      messageId,
      cleanedReason,
    );
  }

  private recordAdminAction(
    adminId: string,
    action: string,
    targetUserId: string | null,
    targetMessageId: string | null,
    reason: string | null,
  ): void {
    this.sql.exec(
      `
        INSERT INTO admin_actions (
          id,
          admin_id,
          action,
          target_user_id,
          target_message_id,
          reason,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      crypto.randomUUID(),
      adminId,
      action,
      targetUserId,
      targetMessageId,
      reason,
      new Date().toISOString(),
    );
  }

  private ensureParticipantExists(userId: string): void {
    const rows = this.sql
      .exec<{ user_id: string }>(
        `
          SELECT user_id
          FROM participants
          WHERE user_id = ?
          LIMIT 1
        `,
        userId,
      )
      .toArray();

    if (!rows[0]) {
      throw new Error("participant_not_found");
    }
  }
}
