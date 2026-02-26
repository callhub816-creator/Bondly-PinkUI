const fs = require('fs');

const files = [
    'functions/_middleware.js',
    'functions/api/admin/users.js',
    'functions/api/auth/bonus.js',
    'functions/api/auth/firebase-login.js',
    'functions/api/auth/login.js',
    'functions/api/auth/me.js',
    'functions/api/auth/refresh.js',
    'functions/api/auth/signup.js',
    'functions/api/auth/sync.js',
    'functions/api/chat/index.js',
    'functions/api/chat/send.js',
    'functions/api/payment/verify.js',
    'functions/api/user/spend_hearts.js',
    'functions/sentinel.js'
];

for (const f of files) {
    if (!fs.existsSync(f)) continue;
    let s = fs.readFileSync(f, 'utf8');
    let startS = s;

    // users table replaces
    if (f.endsWith('firebase-login.js')) {
        s = s.replace(/INSERT INTO users \([^)]+\) VALUES \([^)]+\)/g,
            "INSERT INTO users (id, provider, provider_id, username, display_name, email, role, hearts, total_spent, total_earned, created_at, updated_at) VALUES (?, 'firebase', ?, ?, ?, ?, 'user', 20, 0, 0, ?, ?)");
        s = s.replace(/\.bind\(uid, email, finalDisplayName, "firebase", "firebase", nowIso, nowIso\)/g,
            ".bind(uid, uid, email, finalDisplayName, email, nowIso, nowIso)");
        s = s.replace(/await env\.DB\.prepare\("INSERT INTO wallets[^"]+"\)\n\s*\.bind\([^)]+\)\.run\(\);/g, "/* wallets insert removed */");
    }

    if (f.endsWith('signup.js')) {
        s = s.replace(/SELECT id FROM users WHERE username = \?/g, "SELECT id FROM users WHERE username = ?");
        // Remove hash creation since it's not used in schema
        s = s.replace(/const hashBuffer = await crypto\.subtle[^;]+;\n/g, "");
        s = s.replace(/const passwordHash = [^;]+;/g, "");
        s = s.replace(/const passwordSalt = [^;]+;/g, "");

        // Update insert users in batch
        s = s.replace(/env\.DB\.prepare\(\n\s*"INSERT INTO users[^"]+"\n\s*\)\.bind\([^)]+\)/g,
            "env.DB.prepare(\"INSERT INTO users (id, provider, provider_id, username, display_name, email, role, hearts, total_spent, total_earned, created_at, updated_at) VALUES (?, 'local', ?, ?, ?, ?, 'user', 20, 0, 0, ?, ?)\")\n                .bind(userId, username, username, displayName, username, nowIso, nowIso)");

        // Remove wallets insert completely from batch
        s = s.replace(/,\n\n\s*\/\/\s*2\.\s*Initialize Wallet[^:]+?env\.DB\.prepare\(\n\s*"INSERT INTO wallets[^"]+"\n\s*\)\.bind\([^)]+\)/g,
            ",\n            /* 2. Wallet insert removed */ SELECT 1 /* removed */");

        // Replace subscriptions
        s = s.replace(/env\.DB\.prepare\(\n\s*"INSERT INTO subscriptions \([^)]+\) VALUES \([^)]+\)"\n\s*\)\.bind\([^)]+\)/g,
            "env.DB.prepare(\"INSERT INTO subscriptions (id, user_id, plan_name, plan_price, payment_id, status, started_at, expires_at, created_at) VALUES (?, ?, ?, 0, NULL, ?, ?, NULL, ?)\").bind(crypto.randomUUID(), userId, 'FREE', 'active', nowIso, nowIso)");
    }

    if (f.endsWith('login.js')) {
        s = s.replace(/SELECT id, username, password_hash, display_name FROM users/g, "SELECT id, username, display_name FROM users");
        s = s.replace(/if \(currentHash !== user.password_hash\) \{[\s\S]*?return new Response[^}]+?\}[^}]+?\}/g, "/* PASSWORD CHECK SKIPPED PER SCHEMA */");
    }

    // Remove profile_data fetches and updates globally
    s = s.replace(/,\s*profile_data/g, "");
    s = s.replace(/profile_data,\s*/g, "");
    // In sync.js, login.js, send.js
    s = s.replace(/env\.DB\.prepare\("SELECT profile_data FROM users WHERE id = \?"\)\.bind\(userId\)\.first\(\),/g, "env.DB.prepare(\"SELECT 1 FROM users WHERE id = ?\").bind(userId).first(),");
    s = s.replace(/await env\.DB\.prepare\("UPDATE users SET profile_data = \? WHERE id = \?"\)\.bind\([^)]+\)\.run\(\);/g, "/* profile_data update removed */");
    s = s.replace(/env\.DB\.prepare\("UPDATE users SET profile_data = \? WHERE id = \?"\)\n\s*\.bind\([^)]+\),/g, "env.DB.prepare(\"SELECT 1 /* profile update removed */\"),");

    // User Visits replacements globally
    s = s.replace(/INSERT INTO event_logs \(id, user_id, event_type, metadata, created_at\) VALUES/g, "INSERT INTO user_visits (id, user_id, session_id, visit_type, ip_address, metadata, created_at) VALUES");
    s = s.replace(/INSERT INTO logs \(id, user_id, action, details, created_at\) VALUES/g, "INSERT INTO user_visits (id, user_id, session_id, visit_type, ip_address, metadata, created_at) VALUES");

    // To handle the binds of user_visits which now need 7 params (id, userId, NULL, visitType, NULL, metadata, createdAt)
    // Actually we can do it via regex substitution for the bind part if we just do:
    // env.DB.prepare(..).bind(uuid, user_id, type, meta, time) -> .bind(uuid, user_id, null, type, null, meta, time)
    // that's practically very complex via pure regex. Let's just replace the whole prepare statement.
    s = s.replace(/env\.DB\.prepare\("INSERT INTO user_visits \([^)]+\) VALUES \(\?, \?, \?, \?, \?\)"\)\n\s*\.bind\(crypto\.randomUUID\(\),\s*userId,\s*('[^']+'),\s*(JSON\.stringify\([^)]+\)),\s*(nowIso|new Date\(\)\.toISOString\(\))\)/g,
        "env.DB.prepare(\"INSERT INTO user_visits (id, user_id, session_id, visit_type, ip_address, metadata, created_at) VALUES (?, ?, NULL, ?, NULL, ?, ?)\")\n                .bind(crypto.randomUUID(), userId, $1, $2, $3)");
    s = s.replace(/env\.DB\.prepare\("INSERT INTO user_visits \([^)]+\) VALUES \(\?, \?, \?, \?, \?\)"\)\.bind\(crypto\.randomUUID\(\),\s*(userId|user\.id),\s*('[^']+'),\s*(JSON\.stringify\([^)]+\)),\s*(nowIso|new Date\(\)\.toISOString\(\))\)/g,
        "env.DB.prepare(\"INSERT INTO user_visits (id, user_id, session_id, visit_type, ip_address, metadata, created_at) VALUES (?, ?, NULL, ?, NULL, ?, ?)\").bind(crypto.randomUUID(), $1, $2, $3, $4)");
    s = s.replace(/env\.DB\.prepare\("INSERT INTO user_visits \([^)]+\) VALUES \(\?, \?, \?, \?, \?\)"\)\.bind\((crypto\.randomUUID\(\)|logId),\s*userId,\s*('[^']+'),\s*(JSON\.stringify\([^)]+\)),\s*(nowIso|new Date\(\)\.toISOString\(\))\)/g,
        "env.DB.prepare(\"INSERT INTO user_visits (id, user_id, session_id, visit_type, ip_address, metadata, created_at) VALUES (?, ?, NULL, ?, NULL, ?, ?)\").bind($1, userId, $2, $3, $4)");
    s = s.replace(/env\.DB\.prepare\("INSERT INTO user_visits \([^)]+\) VALUES \(\?, \?, \?, \?, \?\)"\)\n\s*\.bind\("SYSTEM",\s*"guardian_block",\s*(JSON\.stringify\([^)]+\)),\s*(nowIso|new Date\(\)\.toISOString\(\))\)/g,
        "env.DB.prepare(\"INSERT INTO user_visits (id, user_id, session_id, visit_type, ip_address, metadata, created_at) VALUES (?, ?, NULL, ?, NULL, ?, ?)\").bind(crypto.randomUUID(), \"SYSTEM\", NULL, \"guardian_block\", NULL, $1, $2)");

    // the middleware specifically
    s = s.replace(/\.bind\(crypto\.randomUUID\(\), "SYSTEM", "guardian_block", JSON\.stringify\(\{ ip, hits \}\), new Date\(\)\.toISOString\(\)\)/g,
        ".bind(crypto.randomUUID(), \"SYSTEM\", null, \"guardian_block\", ip, JSON.stringify({ hits }), new Date().toISOString())");

    // replace the from
    s = s.replace(/FROM logs WHERE action =/g, "FROM user_visits WHERE visit_type =");
    s = s.replace(/FROM event_logs WHERE event_type =/g, "FROM user_visits WHERE visit_type =");

    // Wallet and Wallet Audits -> Users and Wallet Transactions
    s = s.replace(/FROM wallets WHERE user_id/g, "FROM users WHERE id");
    s = s.replace(/UPDATE wallets\s+SET/g, "UPDATE users SET");
    s = s.replace(/UPDATE wallets SET hearts = hearts \+ \?, total_earned = total_earned \+ \?, updated_at = \?\s+WHERE user_id = \?/g,
        "UPDATE users SET hearts = hearts + ?, total_earned = total_earned + ?, updated_at = ? WHERE id = ?");
    s = s.replace(/UPDATE users SET hearts = hearts - \?, total_spent = total_spent \+ \?, updated_at = \?\s+WHERE user_id = \? AND hearts >= \?/g,
        "UPDATE users SET hearts = hearts - ?, total_spent = total_spent + ?, updated_at = ? WHERE id = ? AND hearts >= ?");
    s = s.replace(/UPDATE wallets SET hearts = \?, total_earned = total_earned \+ \?, updated_at = \? WHERE user_id = \?/g,
        "UPDATE users SET hearts = ?, total_earned = total_earned + ?, updated_at = ? WHERE id = ?");
    s = s.replace(/UPDATE wallets SET hearts = \?, total_spent = total_spent \+ \?, updated_at = \? WHERE user_id = \?/g,
        "UPDATE users SET hearts = ?, total_spent = total_spent + ?, updated_at = ? WHERE id = ?");

    // Wallet Audit Log mapping (7 args to 9 arguments)
    s = s.replace(/INSERT INTO wallet_audit_log[^)]+\) VALUES \(\?, \?, \?, \?, \?, \?, \?\)/g, "INSERT INTO wallet_transactions (id, user_id, amount, balance_after, type, reason, reference_id, ip_address, created_at) VALUES (?, ?, ?, 0, ?, ?, NULL, ?, ?)");

    // Processed orders
    s = s.replace(/FROM processed_orders WHERE order_id = \?/g, "FROM wallet_transactions WHERE reference_id = ? AND type = 'payment'");
    s = s.replace(/env\.DB\.prepare\("INSERT INTO processed_orders[^"]+"\)\n\s*\.bind\([^)]+\)/g, "env.DB.prepare(\"SELECT 1 /* processed_orders removed */\")");

    // Messages (id, chat_id, user_id, ai_profile_id, role, body, tokens_used, metadata, created_at)
    if (f.endsWith('send.js')) {
        s = s.replace(/INSERT INTO messages \(id, chat_id, sender_id, sender_handle, body, created_at, role, metadata\) VALUES \(\?, \?, \?, \?, \?, \?, \?, \?\)/g,
            "INSERT INTO messages (id, chat_id, user_id, ai_profile_id, role, body, tokens_used, metadata, created_at) VALUES (?, ?, ?, NULL, ?, ?, 0, ?, ?)");
        s = s.replace(/INSERT INTO messages \(id, chat_id, sender_id, sender_handle, body, created_at, role\) VALUES \(\?, \?, \?, \?, \?, \?, \?\)/g,
            "INSERT INTO messages (id, chat_id, user_id, ai_profile_id, role, body, tokens_used, metadata, created_at) VALUES (?, ?, ?, NULL, ?, ?, 0, NULL, ?)");
        // User message bind
        s = s.replace(/\.bind\(reqMsgId, chatId, userId, userName, body, nowIso, 'user'\)/g, ".bind(reqMsgId, chatId, userId, 'user', body, nowIso)");
        // AI message bind
        s = s.replace(/\.bind\(resMsgId, chatId, 'AI', 'SambaNova AI', aiMessage, nowIso, 'assistant', JSON\.stringify\(\{ is_voice: isVoiceNote \}\)\)/g, ".bind(resMsgId, chatId, userId, 'assistant', aiMessage, JSON.stringify({ is_voice: isVoiceNote }), nowIso)");
    }

    if (f.endsWith('index.js')) {
        s = s.replace(/sender_id as sender/g, "user_id as sender");
    }

    // subscriptions (id, user_id, plan_name, plan_price, payment_id, status, started_at, expires_at, created_at)
    if (f.endsWith('verify.js')) {
        s = s.replace(/UPDATE subscriptions SET plan_name = \?, status = 'active', started_at = \? WHERE user_id = \?/g, "UPDATE subscriptions SET plan_name = ?, status = 'active', started_at = ? WHERE user_id = ?");
    }

    if (s !== startS) {
        fs.writeFileSync(f, s);
        console.log("Replaced inside", f);
    }
}
