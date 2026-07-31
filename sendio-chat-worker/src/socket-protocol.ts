import type {
  ChatReaction,
  ClientSocketEvent,
} from "./types";

const ALLOWED_REACTIONS = new Set<ChatReaction>([
  "like",
  "dislike",
  "heart",
]);

const FORBIDDEN_MEDIA_FIELDS = new Set([
  "file",
  "files",
  "image",
  "images",
  "video",
  "videos",
  "audio",
  "audios",
  "media",
  "attachment",
  "attachments",
]);

export class SocketProtocolError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function requireString(
  value: unknown,
  code: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new SocketProtocolError(code);
  }

  const cleaned = value.trim();

  if (!cleaned || cleaned.length > maxLength) {
    throw new SocketProtocolError(code);
  }

  return cleaned;
}

function rejectMediaFields(
  value: Record<string, unknown>,
): void {
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_MEDIA_FIELDS.has(key.toLowerCase())) {
      throw new SocketProtocolError(
        "media_upload_not_supported",
      );
    }
  }
}

export function parseClientSocketEvent(
  message: string | ArrayBuffer,
): ClientSocketEvent {
  if (typeof message !== "string") {
    throw new SocketProtocolError(
      "binary_messages_not_supported",
    );
  }

  if (message.length > 12_000) {
    throw new SocketProtocolError(
      "socket_event_too_large",
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(message);
  } catch {
    throw new SocketProtocolError("invalid_json");
  }

  if (!isRecord(parsed)) {
    throw new SocketProtocolError(
      "invalid_socket_event",
    );
  }

  rejectMediaFields(parsed);

  const type = parsed.type;

  if (typeof type !== "string") {
    throw new SocketProtocolError(
      "event_type_required",
    );
  }

  switch (type) {
    case "message.send":
      return {
        type,
        clientId: requireString(
          parsed.clientId,
          "client_id_required",
          100,
        ),
        body: requireString(
          parsed.body,
          "message_body_invalid",
          2000,
        ),
      };

    case "message.delete":
      return {
        type,
        messageId: requireString(
          parsed.messageId,
          "message_id_required",
          100,
        ),
      };

    case "reaction.set": {
      const reaction = parsed.reaction;

      if (
        typeof reaction !== "string" ||
        !ALLOWED_REACTIONS.has(
          reaction as ChatReaction,
        )
      ) {
        throw new SocketProtocolError(
          "reaction_invalid",
        );
      }

      return {
        type,
        messageId: requireString(
          parsed.messageId,
          "message_id_required",
          100,
        ),
        reaction: reaction as ChatReaction,
      };
    }

    case "reaction.remove":
      return {
        type,
        messageId: requireString(
          parsed.messageId,
          "message_id_required",
          100,
        ),
      };

    case "typing.start":
    case "typing.stop":
    case "conversation.archive":
    case "conversation.restore":
    case "ping":
      return { type };

    case "messages.read": {
      if (!Array.isArray(parsed.messageIds)) {
        throw new SocketProtocolError(
          "message_ids_required",
        );
      }

      const messageIds = [
        ...new Set(
          parsed.messageIds.map((messageId) =>
            requireString(
              messageId,
              "message_id_invalid",
              100,
            ),
          ),
        ),
      ].slice(0, 100);

      return {
        type,
        messageIds,
      };
    }

    case "conversation.block":
    case "conversation.unblock":
      return {
        type,
        targetUserId: requireString(
          parsed.targetUserId,
          "target_user_id_required",
          100,
        ),
      };

    case "conversation.report": {
      const messageId =
        parsed.messageId === null ||
        parsed.messageId === undefined
          ? null
          : requireString(
              parsed.messageId,
              "message_id_invalid",
              100,
            );

      return {
        type,
        messageId,
        reason: requireString(
          parsed.reason,
          "report_reason_invalid",
          500,
        ),
      };
    }

    default:
      throw new SocketProtocolError(
        "event_type_not_supported",
      );
  }
}
