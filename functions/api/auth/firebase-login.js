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

        if (!user) {
            // Create user
            await env.DB.prepare("INSERT INTO users (id, username, display_name, password_hash, password_salt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
                .bind(uid, email, finalDisplayName, "firebase", "firebase", nowIso, nowIso).run();
            // Create wallet, give 20 initial hearts
            await env.DB.prepare("INSERT INTO wallets (id, user_id, hearts, updated_at) VALUES (?, ?, ?, ?)")
                .bind(crypto.randomUUID(), uid, 20, nowIso).run();
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
            env.DB.prepare("SELECT hearts FROM wallets WHERE user_id = ?").bind(user.id).first(),
            env.DB.prepare("SELECT plan_name FROM subscriptions WHERE user_id = ? AND status = 'active'").bind(user.id).first()
        ]);

        await env.DB.batch([
            env.DB.prepare("UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?").bind(nowIso, nowIso, user.id),
            env.DB.prepare("INSERT INTO user_sessions (id, user_id, refresh_token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
                .bind(crypto.randomUUID(), user.id, refreshToken, refreshExp, nowIso)
        ]);

        const headers = new Headers();
        headers.set("Content-Type", "application/json");
        headers.append("Set-Cookie", `auth_token=${accessToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=900`);
        headers.append("Set-Cookie", `refresh_token=${refreshToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`);

        return new Response(JSON.stringify({
            success: true,
            user: { id: user.id, username: user.username, displayName: user.display_name },
            profileData: {
                hearts: wallet?.hearts || 0,
                subscription: subscription?.plan_name || 'FREE'
            }
        }), {
            status: 200,
            headers
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
