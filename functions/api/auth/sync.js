export async function onRequestPost({ request, env }) {
    if (!env.DB) return new Response(JSON.stringify({ error: "DB missing" }), { status: 500 });

    // 1. 🔒 AUTH CHECK (Hardened)
    const cookieHeader = request.headers.get("Cookie") || "";
    const authHeader = request.headers.get("Authorization") || "";

    let token = null;
    if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
    } else {
        const cookies = Object.fromEntries(cookieHeader.split(";").map(c => { const i = c.indexOf("="); return i === -1 ? [c.trim(), ""] : [c.slice(0, i).trim(), c.slice(i + 1).trim()]; }));
        token = cookies["auth_token"];
    }

    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    let userId;
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
        if (!secret) throw new Error("JWT_SECRET missing in environment");
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

        userId = payload.id;
    } catch (e) {
        return new Response(JSON.stringify({ error: "Auth verification failed", details: e.message }), { status: 401 });
    }

    try {
        const { profileData } = await request.json();

        // 🛡️ [SECURITY LOCK] Fetch Existing Data + Wallet + Subscription
        const [userRow, walletRow, subRow] = await Promise.all([
            env.DB.prepare("SELECT 1 FROM users WHERE id = ?").bind(userId).first(),
            env.DB.prepare("SELECT hearts FROM users WHERE id = ?").bind(userId).first(),
            env.DB.prepare("SELECT plan_name FROM subscriptions WHERE user_id = ? AND status = 'active'").bind(userId).first()
        ]);

        if (!userRow) {
            return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
        }

        const existingProfile = JSON.parse(userRow.profile_data || "{}");

        // 🔒 ALLOWED FIELDS ONLY (Whitelist)
        const safeUpdate = {
            ...existingProfile,
            displayName: profileData.displayName || existingProfile.displayName,
            avatarUrl: profileData.avatarUrl || existingProfile.avatarUrl,
            bio: profileData.bio || existingProfile.bio,
            nickname: profileData.nickname || existingProfile.nickname,
            preferred_reply_language: profileData.preferred_reply_language || existingProfile.preferred_reply_language,
            // Prune history to last 7 days during sync
            earningsHistory: (profileData.earningsHistory || existingProfile.earningsHistory || [])
                .filter(item => {
                    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
                    return new Date(item.timestamp).getTime() > cutoff;
                })
                .slice(0, 50),
            // Keep critical fields from SERVER state (Normalized Tables)
            hearts: walletRow?.hearts ?? existingProfile.hearts ?? 0,
            subscription_tier: subRow?.plan_name || existingProfile.subscription_tier || 'FREE'
        };

        // Update DB with SAFE data
        await env.DB.prepare("UPDATE users SET profile_data = ? WHERE id = ?")
            .bind(JSON.stringify(safeUpdate), userId)
            .run();

        return new Response(JSON.stringify({ success: true, profile: safeUpdate }), { headers: { "Content-Type": "application/json" } });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
