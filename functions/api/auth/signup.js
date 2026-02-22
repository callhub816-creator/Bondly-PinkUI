
export async function onRequestPost({ request, env }) {
    if (!env.DB) {
        return new Response(JSON.stringify({ error: "D1 Database binding 'DB' not found." }), { status: 500 });
    }

    try {
        const { username, displayName, password, profileData } = await request.json();

        if (!username || !displayName || !password) {
            return new Response(JSON.stringify({ error: "Username, Name, and Password are required." }), { status: 400 });
        }

        // 1. Check if username taken
        const existingUser = await env.DB.prepare("SELECT id FROM users WHERE username = ?").bind(username).first();
        if (existingUser) {
            return new Response(JSON.stringify({ error: "This username is already taken." }), { status: 400 });
        }

        // 2. Hash Password
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const encoder = new TextEncoder();
        const baseKey = await crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );

        const hashBuffer = await crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            baseKey,
            256
        );

        const passwordHash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
        const passwordSalt = btoa(String.fromCharCode(...salt));

        // 3. Prepare ID and Timestamps
        const userId = crypto.randomUUID();
        const nowIso = new Date().toISOString();

        // 4. Create Session (Access Token: 15 Mins, Refresh Token: 30 Days)
        const accessTokenExp = Date.now() + (15 * 60 * 1000);
        const refreshTokenVal = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(48))));
        const refreshExp = Date.now() + (30 * 86400000);

        const initialProfile = {
            hearts: 20,
            subscription: 'FREE',
            streakCount: 0,
            long_term_memory: "Everything starts from here.",
            user_preferences: "Learning your likes..."
        };

        const payload = JSON.stringify({ id: userId, username, displayName, exp: accessTokenExp });
        const payloadUint8 = encoder.encode(payload);
        const payloadB64 = btoa(String.fromCharCode(...payloadUint8));

        const secret = env.JWT_SECRET;
        if (!secret) throw new Error("JWT_SECRET missing");
        const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const signature = await crypto.subtle.sign("HMAC", key, payloadUint8);
        const accessToken = payloadB64 + "." + btoa(String.fromCharCode(...new Uint8Array(signature)));

        const ip = request.headers.get("cf-connecting-ip") || "unknown";

        await env.DB.batch([
            // 1. Create User
            env.DB.prepare(
                "INSERT INTO users (id, username, display_name, password_hash, password_salt, status, profile_data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
            ).bind(userId, username, displayName, passwordHash, passwordSalt, 'active', JSON.stringify(initialProfile), nowIso, nowIso),

            // 2. Initialize Wallet (20 Hearts Bonus)
            env.DB.prepare(
                "INSERT INTO wallets (id, user_id, hearts, total_spent, total_earned, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
            ).bind(crypto.randomUUID(), userId, 20, 0, 20, nowIso),

            // 3. Initialize Subscription (FREE)
            env.DB.prepare(
                "INSERT INTO subscriptions (id, user_id, plan_name, status, started_at, created_at) VALUES (?, ?, ?, ?, ?, ?)"
            ).bind(crypto.randomUUID(), userId, 'FREE', 'active', nowIso, nowIso),

            // 4. Create Session
            env.DB.prepare(
                "INSERT INTO user_sessions (id, user_id, refresh_token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
            ).bind(crypto.randomUUID(), userId, refreshTokenVal, refreshExp, nowIso),

            // 5. Audit Log (Wallet)
            env.DB.prepare(
                "INSERT INTO wallet_audit_log (id, user_id, amount, type, reason, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
            ).bind(crypto.randomUUID(), userId, 20, 'bonus', 'signup_bonus', ip, nowIso),

            // 6. Event Log (Signup)
            env.DB.prepare(
                "INSERT INTO event_logs (id, user_id, event_type, metadata, created_at) VALUES (?, ?, ?, ?, ?)"
            ).bind(crypto.randomUUID(), userId, 'signup', JSON.stringify({ ip, username }), nowIso)
        ]);

        return new Response(JSON.stringify({
            success: true,
            user: { id: userId, username, displayName },
            profileData: { hearts: 20, subscription: 'FREE' }
        }), {
            headers: {
                "Content-Type": "application/json",
                "Set-Cookie": [
                    `auth_token=${accessToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=900`,
                    `refresh_token=${refreshTokenVal}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`
                ].join(', ')
            }
        });

    } catch (err) {
        console.error("Signup Error:", err.message);
        return new Response(JSON.stringify({
            error: "Server Error: " + err.message,
            stack: err.stack
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
