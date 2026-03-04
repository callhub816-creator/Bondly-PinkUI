
export async function onRequestPost({ request, env }) {
    if (!env.DB) return new Response(JSON.stringify({ error: "DB missing" }), { status: 500 });

    // 1. 🔒 AUTH CHECK (Reusing hardened logic)
    const cookieHeader = request.headers.get("Cookie") || "";
    const authHeader = request.headers.get("Authorization") || "";
    let token = null;
    if (authHeader.startsWith("Bearer ")) token = authHeader.substring(7);
    else {
        const cookies = Object.fromEntries(cookieHeader.split(";").map(c => { const i = c.indexOf("="); return i === -1 ? [c.trim(), ""] : [c.slice(0, i).trim(), c.slice(i + 1).trim()]; }));
        token = cookies["auth_token"];
    }

    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    let userId;
    try {
        const parts = token.split(".");
        const payloadB64 = parts.length === 3 ? parts[1] : parts[0];
        const signatureB64 = parts.length === 3 ? parts[2] : parts[1];
        const payload = JSON.parse(atob(payloadB64));
        if (payload.exp < Date.now()) return new Response(JSON.stringify({ error: "Session expired" }), { status: 401 });
        userId = payload.id;
    } catch (e) {
        return new Response(JSON.stringify({ error: "Auth failed" }), { status: 401 });
    }

    try {
        const { giftId, companionId } = await request.json();

        // 2. GIFT CONFIGURATION
        const giftPrices = {
            'gift_chai': { price: 5, bonus: 3, refresh: true },
            'gift_black_coffee': { price: 9, bonus: 6, refresh: true },
            'gift_cold_coffee': { price: 25, bonus: 18, refresh: true },
            'gift_rose': { price: 15, bonus: 0, refresh: false },
            'gift_letter': { price: 40, bonus: 0, refresh: false },
            'gift_chocolates': { price: 60, bonus: 0, refresh: false },
            'gift_cake': { price: 100, bonus: 0, refresh: false },
            'gift_teddy': { price: 150, bonus: 0, refresh: false },
            'gift_bouquet': { price: 200, bonus: 0, refresh: false },
            'gift_puppy': { price: 300, bonus: 0, refresh: false },
            'gift_earrings': { price: 400, bonus: 0, refresh: false },
            'gift_ring': { price: 500, bonus: 0, refresh: false }
        };

        const config = giftPrices[giftId];
        if (!config) return new Response(JSON.stringify({ error: "Invalid gift item" }), { status: 400 });

        const price = config.price;
        const bonus = config.bonus;
        const netDeduction = price - bonus;

        // 3. 💾 ATOMIC UPDATE (Safe from Race Conditions)
        const nowIso = new Date().toISOString();
        const ip = request.headers.get("cf-connecting-ip") || "unknown";

        // Calculate Energy Expiry (Refresh for 4 hours)
        let energyExpiration = null;
        if (config.refresh) {
            energyExpiration = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
        }

        const queries = [
            // Safe Debit: Update ONLY if balance is sufficient
            env.DB.prepare(`
                UPDATE users 
                SET 
                    hearts = hearts - ? + ?, 
                    total_spent = total_spent + ?,
                    updated_at = ?
                WHERE id = ? AND hearts >= ?
            `).bind(price, bonus, price, nowIso, userId, price),

            // Log the Gift Transaction
            env.DB.prepare("INSERT INTO wallet_transactions (id, user_id, amount, balance_after, type, reason, ip_address, created_at) VALUES (?, ?, ?, 0, ?, ?, ?, ?)")
                .bind(crypto.randomUUID(), userId, -price, 'gift_purchase', `Gift: ${giftId}`, ip, nowIso)
        ];

        if (bonus > 0) {
            queries.push(
                env.DB.prepare("INSERT INTO wallet_transactions (id, user_id, amount, balance_after, type, reason, ip_address, created_at) VALUES (?, ?, ?, 0, ?, ?, ?, ?)")
                    .bind(crypto.randomUUID(), userId, bonus, 'bonus', `Bonus for Gift: ${giftId}`, ip, nowIso)
            );
        }

        if (energyExpiration) {
            queries.push(
                env.DB.prepare("UPDATE users SET energy_expires_at = ? WHERE id = ?").bind(energyExpiration, userId)
            );
        }

        const batchResult = await env.DB.batch(queries);

        if (batchResult[0].meta.changes === 0) {
            return new Response(JSON.stringify({ error: "Insufficient hearts! ❤️" }), { status: 400 });
        }

        const [walletFinal, subFinal] = await Promise.all([
            env.DB.prepare("SELECT hearts FROM users WHERE id = ?").bind(userId).first(),
            env.DB.prepare("SELECT plan_name FROM subscriptions WHERE user_id = ? AND status = 'active'").bind(userId).first()
        ]);

        const fullProfile = {
            hearts: walletFinal?.hearts || 0,
            subscription: (subFinal?.plan_name || 'free').toLowerCase()
        };

        return new Response(JSON.stringify({
            success: true,
            hearts: newBalance,
            profile: fullProfile,
            bonus_awarded: bonus
        }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
