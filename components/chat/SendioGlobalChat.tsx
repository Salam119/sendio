"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  createSendioConversation,
  getSendioChatSession,
  openSendioChatSocket,
  sendSendioSocketEvent,
  updateSendioChatSettings,
  type SendioChatParticipant,
  type SendioChatReaction,
  type SendioChatSession,
  type SendioIndexedConversation,
  type SendioServerSocketEvent,
  type SendioStoredMessage,
  type SendioStoredReaction,
} from "@/lib/sendio-chat-client";
import { supabase } from "@/lib/supabase";
import {
  readRegisteredSendioProfileTarget,
  SENDIO_CHAT_CLEAR_PROFILE,
  SENDIO_CHAT_REGISTER_PROFILE,
  type SendioProfileChatTarget,
} from "@/components/chat/sendio-chat-events";

type MessageReactions = Record<
  string,
  Record<string, SendioChatReaction | null>
>;

type ChatView = "list" | "conversation" | "guest";
type AuthState = "loading" | "guest" | "authenticated";

function getReactionIcon(reaction: SendioChatReaction): string {
  if (reaction === "like") return "👍";
  if (reaction === "dislike") return "👎";
  return "♥️";
}

function mapReactions(
  reactions: SendioStoredReaction[],
): MessageReactions {
  const mapped: MessageReactions = {};

  for (const reaction of reactions) {
    mapped[reaction.messageId] = {
      ...(mapped[reaction.messageId] ?? {}),
      [reaction.userId]: reaction.reaction,
    };
  }

  return mapped;
}

function getErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    chat_auth_required: "Connectez-vous pour utiliser le chat.",
    unauthorized: "Connectez-vous pour utiliser le chat.",
    identity_lookup_failed:
      "Votre identité Sendio n’a pas pu être vérifiée.",
    profile_not_found:
      "Votre profil Sendio n’a pas pu être chargé.",
    recipient_chat_disabled:
      "Ce profil n’accepte pas de nouvelles conversations.",
    recipient_not_found: "Ce profil est introuvable.",
    conversation_with_self_forbidden:
      "Vous ne pouvez pas ouvrir une conversation avec votre propre profil.",
    conversation_blocked: "Cette conversation est bloquée.",
    conversation_not_available:
      "Cette conversation n’est pas disponible.",
    chat_connection_failed: "Connexion au chat impossible.",
    chat_url_missing: "Le service de chat n’est pas configuré.",
    settings_update_failed:
      "Le réglage n’a pas pu être enregistré.",
    chat_user_suspended:
      "Votre accès à Sendio Chat a été suspendu par l’administration.",
    chat_user_deleted:
      "Votre accès à Sendio Chat a été supprimé par l’administration.",
  };

  return messages[code] ?? code;
}

function getRoleLabel(role: SendioChatParticipant["role"]): string {
  if (role === "company") return "Entreprise";
  if (role === "worker") return "Professionnel";
  if (role === "client") return "Client";
  return "Administration";
}

function formatConversationDate(value: string | null): string {
  if (!value) return "Nouvelle conversation";

  try {
    return new Intl.DateTimeFormat("fr-BE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Conversation";
  }
}

export default function SendioGlobalChat() {
  const [authState, setAuthState] =
    useState<AuthState>("loading");
  const [session, setSession] =
    useState<SendioChatSession | null>(null);
  const [profileTarget, setProfileTarget] =
    useState<SendioProfileChatTarget | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [view, setView] = useState<ChatView>("list");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isReportComposerOpen, setIsReportComposerOpen] =
    useState(false);
  const [reportReason, setReportReason] = useState("");
  const [activeMessageActionsId, setActiveMessageActionsId] =
    useState<string | null>(null);
  const [isArchived, setIsArchived] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [activeConversationId, setActiveConversationId] =
    useState<string | null>(null);
  const [activeParticipant, setActiveParticipant] =
    useState<SendioChatParticipant | null>(null);
  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);
  const [messages, setMessages] =
    useState<SendioStoredMessage[]>([]);
  const [messageReactions, setMessageReactions] =
    useState<MessageReactions>({});
  const [messageText, setMessageText] = useState("");
  const [isRecipientTyping, setIsRecipientTyping] =
    useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [noticeText, setNoticeText] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reportReasonInputRef = useRef<HTMLTextAreaElement | null>(
    null,
  );
  const currentUserIdRef = useRef<string | null>(null);
  const activeParticipantRef =
    useRef<SendioChatParticipant | null>(null);
  const soundEnabledRef = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const typingTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const previousUnreadRef = useRef<number | null>(null);
  const conversationVisibleRef = useRef(false);

  const totalUnread =
    session?.conversations.reduce(
      (total, conversation) => total + conversation.unreadCount,
      0,
    ) ?? 0;

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    activeParticipantRef.current = activeParticipant;
  }, [activeParticipant]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    conversationVisibleRef.current =
      isOpen && !isMinimized && view === "conversation";
  }, [isMinimized, isOpen, view]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isRecipientTyping]);

  function prepareArrivalSound(): void {
    if (audioRef.current || typeof Audio === "undefined") return;

    const audio = new Audio(
      "/sounds/Sendio_03_Signature_Chime.mp3",
    );
    audio.preload = "auto";
    audioRef.current = audio;
  }

  function playArrivalSound(): void {
    if (!soundEnabledRef.current) return;

    prepareArrivalSound();
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }

  async function refreshSession(
    announceUnread = false,
    accessToken?: string,
  ): Promise<SendioChatSession | null> {
    try {
      const nextSession = await getSendioChatSession(accessToken);
      const nextUnread = nextSession.conversations.reduce(
        (total, conversation) =>
          total + conversation.unreadCount,
        0,
      );

      if (
        announceUnread &&
        previousUnreadRef.current !== null &&
        nextUnread > previousUnreadRef.current &&
        nextSession.settings.soundEnabled
      ) {
        playArrivalSound();
      }

      previousUnreadRef.current = nextUnread;
      setAuthState("authenticated");
      setSession(nextSession);
      setSoundEnabled(nextSession.settings.soundEnabled);
      soundEnabledRef.current =
        nextSession.settings.soundEnabled;
      return nextSession;
    } catch (error) {
      const code =
        error instanceof Error ? error.message : "chat_request_failed";

      if (
        code === "chat_auth_required" ||
        code === "unauthorized"
      ) {
        previousUnreadRef.current = null;
        setAuthState("guest");
        setSession(null);
        return null;
      }

      setErrorCode(code);
      return null;
    }
  }

  function closeConversationSocket(): void {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    const socket = socketRef.current;
    socketRef.current = null;
    socket?.close();
    setIsReady(false);
    setIsConnecting(false);
    setIsRecipientTyping(false);
    setIsOptionsOpen(false);
    setIsReportComposerOpen(false);
    setReportReason("");
  }

  useEffect(() => {
    const profileTargetTimer = window.setTimeout(() => {
      setProfileTarget(readRegisteredSendioProfileTarget());
    }, 0);

    const initialSessionTimer = window.setTimeout(() => {
      void refreshSession(false);
    }, 0);

    const handleRegister = (event: Event) => {
      const customEvent =
        event as CustomEvent<SendioProfileChatTarget>;
      setProfileTarget(customEvent.detail);
    };

    const handleClear = (event: Event) => {
      const customEvent = event as CustomEvent<{
        recipientIdentifier: string;
      }>;
      setProfileTarget((current) =>
        current?.recipientIdentifier ===
        customEvent.detail.recipientIdentifier
          ? null
          : current,
      );
    };

    window.addEventListener(
      SENDIO_CHAT_REGISTER_PROFILE,
      handleRegister,
    );
    window.addEventListener(
      SENDIO_CHAT_CLEAR_PROFILE,
      handleClear,
    );

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (nextSession?.access_token) {
        window.setTimeout(() => {
          void refreshSession(false, nextSession.access_token);
        }, 0);
        return;
      }

      previousUnreadRef.current = null;
      setAuthState("guest");
      setSession(null);
      closeConversationSocket();
    });

    const pollingTimer = window.setInterval(() => {
      void refreshSession(true);
    }, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshSession(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener(
        SENDIO_CHAT_REGISTER_PROFILE,
        handleRegister,
      );
      window.removeEventListener(
        SENDIO_CHAT_CLEAR_PROFILE,
        handleClear,
      );
      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
      window.clearInterval(pollingTimer);
      window.clearTimeout(profileTargetTimer);
      window.clearTimeout(initialSessionTimer);
      subscription.unsubscribe();
      closeConversationSocket();
      audioRef.current = null;
    };
  }, []);

  function sendEvent(
    event: Parameters<typeof sendSendioSocketEvent>[1],
  ): boolean {
    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    sendSendioSocketEvent(socket, event);
    return true;
  }

  function resetConversationContent(): void {
    setMessages([]);
    setMessageReactions({});
    setMessageText("");
    setActiveMessageActionsId(null);
    setErrorCode(null);
    setNoticeText(null);
    setIsArchived(false);
    setIsBlocked(false);
    setCurrentUserId(null);
    currentUserIdRef.current = null;
  }

  function handleServerEvent(event: SendioServerSocketEvent): void {
    if (event.type === "ready") {
      currentUserIdRef.current = event.currentUserId;
      setCurrentUserId(event.currentUserId);
      setActiveConversationId(event.conversationId);
      setMessages(event.messages);
      setMessageReactions(mapReactions(event.reactions));
      setIsArchived(event.archived);
      setIsBlocked(event.blocked);
      setIsConnecting(false);
      setIsReady(true);
      setErrorCode(null);
      void refreshSession(false);
      return;
    }

    if (event.type === "message.created") {
      setMessages((current) => {
        const exists = current.some(
          (message) => message.id === event.message.id,
        );
        return exists ? current : [...current, event.message];
      });

      if (event.message.senderId !== currentUserIdRef.current) {
        playArrivalSound();

        if (conversationVisibleRef.current) {
          sendEvent({
            type: "messages.read",
            messageIds: [event.message.id],
          });
        }
      }

      void refreshSession(false);
      return;
    }

    if (event.type === "message.deleted") {
      setMessages((current) =>
        current.map((message) =>
          message.id === event.messageId
            ? {
                ...message,
                body: null,
                deletedAt: event.deletedAt,
                deletedBy: event.deletedBy,
              }
            : message,
        ),
      );
      return;
    }

    if (event.type === "reaction.updated") {
      setMessageReactions((current) => ({
        ...current,
        [event.messageId]: {
          ...(current[event.messageId] ?? {}),
          [event.userId]: event.reaction,
        },
      }));
      return;
    }

    if (event.type === "typing.changed") {
      if (event.userId !== currentUserIdRef.current) {
        setIsRecipientTyping(event.isTyping);
      }
      return;
    }

    if (event.type === "messages.read") {
      setMessages((current) =>
        current.map((message) =>
          event.messageIds.includes(message.id)
            ? { ...message, deliveryStatus: "read" }
            : message,
        ),
      );
      return;
    }

    if (event.type === "conversation.updated") {
      setIsArchived(event.status === "archived");
      void refreshSession(false);
      return;
    }

    if (event.type === "user.blocked") {
      if (
        event.userId === currentUserIdRef.current ||
        event.targetUserId === currentUserIdRef.current
      ) {
        setIsBlocked(true);
      }
      return;
    }

    if (event.type === "user.unblocked") {
      if (
        event.userId === currentUserIdRef.current ||
        event.targetUserId === currentUserIdRef.current
      ) {
        setIsBlocked(false);
      }
      return;
    }

    if (event.type === "report.created") {
      setIsOptionsOpen(false);
      setIsReportComposerOpen(false);
      setReportReason("");
      setNoticeText(
        "Signalement envoyé à l’administration avec une capture protégée de la conversation.",
      );
      window.setTimeout(() => setNoticeText(null), 5000);
      return;
    }

    if (event.type === "error") {
      setErrorCode(event.code);
      setIsConnecting(false);
    }
  }

  async function connectConversation(
    conversationId: string,
    participant: SendioChatParticipant,
  ): Promise<void> {
    closeConversationSocket();
    resetConversationContent();
    prepareArrivalSound();
    setActiveConversationId(conversationId);
    setActiveParticipant(participant);
    activeParticipantRef.current = participant;
    setView("conversation");
    setIsOpen(true);
    setIsMinimized(false);
    setIsConnecting(true);

    try {
      const socket = await openSendioChatSocket(conversationId);
      socketRef.current = socket;

      socket.addEventListener("message", (messageEvent) => {
        try {
          const event = JSON.parse(
            String(messageEvent.data),
          ) as SendioServerSocketEvent;
          handleServerEvent(event);
        } catch {
          setErrorCode("invalid_server_message");
        }
      });

      socket.addEventListener("error", () => {
        setIsConnecting(false);
        setIsReady(false);
        setErrorCode("chat_connection_failed");
      });

      socket.addEventListener("close", () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
          setIsConnecting(false);
          setIsReady(false);
          setIsRecipientTyping(false);
        }
      });
    } catch (error) {
      setIsConnecting(false);
      setIsReady(false);
      setErrorCode(
        error instanceof Error
          ? error.message
          : "chat_connection_failed",
      );
    }
  }

  async function openIndexedConversation(
    conversation: SendioIndexedConversation,
  ): Promise<void> {
    if (!conversation.otherParticipant) return;

    await connectConversation(
      conversation.id,
      conversation.otherParticipant,
    );
  }

  async function openProfileConversation(
    target: SendioProfileChatTarget,
  ): Promise<void> {
    setIsOpen(true);
    setIsMinimized(false);
    setView("conversation");
    setIsConnecting(true);
    setErrorCode(null);

    try {
      const conversation = await createSendioConversation(
        target.recipientType,
        target.recipientIdentifier,
      );

      setSoundEnabled(conversation.settings.soundEnabled);
      soundEnabledRef.current = conversation.settings.soundEnabled;
      await connectConversation(
        conversation.conversationId,
        conversation.recipient,
      );
      void refreshSession(false);
    } catch (error) {
      setIsConnecting(false);
      setIsReady(false);
      setActiveParticipant({
        userId: "",
        role: target.recipientType,
        displayName: target.recipientName,
        profileUrl: null,
        avatarUrl: target.recipientAvatarUrl,
      });
      setErrorCode(
        error instanceof Error
          ? error.message
          : "chat_connection_failed",
      );
    }
  }

  async function handleLauncherClick(): Promise<void> {
    prepareArrivalSound();

    if (isOpen) {
      setIsMinimized(false);
      return;
    }

    let nextSession = session;

    if (authState === "loading") {
      nextSession = await refreshSession(false);
    }

    if (authState === "guest" || !nextSession) {
      if (profileTarget && !profileTarget.isLoggedIn) {
        profileTarget.onGuestAttempt();
        return;
      }

      setView("guest");
      setIsOpen(true);
      setIsMinimized(false);
      return;
    }

    if (profileTarget) {
      await openProfileConversation(profileTarget);
      return;
    }

    const refreshed = await refreshSession(false);
    const conversations =
      refreshed?.conversations ?? nextSession.conversations;
    const firstUnread = conversations.find(
      (conversation) => conversation.unreadCount > 0,
    );

    if (firstUnread) {
      await openIndexedConversation(firstUnread);
      return;
    }

    setView("list");
    setIsOpen(true);
    setIsMinimized(false);
  }

  function backToConversationList(): void {
    closeConversationSocket();
    resetConversationContent();
    setActiveConversationId(null);
    setActiveParticipant(null);
    activeParticipantRef.current = null;
    setView("list");
    void refreshSession(false);
  }

  function closeChat(): void {
    closeConversationSocket();
    resetConversationContent();
    setActiveConversationId(null);
    setActiveParticipant(null);
    activeParticipantRef.current = null;
    setIsOpen(false);
    setIsMinimized(false);
    setView("list");
  }

  function stopTyping(): void {
    sendEvent({ type: "typing.stop" });
  }

  function handleInputChange(value: string): void {
    setMessageText(value);
    if (!isReady) return;

    sendEvent({
      type: value.trim() ? "typing.start" : "typing.stop",
    });

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = setTimeout(stopTyping, 900);
  }

  function handleSend(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const body = messageText.trim();

    if (!body || !isReady || isBlocked || isArchived) return;

    const sent = sendEvent({
      type: "message.send",
      clientId: crypto.randomUUID(),
      body,
    });

    if (!sent) return;
    setMessageText("");
    stopTyping();
  }

  function deleteMessage(messageId: string): void {
    const sent = sendEvent({
      type: "message.delete",
      messageId,
    });

    if (sent) {
      setActiveMessageActionsId(null);
    }
  }

  function toggleReaction(
    messageId: string,
    reaction: SendioChatReaction,
  ): void {
    const ownReaction = currentUserIdRef.current
      ? messageReactions[messageId]?.[currentUserIdRef.current]
      : null;

    const sent =
      ownReaction === reaction
        ? sendEvent({ type: "reaction.remove", messageId })
        : sendEvent({
            type: "reaction.set",
            messageId,
            reaction,
          });

    if (sent) {
      setActiveMessageActionsId(null);
    }
  }

  function toggleArchive(): void {
    sendEvent({
      type: isArchived
        ? "conversation.restore"
        : "conversation.archive",
    });
    setIsOptionsOpen(false);
    setIsReportComposerOpen(false);
    setReportReason("");
  }

  function toggleBlock(): void {
    const participant = activeParticipantRef.current;
    if (!participant?.userId) return;

    sendEvent({
      type: isBlocked
        ? "conversation.unblock"
        : "conversation.block",
      targetUserId: participant.userId,
    });
    setIsOptionsOpen(false);
    setIsReportComposerOpen(false);
    setReportReason("");
  }

  async function toggleSound(): Promise<void> {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEnabledRef.current = next;
    setIsOptionsOpen(false);
    setIsReportComposerOpen(false);
    setReportReason("");

    try {
      const response = await updateSendioChatSettings({
        soundEnabled: next,
      });
      setSoundEnabled(response.settings.soundEnabled);
      soundEnabledRef.current = response.settings.soundEnabled;
      setSession((current) =>
        current
          ? {
              ...current,
              settings: response.settings,
            }
          : current,
      );
    } catch {
      setSoundEnabled(!next);
      soundEnabledRef.current = !next;
      setErrorCode("settings_update_failed");
    }
  }

  function toggleOptionsMenu(): void {
    const next = !isOptionsOpen;
    setIsOptionsOpen(next);

    if (!next) {
      setIsReportComposerOpen(false);
      setReportReason("");
    }
  }

  function openReportComposer(): void {
    setIsReportComposerOpen(true);
    window.requestAnimationFrame(() => {
      reportReasonInputRef.current?.focus();
    });
  }

  function cancelReportConversation(): void {
    setIsReportComposerOpen(false);
    setReportReason("");
  }

  function submitReportConversation(): void {
    const reason = reportReason.replace(/\s+/g, " ").trim();
    if (!reason) return;

    const sent = sendEvent({
      type: "conversation.report",
      messageId: null,
      reason,
    });

    if (!sent) {
      setErrorCode("chat_connection_failed");
      return;
    }

    setIsReportComposerOpen(false);
    setIsOptionsOpen(false);
    setReportReason("");
  }

  if (!isOpen || isMinimized) {
    return (
      <button
        type="button"
        onClick={() => void handleLauncherClick()}
        className="sendio-chat-launcher"
        aria-label="Ouvrir Sendio Chat"
      >
        <span aria-hidden="true">💬</span>
        {totalUnread > 0 ? (
          <span className="sendio-chat-launcher-badge">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        ) : null}
      </button>
    );
  }

  const participantName =
    activeParticipant?.displayName ?? "Sendio Chat";
  const participantAvatar = activeParticipant?.avatarUrl ?? null;
  const participantProfileUrl =
    activeParticipant?.profileUrl ?? null;

  return (
    <section className="sendio-chat-shell" aria-label="Sendio Chat">
      <header className="sendio-chat-header">
        {view === "conversation" && participantProfileUrl ? (
          <a
            href={participantProfileUrl}
            className="sendio-chat-avatar"
            aria-label="Ouvrir le profil"
            style={
              participantAvatar
                ? {
                    backgroundImage: `url("${participantAvatar}")`,
                  }
                : undefined
            }
          >
            {!participantAvatar
              ? participantName.slice(0, 1).toUpperCase()
              : null}
          </a>
        ) : (
          <div
            className="sendio-chat-avatar"
            style={
              view === "conversation" && participantAvatar
                ? {
                    backgroundImage: `url("${participantAvatar}")`,
                  }
                : undefined
            }
          >
            {view === "conversation"
              ? participantAvatar
                ? null
                : participantName.slice(0, 1).toUpperCase()
              : "S"}
          </div>
        )}

        <div className="sendio-chat-header-copy">
          <p className="sendio-chat-title">
            {view === "conversation"
              ? participantName
              : "Sendio Chat"}
          </p>
          <p className="sendio-chat-status">
            {view === "conversation"
              ? isConnecting
                ? "Connexion..."
                : isReady
                  ? "En ligne"
                  : "Hors connexion"
              : totalUnread > 0
                ? `${totalUnread} message${totalUnread > 1 ? "s" : ""} non lu${totalUnread > 1 ? "s" : ""}`
                : "Vos conversations"}
          </p>
        </div>

        <div className="sendio-chat-header-actions">
          {view === "conversation" ? (
            <button
              type="button"
              onClick={backToConversationList}
              className="sendio-chat-header-button"
              aria-label="Retour aux conversations"
            >
              ←
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => window.location.assign("/")}
            className="sendio-chat-header-button"
            aria-label="Accueil"
          >
            🏠
          </button>
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="sendio-chat-header-button"
            aria-label="Réduire"
          >
            —
          </button>
          <button
            type="button"
            onClick={closeChat}
            className="sendio-chat-header-button"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      </header>

      {view === "guest" ? (
        <div className="sendio-chat-body sendio-chat-guest-view">
          <div className="sendio-chat-empty">
            Connectez-vous pour retrouver vos conversations Sendio.
          </div>
          <div className="sendio-chat-guest-actions">
            <a href="/login" className="sendio-chat-primary-link">
              Se connecter
            </a>
            <a href="/register" className="sendio-chat-secondary-link">
              Créer un compte
            </a>
          </div>
        </div>
      ) : null}

      {view === "list" ? (
        <div className="sendio-chat-body">
          {authState === "loading" ? (
            <div className="sendio-chat-empty">
              Chargement des conversations...
            </div>
          ) : session?.conversations.length ? (
            <div className="sendio-chat-conversation-list">
              {session.conversations.map((conversation) => {
                const participant = conversation.otherParticipant;
                if (!participant) return null;

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() =>
                      void openIndexedConversation(conversation)
                    }
                    className="sendio-chat-conversation-item"
                    data-unread={conversation.unreadCount > 0}
                  >
                    <span
                      className="sendio-chat-conversation-avatar"
                      style={
                        participant.avatarUrl
                          ? {
                              backgroundImage: `url("${participant.avatarUrl}")`,
                            }
                          : undefined
                      }
                    >
                      {!participant.avatarUrl
                        ? participant.displayName
                            .slice(0, 1)
                            .toUpperCase()
                        : null}
                    </span>
                    <span className="sendio-chat-conversation-copy">
                      <span className="sendio-chat-conversation-name">
                        {participant.displayName}
                      </span>
                      <span className="sendio-chat-conversation-meta">
                        {getRoleLabel(participant.role)} ·{" "}
                        {formatConversationDate(
                          conversation.lastMessageAt ??
                            conversation.createdAt,
                        )}
                      </span>
                    </span>
                    {conversation.unreadCount > 0 ? (
                      <span className="sendio-chat-unread-badge">
                        {conversation.unreadCount > 99
                          ? "99+"
                          : conversation.unreadCount}
                      </span>
                    ) : (
                      <span className="sendio-chat-open-arrow">›</span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="sendio-chat-empty">
              Aucune conversation pour le moment.
            </div>
          )}
        </div>
      ) : null}

      {view === "conversation" ? (
        <>
          <div className="sendio-chat-body">
            {messages.length === 0 && !isRecipientTyping ? (
              <div className="sendio-chat-empty">
                {isConnecting
                  ? "Connexion au chat..."
                  : errorCode
                    ? getErrorMessage(errorCode)
                    : "Commencez la conversation"}
              </div>
            ) : null}

            <div className="sendio-chat-messages">
              {messages.map((message) => {
                const isOwn = message.senderId === currentUserId;
                const reactions =
                  messageReactions[message.id] ?? {};
                const ownReaction = currentUserId
                  ? reactions[currentUserId]
                  : null;
                const visibleReactions = Array.from(
                  new Set(
                    Object.values(reactions).filter(
                      (
                        reaction,
                      ): reaction is SendioChatReaction =>
                        reaction !== null,
                    ),
                  ),
                );

                return (
                  <div
                    key={message.id}
                    className="sendio-chat-row"
                    data-own={isOwn}
                  >
                    <div className="sendio-chat-message-wrap">
                      <div
                        className="sendio-chat-bubble"
                        data-deleted={Boolean(message.deletedAt)}
                        data-actions-open={
                          activeMessageActionsId === message.id
                        }
                        dir="auto"
                        role={message.deletedAt ? undefined : "button"}
                        tabIndex={message.deletedAt ? undefined : 0}
                        aria-expanded={
                          message.deletedAt
                            ? undefined
                            : activeMessageActionsId === message.id
                        }
                        onClick={() => {
                          if (message.deletedAt) return;
                          setActiveMessageActionsId((current) =>
                            current === message.id
                              ? null
                              : message.id,
                          );
                        }}
                        onKeyDown={(event) => {
                          if (message.deletedAt) return;
                          if (
                            event.key !== "Enter" &&
                            event.key !== " "
                          ) {
                            return;
                          }

                          event.preventDefault();
                          setActiveMessageActionsId((current) =>
                            current === message.id
                              ? null
                              : message.id,
                          );
                        }}
                      >
                        {message.deletedAt
                          ? "Message supprimé"
                          : message.body}
                      </div>

                      {!message.deletedAt &&
                      activeMessageActionsId === message.id ? (
                        <div className="sendio-chat-message-actions">
                          {(
                            [
                              "like",
                              "dislike",
                              "heart",
                            ] as SendioChatReaction[]
                          ).map((reaction) => (
                            <button
                              key={reaction}
                              type="button"
                              onClick={() =>
                                toggleReaction(
                                  message.id,
                                  reaction,
                                )
                              }
                              className="sendio-chat-reaction-button"
                              data-active={ownReaction === reaction}
                              aria-label={reaction}
                            >
                              {getReactionIcon(reaction)}
                            </button>
                          ))}

                          {isOwn ? (
                            <button
                              type="button"
                              onClick={() =>
                                deleteMessage(message.id)
                              }
                              className="sendio-chat-delete-button"
                              aria-label="Supprimer le message"
                            >
                              🗑️
                            </button>
                          ) : null}
                        </div>
                      ) : null}

                      {!message.deletedAt &&
                      (visibleReactions.length > 0 || isOwn) ? (
                        <div className="sendio-chat-message-meta">
                          {visibleReactions.length > 0 ? (
                            <span className="sendio-chat-reaction-summary">
                              {visibleReactions
                                .map(getReactionIcon)
                                .join(" ")}
                            </span>
                          ) : null}

                          {isOwn ? (
                            <span
                              className="sendio-chat-receipt"
                              data-read={
                                message.deliveryStatus === "read"
                              }
                            >
                              {message.deliveryStatus === "read"
                                ? "✓✓"
                                : "✓"}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {isRecipientTyping ? (
              <div className="sendio-chat-typing">
                <span className="sendio-chat-typing-dot" />
                <span className="sendio-chat-typing-dot" />
                <span className="sendio-chat-typing-dot" />
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          {noticeText ? (
            <div className="sendio-chat-notice">
              {noticeText}
            </div>
          ) : null}

          {errorCode ? (
            <div className="sendio-chat-error">
              {getErrorMessage(errorCode)}
            </div>
          ) : null}

          <form onSubmit={handleSend} className="sendio-chat-composer">
            <div className="sendio-chat-options-wrap">
              <button
                type="button"
                onClick={toggleOptionsMenu}
                className="sendio-chat-options-button"
                aria-label="Options"
              >
                ⚙️
              </button>

              {isOptionsOpen ? (
                <div className="sendio-chat-options-menu">
                  <button
                    type="button"
                    onClick={() => void toggleSound()}
                    className="sendio-chat-option"
                  >
                    <span className="sendio-chat-option-icon">
                      {soundEnabled ? "🔔" : "🔕"}
                    </span>
                    <span className="sendio-chat-option-label">
                      {soundEnabled
                        ? "Couper le son"
                        : "Activer le son"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleArchive}
                    className="sendio-chat-option"
                  >
                    <span className="sendio-chat-option-icon">
                      📥
                    </span>
                    <span className="sendio-chat-option-label">
                      {isArchived ? "Restaurer" : "Archiver"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleBlock}
                    className="sendio-chat-option"
                  >
                    <span className="sendio-chat-option-icon">
                      🚫
                    </span>
                    <span className="sendio-chat-option-label">
                      {isBlocked ? "Débloquer" : "Bloquer"}
                    </span>
                  </button>
                  <div className="sendio-chat-report-anchor">
                    <button
                      type="button"
                      onClick={openReportComposer}
                      className="sendio-chat-option"
                      aria-expanded={isReportComposerOpen}
                      aria-controls="sendio-chat-report-composer"
                    >
                      <span className="sendio-chat-option-icon">
                        ⚠️
                      </span>
                      <span className="sendio-chat-option-label">
                        Signaler
                      </span>
                    </button>

                    {isReportComposerOpen ? (
                      <div
                        id="sendio-chat-report-composer"
                        className="sendio-chat-report-panel"
                        role="dialog"
                        aria-label="Signaler cette conversation"
                      >
                        <div className="sendio-chat-report-panel-title">
                          <span aria-hidden="true">⚠️</span>
                          <span>Signaler</span>
                        </div>
                        <p className="sendio-chat-report-panel-copy">
                          Décrivez brièvement le problème. La capture
                          protégée est jointe automatiquement.
                        </p>
                        <textarea
                          ref={reportReasonInputRef}
                          value={reportReason}
                          onChange={(event) =>
                            setReportReason(event.target.value)
                          }
                          className="sendio-chat-report-input"
                          placeholder="Motif du signalement"
                          rows={3}
                          maxLength={500}
                          dir="auto"
                        />
                        <div className="sendio-chat-report-actions">
                          <button
                            type="button"
                            onClick={cancelReportConversation}
                            className="sendio-chat-report-cancel"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={submitReportConversation}
                            className="sendio-chat-report-submit"
                            disabled={!reportReason.trim()}
                          >
                            Envoyer
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <textarea
              value={messageText}
              onChange={(event) =>
                handleInputChange(event.target.value)
              }
              className="sendio-chat-input"
              placeholder="Message"
              rows={1}
              maxLength={2000}
              disabled={!isReady || isBlocked || isArchived}
              dir="auto"
            />

            <button
              type="submit"
              className="sendio-chat-send-button"
              disabled={
                !messageText.trim() ||
                !isReady ||
                isBlocked ||
                isArchived
              }
              aria-label="Envoyer"
            >
              ▶️
            </button>
          </form>
        </>
      ) : null}
    </section>
  );
}
