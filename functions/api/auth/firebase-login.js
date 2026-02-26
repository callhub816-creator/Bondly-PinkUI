export async function onRequestPost({ request, env }) {
    if (!env.DB) return new Response(JSON.stringify({ error: "DB missing" }), { status: 500 });

    try {
        const { idToken, displayName, apiKey } = await request.json();

        if (!idToken || !apiKey) {
            return new Response(JSON.stringify({ error: "Missing token or API key" }), { status: 400 });
        }

        // 1. Verify token with Google Identity Toolkit
        const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
        const verifyReq = await fetch(verifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
        });

        const verifyData = await verifyReq.json();
        if (verifyData.error) {
            return new Response(JSON.stringify({ error: "Invalid Firebase Token" }), { status: 401 });
        }

        const userRec = verifyData.users[0];
        const uid = userRec.localId;
        const email = userRec.email;
        let finalDisplayName = displayName || userRec.displayName || email.split('@')[0];

        // 2. Setup user in D1 (if not exists)
        let user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(uid).first();
        const nowIso = new Date().toISOString();
        const ip = request.headers.get("cf-connecting-ip") || "unknown";
        const userAgent = request.headers.get("user-agent") || "unknown";

        if (!user) {
            // Create user
            await env.DB.prepare("INSERT INTO users (id, provider, provider_id, username, display_name, email, role, hearts, total_spent, total_earned, created_at, updated_at) VALUES (?, 'firebase', ?, ?, ?, ?, 'user', 20, 0, 0, ?, ?)")
                .bind(uid, uid, email, finalDisplayName, email, nowIso, nowIso).run();
            // Wallet initialized via users table
            user = { id: uid, username: email, display_name: finalDisplayName };
        }

        // 3. Create Session (Access Token: 15 Mins) like in login.js
        const exp = Date.now() + (15 * 60 * 1000);
        const payload = JSON.stringify({ id: user.id, username: user.username, displayName: user.display_name, exp });
        const encoder = new TextEncoder();
        const payloadUint8 = encoder.encode(payload);
        const payloadB64 = btoa(String.fromCharCode(...payloadUint8));

        const secret = env.JWT_SECRET;
        if (!secret) throw new Error("JWT_SECRET missing");

        const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const signature = await crypto.subtle.sign("HMAC", key, payloadUint8);
        const accessToken = payloadB64 + "." + btoa(String.fromCharCode(...new Uint8Array(signature)));

        const refreshToken = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(48))));
        const refreshExp = Date.now() + (30 * 86400000);

        const [wallet, subscription] = await Promise.all([
            env.DB.prepare("SELECT hearts FROM users WHERE id = ?").bind(user.id).first(),
            env.DB.prepare("SELECT plan_name FROM subscriptions WHERE user_id = ? AND status = 'active'").bind(user.id).first()
        ]);

        await env.DB.batch([
            env.DB.prepare("UPDATE users SET updated_at = ? WHERE id = ?").bind(nowIso, user.id),
            env.DB.prepare("INSERT INTO user_sessions (id, user_id, refresh_token, ip_address, user_agent, expires_at, revoked, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)")
                .bind(crypto.randomUUID(), user.id, refreshToken, ip, userAgent, refreshExp, nowIso)
        ]);

        const isSecure = new URL(request.url).protocol === 'https:';
        const secureAttr = isSecure ? ' Secure;' : '';
        const authCookie = `auth_token=${accessToken}; Path=/; HttpOnly;${secureAttr} SameSite=Strict; Max-Age=900`;
        const refreshCookie = `refresh_token=${refreshToken}; Path=/; HttpOnly;${secureAttr} SameSite=Strict; Max-Age=2592000`;

        return new Response(JSON.stringify({
            success: true,
            user: { id: user.id, username: user.username, displayName: user.display_name },
            profileData: {
                id: user.id,
                hearts: wallet?.hearts || 0,
                subscription: (subscription?.plan_name || 'free').toLowerCase()
            }
        }), {
            status: 200,
            headers: [
                ["Content-Type", "application/json"],
                ["Set-Cookie", authCookie],
                ["Set-Cookie", refreshCookie]
            ]
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
