export async function onRequestPost({ request, env }) {
    if (!env.DB) return new Response(JSON.stringify({ error: "DB missing" }), { status: 500 });

    const adminToken = request.headers.get("X-Admin-Token");
    if (!adminToken || adminToken !== env.ADMIN_SECRET) {
        return new Response(JSON.stringify({ error: "Unauthorized Admin Control" }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

    try {
        const { payment_id, refund_amount, reason } = await request.json(); // refund_amount in paise

        if (!payment_id || !refund_amount) {
            return new Response(JSON.stringify({ error: "Missing required parameters" }), { status: 400 });
        }

        // 1. Validate against original transaction to prevent over-refunding
        const originalTransaction = await env.DB.prepare(
            `SELECT * FROM wallet_transactions WHERE type = 'payment' AND reference_id = ?`
        ).bind(payment_id).first();

        // If reference_id was order_id, we might need a robust way to map payment_id. 
        // For security, checking amount sanity:
        if (!originalTransaction) {
            return new Response(JSON.stringify({ error: "Original transaction not found for this reference" }), { status: 404 });
        }

        const original_amount = Math.round(originalTransaction.amount * 100);

        if (refund_amount > original_amount) {
            return new Response(JSON.stringify({ error: "Refund amount exceeds original transaction amount" }), { status: 400 });
        }

        const original_hearts = calculateHeartEquivalent(original_amount);
        const refund_ratio = refund_amount / original_amount;
        let hearts_to_deduct = Math.floor(original_hearts * refund_ratio);

        if (refund_amount > 0 && hearts_to_deduct === 0) {
            hearts_to_deduct = 1;
        }

        // Ensure user has enough balance
        const user = await env.DB.prepare(`SELECT hearts FROM users WHERE id = ?`).bind(originalTransaction.user_id).first();

        if (user.hearts < hearts_to_deduct) {
            return new Response(JSON.stringify({ error: "User has insufficient balance for refund debit" }), { status: 400 });
        }

        const keyId = env.RAZORPAY_KEY_ID;
        const secret = env.RAZORPAY_KEY_SECRET;
        const auth = btoa(`${keyId}:${secret}`);

        // 2. Call Razorpay Refund API
        const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${payment_id}/refund`, {
            method: "POST",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ amount: refund_amount }) // Must be in paise
        });

        const rzpData = await rzpRes.json();

        if (!rzpRes.ok) {
            return new Response(JSON.stringify({ error: "Razorpay refund failed", details: rzpData }), { status: rzpRes.status });
        }

        const nowIso = new Date().toISOString();

        // 3. Reconcile in DB atomically
        await env.DB.batch([
            env.DB.prepare(`
                UPDATE users SET hearts = hearts - ? WHERE id = ?
            `).bind(hearts_to_deduct, originalTransaction.user_id),

            env.DB.prepare(`
                INSERT INTO wallet_transactions (id, user_id, amount, balance_after, type, reason, reference_id, ip_address, created_at)
                VALUES (?, ?, ?, 0, 'spend', 'razorpay_refund', ?, NULL, ?)
            `).bind(crypto.randomUUID(), originalTransaction.user_id, -(refund_amount / 100), rzpData.id, nowIso)
        ]);

        return new Response(JSON.stringify({ success: true, refund: rzpData }), { status: 200, headers: { "Content-Type": "application/json" } });

    } catch (err) {
        return new Response(JSON.stringify({ error: "Internal Server Error", message: err.message }), { status: 500 });
    }
}

function calculateHeartEquivalent(paise) {
    if (paise === 4900) return 50;
    if (paise === 19900) return 250;
    if (paise === 39900) return 600;
    if (paise === 49900) return 1000;
    return 0; // Or proportional formula
}
