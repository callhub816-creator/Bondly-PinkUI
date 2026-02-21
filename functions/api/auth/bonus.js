export async function onRequestPost({ request, env }) {
    if (!env.DB) return new Response(JSON.stringify({ error: "DB missing" }), { status: 500 });

    // 1. 🔒 AUTH CHECK
    const cookieHeader = request.headers.get("Cookie") || "";
    const authHeader = request.headers.get("Authorization") || "";

    let token = null;
    if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
    } else {
        const cookies = Object.fromEntries(cookieHeader.split(";").map(c => c.trim().split("=")));
        token = cookies["auth_token"];
    }

    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    try {
        const [payloadB64, signatureB64] = token.split(".");
        const payloadStr = atob(payloadB64);
        const payload = JSON.parse(payloadStr);

        // Verify Signature
        const encoder = new TextEncoder();
        const secret = env.JWT_SECRET;
        if (!secret) throw new Error("JWT_SECRET missing");
        const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
        const signature = new Uint8Array(atob(signatureB64).split("").map(c => c.charCodeAt(0)));
        const isValid = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(payloadStr));

        if (!isValid || payload.exp < Date.now()) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });

        const userId = payload.id;
        const now = Date.now();
        const COOLDOWN_24H = 24 * 60 * 60 * 1000;
        const ip = request.headers.get("cf-connecting-ip") || "unknown";

        // 2. 🕒 STRICT 24H CHECK (Check last bonus in audit log)
        const lastBonus = await env.DB.prepare("SELECT created_at FROM wallet_audit_log WHERE user_id = ? AND type = 'bonus' ORDER BY created_at DESC LIMIT 1").bind(userId).first();

        if (lastBonus) {
            const lastClaim = new Date(lastBonus.created_at).getTime();
            const timeElapsed = now - lastClaim;

            if (timeElapsed < COOLDOWN_24H) {
                const timeLeftMs = COOLDOWN_24H - timeElapsed;
                const hoursLeft = Math.floor(timeLeftMs / (60 * 60 * 1000));
                const minsLeft = Math.floor((timeLeftMs % (60 * 60 * 1000)) / (60 * 1000));

                return new Response(JSON.stringify({
                    error: `Next bonus available in ${hoursLeft}h ${minsLeft}m! ✨`,
                    nextAvailableTs: lastClaim + COOLDOWN_24H
                }), { status: 400 });
            }
        }

        // 3. Update Wallet & Log
        const bonusAmount = 10;
        const nowIso = new Date().toISOString();

        // Get current wallet
        const wallet = await env.DB.prepare("SELECT hearts FROM wallets WHERE user_id = ?").bind(userId).first();
        const newBalance = (wallet?.hearts || 0) + bonusAmount;

        await env.DB.batch([
            // Update Wallet
            env.DB.prepare("UPDATE wallets SET hearts = ?, total_earned = total_earned + ?, updated_at = ? WHERE user_id = ?")
                .bind(newBalance, bonusAmount, nowIso, userId),

            // Audit Log
            env.DB.prepare("INSERT INTO wallet_audit_log (id, user_id, amount, type, reason, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
                .bind(crypto.randomUUID(), userId, bonusAmount, 'bonus', 'daily_bonus', ip, nowIso),

            // Event Log
            env.DB.prepare("INSERT INTO event_logs (id, user_id, event_type, metadata, created_at) VALUES (?, ?, ?, ?, ?)")
                .bind(crypto.randomUUID(), userId, 'claim_bonus', JSON.stringify({ amount: bonusAmount }), nowIso)
        ]);

        return new Response(JSON.stringify({
            success: true,
            profile: { hearts: newBalance, subscription: 'FREE' } // Frontend expects this structure
        }), { headers: { "Content-Type": "application/json" } });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
