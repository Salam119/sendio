"use client";

import { useEffect } from "react";
import {
  clearSendioProfileTarget,
  registerSendioProfileTarget,
} from "@/components/chat/sendio-chat-events";

type SendioChatWindowProps = {
  recipientType: "company" | "worker";
  recipientIdentifier: string;
  recipientName: string;
  recipientAvatarUrl?: string | null;
  isLoggedIn: boolean;
  onGuestAttempt: () => void;
};

export default function SendioChatWindow({
  recipientType,
  recipientIdentifier,
  recipientName,
  recipientAvatarUrl = null,
  isLoggedIn,
  onGuestAttempt,
}: SendioChatWindowProps) {
  useEffect(() => {
    registerSendioProfileTarget({
      recipientType,
      recipientIdentifier,
      recipientName,
      recipientAvatarUrl,
      isLoggedIn,
      onGuestAttempt,
    });

    return () => {
      clearSendioProfileTarget(recipientIdentifier);
    };
  }, [
    isLoggedIn,
    onGuestAttempt,
    recipientAvatarUrl,
    recipientIdentifier,
    recipientName,
    recipientType,
  ]);

  return null;
}
