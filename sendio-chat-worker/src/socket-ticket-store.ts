export type ConsumedSocketTicket = {
  userId: string;
  conversationId: string;
};

type TicketRow = {
  user_id: string;
  conversation_id: string;
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(
    bytes,
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function hashTicket(
  ticket: string,
): Promise<string> {
  const encoded = new TextEncoder().encode(ticket);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoded,
  );

  return bytesToHex(new Uint8Array(digest));
}

function createRawTicket(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  return bytesToHex(bytes);
}

export class SocketTicketStore {
  constructor(private readonly database: D1Database) {}

  async createTicket(
    userId: string,
    conversationId: string,
  ): Promise<{
    ticket: string;
    expiresAt: string;
  }> {
    const membership = await this.database
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

    if (membership?.allowed !== 1) {
      throw new Error("conversation_access_forbidden");
    }

    const ticket = createRawTicket();
    const ticketHash = await hashTicket(ticket);
    const createdAt = new Date();
    const expiresAt = new Date(
      createdAt.getTime() + 2 * 60 * 1000,
    );

    await this.database
      .prepare(
        `
          INSERT INTO chat_socket_tickets (
            ticket_hash,
            user_id,
            conversation_id,
            created_at,
            expires_at,
            consumed_at
          )
          VALUES (?, ?, ?, ?, ?, NULL)
        `,
      )
      .bind(
        ticketHash,
        userId,
        conversationId,
        createdAt.toISOString(),
        expiresAt.toISOString(),
      )
      .run();

    return {
      ticket,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async consumeTicket(
    ticket: string,
  ): Promise<ConsumedSocketTicket | null> {
    if (
      !/^[a-f0-9]{64}$/i.test(ticket)
    ) {
      return null;
    }

    const ticketHash = await hashTicket(ticket);
    const consumedAt = new Date().toISOString();

    const row = await this.database
      .prepare(
        `
          UPDATE chat_socket_tickets
          SET consumed_at = ?
          WHERE ticket_hash = ?
            AND consumed_at IS NULL
            AND expires_at > ?
          RETURNING user_id, conversation_id
        `,
      )
      .bind(
        consumedAt,
        ticketHash,
        consumedAt,
      )
      .first<TicketRow>();

    if (!row) {
      return null;
    }

    return {
      userId: row.user_id,
      conversationId: row.conversation_id,
    };
  }
}
