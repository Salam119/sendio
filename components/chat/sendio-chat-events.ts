export const SENDIO_CHAT_REGISTER_PROFILE =
  "sendio-chat:register-profile";
export const SENDIO_CHAT_CLEAR_PROFILE =
  "sendio-chat:clear-profile";

export type SendioProfileChatTarget = {
  recipientType: "company" | "worker";
  recipientIdentifier: string;
  recipientName: string;
  recipientAvatarUrl: string | null;
  isLoggedIn: boolean;
  onGuestAttempt: () => void;
};

type SendioChatWindowState = Window & {
  __sendioProfileChatTarget?: SendioProfileChatTarget;
};

export function readRegisteredSendioProfileTarget():
  | SendioProfileChatTarget
  | null {
  if (typeof window === "undefined") return null;

  return (
    (window as SendioChatWindowState).__sendioProfileChatTarget ??
    null
  );
}

export function registerSendioProfileTarget(
  target: SendioProfileChatTarget,
): void {
  if (typeof window === "undefined") return;

  (window as SendioChatWindowState).__sendioProfileChatTarget =
    target;
  window.dispatchEvent(
    new CustomEvent<SendioProfileChatTarget>(
      SENDIO_CHAT_REGISTER_PROFILE,
      { detail: target },
    ),
  );
}

export function clearSendioProfileTarget(
  recipientIdentifier: string,
): void {
  if (typeof window === "undefined") return;

  const chatWindow = window as SendioChatWindowState;
  const current = chatWindow.__sendioProfileChatTarget;

  if (current?.recipientIdentifier === recipientIdentifier) {
    delete chatWindow.__sendioProfileChatTarget;
  }

  window.dispatchEvent(
    new CustomEvent<{ recipientIdentifier: string }>(
      SENDIO_CHAT_CLEAR_PROFILE,
      { detail: { recipientIdentifier } },
    ),
  );
}
