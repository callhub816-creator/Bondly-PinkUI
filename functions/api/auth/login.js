
export async function onRequestPost({ request, env }) {
    if (!env.DB) {
        return new Response(JSON.stringify({ error: "D1 Database binding 'DB' not found." }), { status: 500 });
    }

    try {
        const { username } = await request.json();
        const ip = request.headers.get("cf-connecting-ip") || "unknown";
        const userAgent = request.headers.get("user-agent") || "unknown";

        // 1. Check for recent failed attempts for this username (Sentinel)
        const recentFailures = await env.DB.prepare("SELECT COUNT(*) as count FROM user_visits WHERE visit_type = 'login_fail' AND created_at > ? AND metadata LIKE ?")
            .bind(new Date(Date.now() - 15 * 60000).toISOString(), `%${ip}%`).first();

        if (recentFailures?.count > 10) {
            return new Response(JSON.stringify({ error: "Too many failed attempts. Try again in 15 mins." }), { status: 429 });
        }

        // 2. Get user from DB
        const user = await env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(username).first();
        if (!user) {
            return new Response(JSON.stringify({
                error: "Username not found. Check spelling or create an account.",
                field: "username"
            }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        // PASSWORD LOGIC REMOVED DUE TO SCHEMA CONSTRAINT
        // 3. Create Session (Access Token: 15 Mins, Refresh Token: 30 Days)
        const exp = Date.now() + (4 * 3600 * 1000); // 4 Hours
        const payload = JSON.stringify({ id: user.id, username: user.username, displayName: user.display_name, exp });
        const encoder = new TextEncoder();
        const payloadUint8 = encoder.encode(payload);
        const payloadB64 = btoa(String.fromCharCode(...payloadUint8));

        const secret = env.JWT_SECRET;
        if (!secret) throw new Error("JWT_SECRET missing");
        const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const signature = await crypto.subtle.sign("HMAC", key, payloadUint8);
        const accessToken = payloadB64 + "." + btoa(String.fromCharCode(...new Uint8Array(signature)));

        // 4. Create Refresh Token
        const refreshToken = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(48))));
        const refreshExp = Date.now() + (30 * 86400000);
        const nowIso = new Date().toISOString();

        // 5. Fetch Wallet and Subscription info for Frontend Response
        const [wallet, subscription] = await Promise.all([
            env.DB.prepare("SELECT hearts FROM users WHERE id = ?").bind(user.id).first(),
            env.DB.prepare("SELECT plan_name FROM subscriptions WHERE user_id = ? AND status = 'active'").bind(user.id).first()
        ]);

        await env.DB.batch([
            // 1. Update Last Login
            env.DB.prepare("UPDATE users SET updated_at = ? WHERE id = ?").bind(nowIso, user.id),

            // 2. Create Session
            env.DB.prepare("INSERT INTO user_sessions (id, user_id, refresh_token, ip_address, user_agent, expires_at, revoked, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)")
                .bind(crypto.randomUUID(), user.id, refreshToken, ip, userAgent, refreshExp, nowIso),

            // 3. Event Log
            env.DB.prepare("INSERT INTO user_visits (id, user_id, session_id, visit_type, ip_address, metadata, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?)")
                .bind(crypto.randomUUID(), user.id, 'login', ip, JSON.stringify({ ip }), nowIso)
        ]);

        // Only set Secure flag when request is HTTPS (avoid Secure cookies on local HTTP dev)
        const isSecure = new URL(request.url).protocol === 'https:';
        const secureAttr = isSecure ? ' Secure;' : '';
        const authCookie = `auth_token=${accessToken}; Path=/; HttpOnly;${secureAttr} SameSite=Strict; Max-Age=14400`;
        const refreshCookie = `refresh_token=${refreshToken}; Path=/; HttpOnly;${secureAttr} SameSite=Strict; Max-Age=2592000`;

        const headers = new Headers();
        headers.set("Content-Type", "application/json");
        headers.append("Set-Cookie", authCookie);
        headers.append("Set-Cookie", refreshCookie);

        return new Response(JSON.stringify({
            success: true,
            user: { id: user.id, username: user.username, displayName: user.display_name },
            profileData: {
                id: user.id,
                hearts: wallet?.hearts || 0,
                subscription: (subscription?.plan_name || 'free').toLowerCase()
            }
        }), {
            headers
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
