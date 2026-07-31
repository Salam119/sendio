import { ChatControlStore } from "./control-store";
import { ChatIndexStore } from "./index-store";
import { ChatMessageStore } from "./message-store";
import { ChatReactionStore } from "./reaction-store";
import { ChatReadStore } from "./read-store";
import {
  parseClientSocketEvent,
  SocketProtocolError,
} from "./socket-protocol";
import { ChatRoomStore } from "./storage";
import type { ChatWorkerEnv } from "./profile";
import type {
  ServerSocketEvent,
  SocketAttachment,
} from "./types";

type ChatSocketAttachment = SocketAttachment & {
  conversationId: string;
};

function getSocketAttachment(
  socket: WebSocket,
): ChatSocketAttachment {
  const attachment =
    socket.deserializeAttachment() as
      | Partial<ChatSocketAttachment>
      | null;

  if (
    !attachment ||
    typeof attachment.userId !== "string" ||
    typeof attachment.role !== "string" ||
    typeof attachment.conversationId !== "string"
  ) {
    throw new Error("socket_identity_missing");
  }

  return attachment as ChatSocketAttachment;
}

function getErrorCode(error: unknown): string {
  if (error instanceof SocketProtocolError) {
    return error.code;
  }

  if (
    error instanceof Error &&
    /^[a-z0-9_]+$/i.test(error.message)
  ) {
    return error.message;
  }

  return "chat_action_failed";
}

export class ChatRealtimeController {
  private readonly roomStore: ChatRoomStore;
  private readonly messageStore: ChatMessageStore;
  private readonly reactionStore: ChatReactionStore;
  private readonly readStore: ChatReadStore;
  private readonly controlStore: ChatControlStore;
  private readonly indexStore: ChatIndexStore;

  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: ChatWorkerEnv,
    private readonly sql: SqlStorage,
    private readonly conversationId: string,
  ) {
    this.roomStore = new ChatRoomStore(sql);
    this.messageStore = new ChatMessageStore(
      sql,
      conversationId,
    );
    this.reactionStore = new ChatReactionStore(sql);
    this.readStore = new ChatReadStore(sql);
    this.controlStore = new ChatControlStore(sql);
    this.indexStore = new ChatIndexStore(
      env.sendio_chat_index,
    );
  }

  async handleMessage(
    socket: WebSocket,
    rawMessage: string | ArrayBuffer,
  ): Promise<void> {
    try {
      const attachment = getSocketAttachment(socket);

      if (
        attachment.conversationId !==
        this.conversationId
      ) {
        throw new Error("conversation_mismatch");
      }

      const moderation = await this.indexStore.getUserModeration(
        attachment.userId,
      );

      if (moderation.status === "suspended") {
        throw new Error("chat_user_suspended");
      }

      if (moderation.status === "deleted") {
        throw new Error("chat_user_deleted");
      }

      const event = parseClientSocketEvent(rawMessage);

      switch (event.type) {
        case "message.send": {
          this.ensureConversationWritable();

          const members =
            this.roomStore.listParticipants();

          for (const member of members) {
            if (member.userId === attachment.userId) {
              continue;
            }

            const isBlocked =
              await this.indexStore.isBlockedBetween(
                attachment.userId,
                member.userId,
              );

            if (isBlocked) {
              throw new Error(
                "conversation_blocked",
              );
            }
          }

          this.controlStore.restoreForUser(
            attachment.userId,
          );

          await this.indexStore.setArchived(
            this.conversationId,
            attachment.userId,
            false,
          );

          const message =
            this.messageStore.createMessage(
              attachment.userId,
              event.body,
            );

          const recipientConnected =
            this.ctx
              .getWebSockets()
              .some((connectedSocket) => {
                try {
                  return (
                    getSocketAttachment(
                      connectedSocket,
                    ).userId !==
                    attachment.userId
                  );
                } catch {
                  return false;
                }
              });

          if (recipientConnected) {
            this.messageStore.updateDeliveryStatus(
              message.id,
              "delivered",
            );

            message.deliveryStatus = "delivered";
          }

          await this.indexStore.recordNewMessage(
            this.conversationId,
            attachment.userId,
          );

          this.broadcast({
            type: "message.created",
            message,
            clientId: event.clientId,
          });

          return;
        }

        case "message.delete": {
          const deletedMessage =
            this.messageStore.deleteOwnMessage(
              event.messageId,
              attachment.userId,
            );

          this.broadcast({
            type: "message.deleted",
            messageId: deletedMessage.id,
            deletedAt:
              deletedMessage.deletedAt ??
              new Date().toISOString(),
            deletedBy: attachment.userId,
          });

          return;
        }

        case "reaction.set": {
          const reaction =
            this.reactionStore.setReaction(
              event.messageId,
              attachment.userId,
              event.reaction,
            );

          this.broadcast({
            type: "reaction.updated",
            messageId: reaction.messageId,
            userId: reaction.userId,
            reaction: reaction.reaction,
          });

          return;
        }

        case "reaction.remove": {
          this.reactionStore.removeReaction(
            event.messageId,
            attachment.userId,
          );

          this.broadcast({
            type: "reaction.updated",
            messageId: event.messageId,
            userId: attachment.userId,
            reaction: null,
          });

          return;
        }

        case "typing.start":
        case "typing.stop": {
          this.broadcast(
            {
              type: "typing.changed",
              userId: attachment.userId,
              isTyping:
                event.type === "typing.start",
            },
            attachment.userId,
          );

          return;
        }

        case "messages.read": {
          const receipts =
            this.readStore.markMessagesRead(
              attachment.userId,
              event.messageIds,
            );

          if (receipts.length === 0) {
            return;
          }

          await this.indexStore.markConversationRead(
            this.conversationId,
            attachment.userId,
          );

          this.broadcast({
            type: "messages.read",
            userId: attachment.userId,
            messageIds: receipts.map(
              (receipt) => receipt.messageId,
            ),
            readAt: receipts[0].readAt,
          });

          return;
        }

        case "conversation.archive": {
          this.controlStore.archiveForUser(
            attachment.userId,
          );

          await this.indexStore.setArchived(
            this.conversationId,
            attachment.userId,
            true,
          );

          this.send(socket, {
            type: "conversation.updated",
            status: "archived",
          });

          return;
        }

        case "conversation.restore": {
          this.controlStore.restoreForUser(
            attachment.userId,
          );

          await this.indexStore.setArchived(
            this.conversationId,
            attachment.userId,
            false,
          );

          this.send(socket, {
            type: "conversation.updated",
            status: "active",
          });

          return;
        }

        case "conversation.block": {
          this.controlStore.blockUser(
            attachment.userId,
            event.targetUserId,
          );

          await this.indexStore.blockUser(
            attachment.userId,
            event.targetUserId,
          );

          this.broadcast({
            type: "user.blocked",
            userId: attachment.userId,
            targetUserId: event.targetUserId,
          });

          return;
        }

        case "conversation.unblock": {
          this.controlStore.unblockUser(
            attachment.userId,
            event.targetUserId,
          );

          await this.indexStore.unblockUser(
            attachment.userId,
            event.targetUserId,
          );

          this.broadcast({
            type: "user.unblocked",
            userId: attachment.userId,
            targetUserId: event.targetUserId,
          });

          return;
        }

        case "conversation.report": {
          if (
            event.messageId &&
            !this.messageStore.getMessage(
              event.messageId,
            )
          ) {
            throw new Error("message_not_found");
          }

          const participants =
            this.roomStore.listParticipants();
          const reportedUser = participants.find(
            (participant) =>
              participant.userId !== attachment.userId,
          );
          const evidence = {
            capturedAt: new Date().toISOString(),
            participants,
            messages: this.messageStore
              .listMessages(30)
              .map((message) => ({
                id: message.id,
                senderId: message.senderId,
                body: message.body,
                createdAt: message.createdAt,
                deletedAt: message.deletedAt,
              })),
          };

          const reportId =
            await this.indexStore.createReport(
              this.conversationId,
              attachment.userId,
              reportedUser?.userId ?? null,
              event.messageId,
              event.reason,
              evidence,
            );

          this.send(socket, {
            type: "report.created",
            reportId,
          });

          return;
        }

        case "ping": {
          this.send(socket, {
            type: "pong",
          });

          return;
        }
      }
    } catch (error) {
      this.send(socket, {
        type: "error",
        code: getErrorCode(error),
      });
    }
  }

  handleClose(socket: WebSocket): void {
    try {
      const attachment = getSocketAttachment(socket);

      this.broadcast(
        {
          type: "typing.changed",
          userId: attachment.userId,
          isTyping: false,
        },
        attachment.userId,
      );
    } catch {
      return;
    }
  }

  private ensureConversationWritable(): void {
    const conversation =
      this.roomStore.getConversation();

    if (!conversation) {
      throw new Error("conversation_not_found");
    }

    if (
      conversation.status === "frozen" ||
      conversation.status === "closed"
    ) {
      throw new Error(
        "conversation_not_available",
      );
    }
  }

  private broadcast(
    event: ServerSocketEvent,
    excludedUserId?: string,
  ): void {
    for (const socket of this.ctx.getWebSockets()) {
      try {
        const attachment =
          getSocketAttachment(socket);

        if (
          excludedUserId &&
          attachment.userId === excludedUserId
        ) {
          continue;
        }

        this.send(socket, event);
      } catch {
        continue;
      }
    }
  }

  private send(
    socket: WebSocket,
    event: ServerSocketEvent,
  ): void {
    try {
      socket.send(JSON.stringify(event));
    } catch {
      return;
    }
  }
}
