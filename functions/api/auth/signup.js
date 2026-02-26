
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

        // 3. Prepare ID and Timestamps
        const userId = crypto.randomUUID();
        const nowIso = new Date().toISOString();

        // 4. Create Session (Access Token: 15 Mins, Refresh Token: 30 Days)
        const accessTokenExp = Date.now() + (15 * 60 * 1000);
        const refreshTokenVal = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(48))));
        const refreshExp = Date.now() + (30 * 86400000);

        const payload = JSON.stringify({ id: userId, username, displayName, exp: accessTokenExp });
        const encoder = new TextEncoder();
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
                "INSERT INTO users (id, provider, provider_id, username, display_name, email, role, hearts, total_spent, total_earned, created_at, updated_at) VALUES (?, 'local', ?, ?, ?, ?, 'user', 20, 0, 0, ?, ?)"
            ).bind(userId, username, username, displayName, username, nowIso, nowIso),

            // 3. Initialize Subscription (FREE)
            env.DB.prepare(
                "INSERT INTO subscriptions (id, user_id, plan_name, plan_price, payment_id, status, started_at, expires_at, created_at) VALUES (?, ?, 'FREE', 0, NULL, 'active', ?, NULL, ?)"
            ).bind(crypto.randomUUID(), userId, nowIso, nowIso),

            // 4. Create Session
            env.DB.prepare(
                "INSERT INTO user_sessions (id, user_id, refresh_token, ip_address, user_agent, expires_at, revoked, created_at) VALUES (?, ?, ?, ?, NULL, ?, 0, ?)"
            ).bind(crypto.randomUUID(), userId, refreshTokenVal, ip, refreshExp.toString(), nowIso),

            // 5. Audit Log (Wallet)
            env.DB.prepare(
                "INSERT INTO wallet_transactions (id, user_id, amount, balance_after, type, reason, reference_id, ip_address, created_at) VALUES (?, ?, 20, 20, 'bonus', 'signup_bonus', NULL, ?, ?)"
            ).bind(crypto.randomUUID(), userId, ip, nowIso),

            // 6. Event Log (Signup)
            env.DB.prepare(
                "INSERT INTO user_visits (id, user_id, session_id, visit_type, ip_address, metadata, created_at) VALUES (?, ?, NULL, 'signup', ?, ?, ?)"
            ).bind(crypto.randomUUID(), userId, ip, JSON.stringify({ ip, username }), nowIso)
        ]);

        return new Response(JSON.stringify({
            success: true,
            user: { id: userId, username, displayName },
            profileData: { hearts: 20, subscription: 'FREE' }
        }), {
            headers: [
                ["Content-Type", "application/json"],
                ["Set-Cookie", `auth_token=${accessToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=900`],
                ["Set-Cookie", `refresh_token=${refreshTokenVal}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`]
            ]
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
