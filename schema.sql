-- Bondly D1 Schema (2026-02-22)

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    provider TEXT,
    provider_id TEXT,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    email TEXT,
    role TEXT DEFAULT 'user',
    hearts INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 2. User Sessions (Refresh Tokens)
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    refresh_token TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    revoked INTEGER DEFAULT 0
);

-- 3. Wallet Transactions (Revenue Security & Balances)
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL,
    balance_after INTEGER,
    type TEXT NOT NULL, -- 'spend', 'purchase', 'bonus'
    reason TEXT,
    reference_id TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL
);

-- 4. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    plan_name TEXT NOT NULL, -- 'FREE', 'STARTER', 'CORE', 'PLUS'
    plan_price INTEGER DEFAULT 0,
    payment_id TEXT,
    status TEXT DEFAULT 'active',
    started_at TEXT NOT NULL,
    expires_at TEXT,
    created_at TEXT NOT NULL
);

-- 5. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    user_id TEXT REFERENCES users(id),
    ai_profile_id TEXT,
    role TEXT DEFAULT 'user', -- 'user' or 'assistant'
    body TEXT,
    tokens_used INTEGER DEFAULT 0,
    metadata TEXT, -- JSON: { audioUrl, gifUrl }
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at);

-- 6. User Visits (Event Logs & Auditing)
CREATE TABLE IF NOT EXISTS user_visits (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    session_id TEXT REFERENCES user_sessions(id),
    visit_type TEXT NOT NULL,
    ip_address TEXT,
    metadata TEXT, -- JSON
    created_at TEXT NOT NULL
);

-- 7. AI Profiles (Persona Management)
CREATE TABLE IF NOT EXISTS ai_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    model_name TEXT,
    system_prompt TEXT,
    avatar_url TEXT,
    visibility TEXT DEFAULT 'public',
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
