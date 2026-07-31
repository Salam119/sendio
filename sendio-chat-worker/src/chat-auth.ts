import {
  verifySupabaseSession,
  type VerifiedSession,
} from "./auth";
import { ChatIndexStore } from "./index-store";
import {
  loadChatParticipant,
  type ChatWorkerEnv,
} from "./profile";
import type { ChatParticipant } from "./types";

export type AuthenticatedChatContext = {
  session: VerifiedSession;
  participant: ChatParticipant;
  indexStore: ChatIndexStore;
};

export async function authenticateChatRequest(
  request: Request,
  env: ChatWorkerEnv,
): Promise<AuthenticatedChatContext | null> {
  const session = await verifySupabaseSession(
    request,
    env.SUPABASE_URL,
  );

  if (!session) {
    return null;
  }

  const indexStore = new ChatIndexStore(
    env.sendio_chat_index,
  );

  let participant = await indexStore.getUser(
    session.userId,
  );

  if (!participant) {
    participant = await loadChatParticipant(
      env,
      request,
      session,
    );

    await indexStore.upsertUser(participant);
  }

  const moderation = await indexStore.getUserModeration(
    participant.userId,
  );

  if (moderation.status === "suspended") {
    throw new Error("chat_user_suspended");
  }

  if (moderation.status === "deleted") {
    throw new Error("chat_user_deleted");
  }

  return {
    session,
    participant,
    indexStore,
  };
}
