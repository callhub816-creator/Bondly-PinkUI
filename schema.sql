-- Bondly D1 Schema

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    profile_data TEXT, -- JSON: { bio, avatarUrl, hearts, subscription, streak, last_chat_date }
    created_at TEXT NOT NULL
);
-- Index for fast user lookup (usually primary key is enough)

-- 2. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    body TEXT,
    created_at TEXT NOT NULL,
    role TEXT DEFAULT 'user', -- 'user' or 'assistant'
    sender_handle TEXT, -- Human readable username for easy DB audits
    metadata TEXT, -- JSON for extra info
    is_deleted INTEGER DEFAULT 0
);
-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created ON messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id_created ON messages(sender_id, created_at); -- For Rate Limiting

-- 3. Processed Orders (Revenue Security)
CREATE TABLE IF NOT EXISTS processed_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    order_id TEXT NOT NULL UNIQUE,
    amount INTEGER,
    created_at TEXT
);
-- Index for Idempotency Check
CREATE INDEX IF NOT EXISTS idx_processed_orders_order_id ON processed_orders(order_id);

-- 4. Audit Logs
CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT,
    details TEXT, -- JSON
    created_at TEXT
);
-- 5. Sessions (Refresh Tokens)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    refresh_token TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    revoked INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh ON sessions(refresh_token);

-- 6. Wallet Audit Log (Strict Fraud Monitoring)
CREATE TABLE IF NOT EXISTS wallet_audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    change_amount INTEGER NOT NULL,
    new_balance INTEGER NOT NULL,
    action TEXT NOT NULL, -- 'spend', 'purchase', 'bonus'
    reason TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wallet_audit_user ON wallet_audit_log(user_id);
