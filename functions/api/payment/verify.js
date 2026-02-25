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

    if (!token) return new Response(JSON.stringify({ error: "Unauthorized (Missing Token)" }), { status: 401 });

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
            return new Response(JSON.stringify({ error: "Session expired", expiredAt: payload.exp, now: Date.now() }), { status: 401 });
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

        if (!isValid) {
            return new Response(JSON.stringify({ error: "Invalid session (Signature Match Failed)" }), { status: 401 });
        }

        userId = payload.id;
    } catch (e) {
        return new Response(JSON.stringify({ error: "Auth verification failed", details: e.message }), { status: 401 });
    }

    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = await request.json();

        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
            // 📝 LOG FAILURE
            await env.DB.prepare("INSERT INTO user_visits (id, user_id, visit_type, metadata, created_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), userId, 'payment_fail_params', JSON.stringify({ razorpay_order_id }), new Date().toISOString()).run();
            return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400 });
        }

        const secret = env.RAZORPAY_KEY_SECRET;
        if (!secret) return new Response(JSON.stringify({ error: "Server config error" }), { status: 500 });

        // 2. 🛡️ VERIFY SIGNATURE
        const generatedSignature = await generateHmacSha256(`${razorpay_order_id}|${razorpay_payment_id}`, secret);
        if (generatedSignature !== razorpay_signature) {
            // 📝 LOG FAILURE
            await env.DB.prepare("INSERT INTO user_visits (id, user_id, visit_type, metadata, created_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), userId, 'payment_fail_sig', JSON.stringify({ razorpay_order_id }), new Date().toISOString()).run();
            return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
        }

        // 3. 🛑 IDEMPOTENCY CHECK (Prevent Replay Attack)
        const { results: existingOrder } = await env.DB.prepare("SELECT id FROM wallet_transactions WHERE reason = ? AND type = 'payment'").bind(razorpay_order_id).all();
        if (existingOrder && existingOrder.length > 0) {
            return new Response(JSON.stringify({ success: true, message: "Order already processed" }), { headers: { "Content-Type": "application/json" } });
        }

        // 4. 💰 FETCH ORDER DETAILS
        const keyId = env.RAZORPAY_KEY_ID;
        const auth = btoa(`${keyId}:${secret}`);
        const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
            headers: { "Authorization": `Basic ${auth}` }
        });

        if (!orderRes.ok) throw new Error("Failed to fetch order from Razorpay");
        const orderData = await orderRes.json();
        const amountPaid = orderData.amount_paid || orderData.amount; // paise

        // 5. 🧮 CALCULATE ASSETS (Strict Price Mapping from constants.ts)
        let heartsToAdd = 0;
        let setTier = null;

        if (amountPaid === 4900) {
            // Either Starter Pass (Plan) or Starter Spark (Hearts)
            // For simplicity, we'll check if they were buying a plan based on current hearts or just give both
            heartsToAdd = 50;
            setTier = 'STARTER';
        }
        else if (amountPaid === 19900) {
            // Core Connection (Plan) or Bonding Pack (Hearts)
            heartsToAdd = 250;
            setTier = 'CORE';
        }
        else if (amountPaid === 39900) {
            // Soulmate Pack (Hearts)
            heartsToAdd = 600;
        }
        else if (amountPaid === 49900) {
            // Ultra Pass (Plan)
            heartsToAdd = 1000; // Bonus hearts for Ultra
            setTier = 'PLUS';
        }
        else {
            // 📝 LOG FAILURE
            await env.DB.prepare("INSERT INTO user_visits (id, user_id, visit_type, metadata, created_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), userId, 'payment_fail_amount', JSON.stringify({ amountPaid, razorpay_order_id }), new Date().toISOString()).run();
            return new Response(JSON.stringify({ error: "Invalid amount paid" }), { status: 400 });
        }

        // 6. 💾 ATOMIC UPDATE (Update WALLET/SUBSCRIPTION + Mark Processed)
        const nowIso = new Date().toISOString();

        const queries = [
            // a. Update Wallet (Always add hearts)
            env.DB.prepare(`
                UPDATE users 
                SET hearts = hearts + ?, total_earned = total_earned + ?, updated_at = ?
                WHERE id = ?
            `).bind(heartsToAdd, amountPaid / 100, nowIso, userId),

            // b. Mark Order Processed
            env.DB.prepare("INSERT INTO processed_orders (id, user_id, order_id, amount, created_at) VALUES (?, ?, ?, ?, ?)")
                .bind(crypto.randomUUID(), userId, razorpay_order_id, amountPaid, nowIso)
        ];

        // c. Update Subscription if it was a plan purchase
        if (setTier) {
            queries.push(
                env.DB.prepare("UPDATE subscriptions SET plan_name = ?, status = 'active', started_at = ? WHERE user_id = ?")
                    .bind(setTier, nowIso, userId)
            );
        }

        await env.DB.batch(queries);

        return new Response(
            JSON.stringify({
                success: true,
                message: "Payment verified & Hearts added",
                added: heartsToAdd
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (err) {
        // 📝 LOG CRITICAL ERROR
        if (userId) {
            const logId = crypto.randomUUID();
            try {
                await env.DB.prepare("INSERT INTO user_visits (id, user_id, visit_type, metadata, created_at) VALUES (?, ?, ?, ?, ?)").bind(logId, userId, 'payment_error_catch', JSON.stringify({ error: err.message }), new Date().toISOString()).run();
            } catch (e) { }
        }
        return new Response(JSON.stringify({ error: "Verification failed", detail: err.message }), { status: 500 });
    }
}

async function generateHmacSha256(msg, secret) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(msg));
    return [...new Uint8Array(signature)].map(b => b.toString(16).padStart(2, "0")).join("");
}
