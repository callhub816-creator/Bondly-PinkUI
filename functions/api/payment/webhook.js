export async function onRequestPost({ request, env }) {
    if (!env.DB) return new Response(JSON.stringify({ error: "DB missing" }), { status: 500 });

    const signature = request.headers.get('x-razorpay-signature');
    const secret = env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !secret) {
        return new Response("Missing signature or secret", { status: 400 });
    }

    const bodyText = await request.text();

    try {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );
        const generatedSignatureArray = await crypto.subtle.sign("HMAC", key, encoder.encode(bodyText));
        const generatedSignature = [...new Uint8Array(generatedSignatureArray)]
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");

        if (generatedSignature !== signature) {
            return new Response("Invalid signature", { status: 401 });
        }
    } catch (e) {
        return new Response("Signature verification failed", { status: 500 });
    }

    const payload = JSON.parse(bodyText);

    // Only process payment.authorized or order.paid events (depending on webhook config)
    // We'll assume payment.authorized
    if (payload.event !== 'payment.authorized' && payload.event !== 'payment.captured') {
        return new Response("Event not handled", { status: 200 });
    }

    const payment = payload.payload.payment.entity;
    const razorpay_order_id = payment.order_id;
    const razorpay_payment_id = payment.id;
    const amountPaid = payment.amount;

    // Fetch user context if passed via notes, otherwise we might not know who to credit if verify.js wasn't called.
    // Assuming user_id is passed in notes during order creation
    const userId = payment.notes?.user_id;
    if (!userId) {
        return new Response("User ID missing in payment notes", { status: 400 });
    }

    let heartsToAdd = 0;
    let setTier = null;

    if (amountPaid === 4900) { heartsToAdd = 50; setTier = 'STARTER'; }
    else if (amountPaid === 19900) { heartsToAdd = 250; setTier = 'CORE'; }
    else if (amountPaid === 39900) { heartsToAdd = 600; }
    else if (amountPaid === 49900) { heartsToAdd = 1000; setTier = 'PLUS'; }
    else { return new Response("Invalid amount", { status: 400 }); }

    const nowIso = new Date().toISOString();

    const queries = [
        env.DB.prepare(`
            UPDATE users 
            SET hearts = hearts + ?, total_earned = total_earned + ?, updated_at = ?
            WHERE id = ?
        `).bind(heartsToAdd, amountPaid / 100, nowIso, userId),

        env.DB.prepare(`
            INSERT INTO wallet_transactions (id, user_id, amount, balance_after, type, reason, reference_id, ip_address, created_at) 
            VALUES (?, ?, ?, 0, 'payment', 'razorpay_webhook', ?, NULL, ?)
        `).bind(crypto.randomUUID(), userId, amountPaid / 100, razorpay_order_id, nowIso)
    ];

    if (setTier) {
        queries.push(
            env.DB.prepare("UPDATE subscriptions SET plan_name = ?, status = 'active', started_at = ? WHERE user_id = ?")
                .bind(setTier, nowIso, userId)
        );
    }

    try {
        await env.DB.batch(queries);
        return new Response("Webhook processed", { status: 200 });
    } catch (e) {
        // If the error is UNIQUE constraint violation on reference_id (idx_wallet_tx_ref),
        // it means idempotency worked and the payment was already processed.
        if (e.message.includes('UNIQUE constraint failed')) {
            return new Response("Already processed", { status: 200 });
        }
        return new Response("Database error", { status: 500 });
    }
}
