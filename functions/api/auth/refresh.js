
export async function onRequestPost({ request, env }) {
    if (!env.DB) return new Response(JSON.stringify({ error: "DB missing" }), { status: 500 });

    const cookieHeader = request.headers.get("Cookie") || "";
    const cookies = Object.fromEntries(cookieHeader.split(";").map(c => { const i = c.indexOf("="); return i === -1 ? [c.trim(), ""] : [c.slice(0, i).trim(), c.slice(i + 1).trim()]; }));
    const oldRefreshToken = cookies["refresh_token"];

    if (!oldRefreshToken) return new Response(JSON.stringify({ error: "Missing refresh token" }), { status: 401 });

    try {
        // 1. 🔍 Validate Refresh Token in DB
        const session = await env.DB.prepare("SELECT * FROM user_sessions WHERE refresh_token = ? AND revoked = 0 AND expires_at > ?")
            .bind(oldRefreshToken, Date.now()).first();

        if (!session) return new Response(JSON.stringify({ error: "Invalid or expired session" }), { status: 401 });

        // 2. 🔄 Rotate Tokens (Revoke Old, Create New)
        const userId = session.user_id;
        const user = await env.DB.prepare("SELECT id, username, display_name FROM users WHERE id = ?").bind(userId).first();
        const ip = request.headers.get("cf-connecting-ip") || "unknown";
        const userAgent = request.headers.get("user-agent") || "unknown";

        const newRefreshToken = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(48))));
        const newAccessExp = Date.now() + (15 * 60 * 1000);
        const newRefreshExp = Date.now() + (30 * 86400000);

        const encoder = new TextEncoder();
        const payload = JSON.stringify({ id: user.id, username: user.username, displayName: user.display_name, exp: newAccessExp });
        const payloadB64 = btoa(String.fromCharCode(...encoder.encode(payload)));

        const secret = env.JWT_SECRET;
        const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
        const newAccessToken = payloadB64 + "." + btoa(String.fromCharCode(...new Uint8Array(signature)));

        await env.DB.batch([
            env.DB.prepare("UPDATE user_sessions SET revoked = 1 WHERE refresh_token = ?").bind(oldRefreshToken),
            env.DB.prepare("INSERT INTO user_sessions (id, user_id, refresh_token, ip_address, user_agent, expires_at, revoked, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)")
                .bind(crypto.randomUUID(), userId, newRefreshToken, ip, userAgent, newRefreshExp, new Date().toISOString())
        ]);

        const isSecure = new URL(request.url).protocol === 'https:';
        const secureAttr = isSecure ? ' Secure;' : '';
        const authCookie = `auth_token=${newAccessToken}; Path=/; HttpOnly;${secureAttr} SameSite=Strict; Max-Age=900`;
        const refreshCookie = `refresh_token=${newRefreshToken}; Path=/; HttpOnly;${secureAttr} SameSite=Strict; Max-Age=2592000`;

        return new Response(JSON.stringify({ success: true }), {
            headers: [
                ["Content-Type", "application/json"],
                ["Set-Cookie", authCookie],
                ["Set-Cookie", refreshCookie]
            ]
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: "Rotation failed" }), { status: 500 });
    }
}
