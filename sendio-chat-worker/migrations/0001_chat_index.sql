PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS chat_users (
  user_id TEXT PRIMARY KEY,
  role TEXT NOT NULL
    CHECK (role IN ('client', 'worker', 'company', 'admin', 'super_admin')),
  display_name TEXT NOT NULL,
  profile_url TEXT,
  avatar_url TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_chat_settings (
  user_id TEXT PRIMARY KEY,
  profile_chat_enabled INTEGER NOT NULL
    CHECK (profile_chat_enabled IN (0, 1)),
  sound_enabled INTEGER NOT NULL DEFAULT 1
    CHECK (sound_enabled IN (0, 1)),
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id)
    REFERENCES chat_users(user_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  conversation_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'frozen', 'closed')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_message_at TEXT,
  last_sender_id TEXT,
  FOREIGN KEY (created_by)
    REFERENCES chat_users(user_id),
  FOREIGN KEY (last_sender_id)
    REFERENCES chat_users(user_id)
);

CREATE INDEX IF NOT EXISTS conversations_updated_at_idx
ON conversations(updated_at DESC);

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL
    CHECK (role IN ('client', 'worker', 'company', 'admin', 'super_admin')),
  joined_at TEXT NOT NULL,
  archived_at TEXT,
  last_read_at TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0
    CHECK (unread_count >= 0),
  PRIMARY KEY (conversation_id, user_id),
  FOREIGN KEY (conversation_id)
    REFERENCES conversations(id)
    ON DELETE CASCADE,
  FOREIGN KEY (user_id)
    REFERENCES chat_users(user_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS conversation_members_user_idx
ON conversation_members(user_id, archived_at, conversation_id);

CREATE TABLE IF NOT EXISTS chat_blocks (
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id),
  FOREIGN KEY (blocker_id)
    REFERENCES chat_users(user_id)
    ON DELETE CASCADE,
  FOREIGN KEY (blocked_id)
    REFERENCES chat_users(user_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_reports (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  message_id TEXT,
  reporter_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT,
  FOREIGN KEY (conversation_id)
    REFERENCES conversations(id)
    ON DELETE CASCADE,
  FOREIGN KEY (reporter_id)
    REFERENCES chat_users(user_id),
  FOREIGN KEY (resolved_by)
    REFERENCES chat_users(user_id)
);

CREATE INDEX IF NOT EXISTS chat_reports_status_idx
ON chat_reports(status, created_at);

CREATE TABLE IF NOT EXISTS admin_chat_actions (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_user_id TEXT,
  target_message_id TEXT,
  reason TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id)
    REFERENCES conversations(id)
    ON DELETE CASCADE,
  FOREIGN KEY (admin_id)
    REFERENCES chat_users(user_id),
  FOREIGN KEY (target_user_id)
    REFERENCES chat_users(user_id)
);

CREATE INDEX IF NOT EXISTS admin_chat_actions_conversation_idx
ON admin_chat_actions(conversation_id, created_at DESC);
