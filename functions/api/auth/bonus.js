export async function onRequestPost({ request, env }) {
    if (!env.DB) return new Response(JSON.stringify({ error: "DB missing" }), { status: 500 });

    // 1. 🔒 AUTH CHECK
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

        // 3. ✨ DYNAMIC BONUS & STREAK LOGIC
        const bonusAmount = Math.floor(Math.random() * 10) + 1; // 1 to 10 hearts
        const nowMs = new Date().getTime();
        const nowIso = new Date().toISOString();

        // Fetch current user data for profile sync
        const userRow = await env.DB.prepare("SELECT profile_data FROM users WHERE id = ?").bind(userId).first();
        let profile = JSON.parse(userRow.profile_data || "{}");

        // Calculate Streak
        let currentStreak = profile.streakCount || 0;
        if (lastBonus) {
            const timeElapsed = nowMs - new Date(lastBonus.created_at).getTime();
            if (timeElapsed >= 24 * 60 * 60 * 1000 && timeElapsed < 48 * 60 * 60 * 1000) {
                currentStreak += 1; // Consecutive day
            } else if (timeElapsed >= 48 * 60 * 60 * 1000) {
                currentStreak = 1; // Reset due to gap
            }
        } else {
            currentStreak = 1; // First time
        }

        profile.streakCount = currentStreak;
        profile.lastDailyBonusClaim = nowIso;

        // Get current wallet
        const wallet = await env.DB.prepare("SELECT hearts FROM wallets WHERE user_id = ?").bind(userId).first();
        const newBalance = (wallet?.hearts || 0) + bonusAmount;
        profile.hearts = newBalance;

        await env.DB.batch([
            // Update Wallet
            env.DB.prepare("UPDATE wallets SET hearts = ?, total_earned = total_earned + ?, updated_at = ? WHERE user_id = ?")
                .bind(newBalance, bonusAmount, nowIso, userId),

            // Update User Profile Data (Streak & Last Claim)
            env.DB.prepare("UPDATE users SET profile_data = ?, updated_at = ? WHERE id = ?")
                .bind(JSON.stringify(profile), nowIso, userId),

            // Audit Log
            env.DB.prepare("INSERT INTO wallet_audit_log (id, user_id, amount, type, reason, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
                .bind(crypto.randomUUID(), userId, bonusAmount, 'bonus', 'lucky_box', ip, nowIso),

            // Event Log
            env.DB.prepare("INSERT INTO event_logs (id, user_id, event_type, metadata, created_at) VALUES (?, ?, ?, ?, ?)")
                .bind(crypto.randomUUID(), userId, 'claim_bonus', JSON.stringify({ amount: bonusAmount, streak: currentStreak }), nowIso)
        ]);

        return new Response(JSON.stringify({
            success: true,
            amount: bonusAmount,
            profile: profile
        }), { headers: { "Content-Type": "application/json" } });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
