
export async function onRequestGet({ request, env }) {
    if (!env.DB) return new Response(JSON.stringify({ error: "DB missing" }), { status: 500 });

    // 🔒 1. API KEY CHECK (Basic Defense)
    const adminKey = request.headers.get("x-admin-secret");
    if (!adminKey || adminKey !== env.ADMIN_SECRET_KEY) {
        return new Response(JSON.stringify({ error: "Unauthorized: Admin API key required." }), { status: 401 });
    }

    try {
        // 🔒 2. JWT & ROLE VERIFICATION (Deep Defense)
        const cookieHeader = request.headers.get("Cookie") || "";
        const cookies = Object.fromEntries(cookieHeader.split(";").map(c => { const i = c.indexOf("="); return i === -1 ? [c.trim(), ""] : [c.slice(0, i).trim(), c.slice(i + 1).trim()]; }));
        const token = cookies["auth_token"];

        if (!token) {
            return new Response(JSON.stringify({ error: "Forbidden: Admin Session Missing." }), { status: 403 });
        }

        // Verify Signature
        const parts = token.split(".");
        const payloadB64 = parts.length === 3 ? parts[1] : parts[0];
        const signatureB64 = parts.length === 3 ? parts[2] : parts[1];

        const decoder = new TextDecoder();
        const payloadStr = decoder.decode(new Uint8Array(atob(payloadB64).split("").map(c => c.charCodeAt(0))));
        const payload = JSON.parse(payloadStr);

        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey("raw", encoder.encode(env.JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
        const signature = new Uint8Array(atob(signatureB64).split("").map(c => c.charCodeAt(0)));
        const isValid = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(payloadStr));

        if (!isValid || payload.exp < Date.now()) {
            return new Response(JSON.stringify({ error: "Forbidden: Failed token validation or expired." }), { status: 403 });
        }

        // 🔒 3. DATABASE ROLE VALIDATION (Ultimate Defense)
        const adminUser = await env.DB.prepare("SELECT role FROM users WHERE id = ?").bind(payload.id).first();
        if (!adminUser || adminUser.role !== 'admin') {
            // Log intrusion attempt
            await env.DB.prepare("INSERT INTO user_visits (id, user_id, session_id, visit_type, ip_address, metadata, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?)")
                .bind(crypto.randomUUID(), payload.id, 'admin_intrusion_attempt', request.headers.get("cf-connecting-ip"), JSON.stringify({ tokenPayload: payload }), new Date().toISOString()).run();

            return new Response(JSON.stringify({ error: "Forbidden: Account lacks administrator privileges." }), { status: 403 });
        }

        // All checks passed! Execute Admin Query.
        const users = await env.DB.prepare(`
            SELECT 
                id, 
                username, 
                display_name, 
                created_at 
            FROM users 
            ORDER BY created_at DESC
        `).all();

        return new Response(JSON.stringify({
            success: true,
            users: users.results.map(u => ({
                ...u
            }))
        }), { headers: { "Content-Type": "application/json" } });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
