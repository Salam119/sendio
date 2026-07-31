CREATE TABLE IF NOT EXISTS chat_socket_tickets (
  ticket_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  FOREIGN KEY (user_id)
    REFERENCES chat_users(user_id)
    ON DELETE CASCADE,
  FOREIGN KEY (conversation_id)
    REFERENCES conversations(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS chat_socket_tickets_expiry_idx
ON chat_socket_tickets(expires_at, consumed_at);
