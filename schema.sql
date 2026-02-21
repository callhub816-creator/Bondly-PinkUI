-- Bondly D1 Schema (2026-02-22)

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    profile_data TEXT, -- JSON: { bio, avatarUrl, last_chat_date, long_term_memory, bond_level }
    last_login_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 2. Wallets Table (Currency Management)
CREATE TABLE IF NOT EXISTS wallets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    hearts INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    updated_at TEXT NOT NULL
);

-- 3. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    plan_name TEXT NOT NULL, -- 'FREE', 'STARTER', 'CORE', 'PLUS'
    status TEXT DEFAULT 'active',
    started_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- 4. User Sessions (Refresh Tokens)
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    refresh_token TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    revoked INTEGER DEFAULT 0
);

-- 5. Wallet Audit Log (Revenue Security)
CREATE TABLE IF NOT EXISTS wallet_audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'spend', 'purchase', 'bonus'
    reason TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL
);

-- 6. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_handle TEXT,
    body TEXT,
    role TEXT DEFAULT 'user', -- 'user' or 'assistant'
    metadata TEXT, -- JSON: { audioUrl, gifUrl }
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at);

-- 7. Event Logs
CREATE TABLE IF NOT EXISTS event_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    event_type TEXT NOT NULL,
    metadata TEXT, -- JSON
    created_at TEXT NOT NULL
);

-- 8. Processed Orders (Idempotency)
CREATE TABLE IF NOT EXISTS processed_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    order_id TEXT NOT NULL UNIQUE,
    amount INTEGER, -- in paise
    created_at TEXT NOT NULL
);
