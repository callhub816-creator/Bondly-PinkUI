
export async function onRequestGet({ request, env }) {
    // Check both Cookie and Authorization header
    const cookieHeader = request.headers.get("Cookie") || "";
    const authHeader = request.headers.get("Authorization") || "";

    let token = null;
    if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
    } else {
        const cookies = Object.fromEntries(cookieHeader.split(";").map(c => { const i = c.indexOf("="); return i === -1 ? [c.trim(), ""] : [c.slice(0, i).trim(), c.slice(i + 1).trim()]; }));
        token = cookies["auth_token"];
    }

    if (!token) return new Response(JSON.stringify({ error: "Not logged in" }), { status: 401 });

    try {
        const parts = token.split(".");
        const isStandardJWT = parts.length === 3;
        const payloadB64 = isStandardJWT ? parts[1] : parts[0];
        const signatureB64 = isStandardJWT ? parts[2] : parts[1];

        if (!payloadB64 || !signatureB64) throw new Error("Malformatted token parts");

        const decoder = new TextDecoder();
        const payloadUint8 = new Uint8Array(atob(payloadB64).split("").map(c => c.charCodeAt(0)));
        const payloadStr = decoder.decode(payloadUint8);
        const payload = JSON.parse(payloadStr);

        // Check expiration
        if (payload.exp < Date.now()) {
            return new Response(JSON.stringify({ error: "Session expired" }), { status: 401 });
        }

        // Verify Signature
        const encoder = new TextEncoder();
        const secret = env.JWT_SECRET;
        if (!secret) throw new Error("JWT_SECRET missing");
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["verify"]
        );

        const signature = new Uint8Array(atob(signatureB64).split("").map(c => c.charCodeAt(0)));
        const isValid = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(payloadStr));

        if (!isValid) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });

        let profileData = { id: payload.id, hearts: 0, subscription: 'free' };
        if (env.DB) {
            const [wallet, subscription] = await Promise.all([
                env.DB.prepare("SELECT hearts FROM users WHERE id = ?").bind(payload.id).first(),
                env.DB.prepare("SELECT plan_name FROM subscriptions WHERE user_id = ? AND status = 'active'").bind(payload.id).first()
            ]);

            profileData = {
                id: payload.id,
                hearts: wallet?.hearts || 0,
                subscription: (subscription?.plan_name || 'free').toLowerCase()
            };
        }

        return new Response(JSON.stringify({
            ...payload,
            profileData
        }), { headers: { "Content-Type": "application/json" } });

    } catch (err) {
        return new Response(JSON.stringify({
            error: "Auth failed",
            details: err.message
        }), { status: 401 });
    }
}
