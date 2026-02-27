export async function onRequestPost({ request, env }) {
    try {
        const body = await request.json();
        const planId = body.planId || body.amount; // Fallback for backward compatibility if needed, but ideally enforce planId

        // Strict server-side pricing map (in paise)
        const PRICING_MODEL = {
            '50': 4900,
            '250': 19900,
            '600': 39900,
            '1000': 49900,
            'starter': 4900,
            'core': 19900,
            'plus': 49900,
            // Fallbacks for direct numeric references used in ShopModal currently
            '49': 4900,
            '199': 19900,
            '399': 39900,
            '499': 49900
        };

        const amount = PRICING_MODEL[planId] || (typeof planId === 'number' ? planId : null);

        if (!amount) {
            return new Response(JSON.stringify({ error: "Invalid pricing plan" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        const keyId = (env.RAZORPAY_KEY_ID || "").trim();
        const keySecret = (env.RAZORPAY_KEY_SECRET || "").trim();

        if (env.ENVIRONMENT === 'production' && keyId.startsWith('rzp_test_')) {
            return new Response(JSON.stringify({ error: "Test keys not permitted in production" }), { status: 500, headers: { "Content-Type": "application/json" } });
        }

        if (!keyId || !keySecret) {
            return new Response(JSON.stringify({
                error: "Razorpay credentials missing",
                detail: "Check Cloudflare Environment Variables for RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET"
            }), { status: 500, headers: { "Content-Type": "application/json" } });
        }

        const auth = btoa(`${keyId}:${keySecret}`);

        const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                amount: amount,
                currency: "INR",
                receipt: `order_rcptid_${Date.now()}`
            })
        });

        const orderData = await razorpayRes.json();

        if (!razorpayRes.ok) {
            // Razorpay errors are usually orderData.error.description
            const specificDesc = orderData.error?.description || JSON.stringify(orderData);
            return new Response(JSON.stringify({
                error: `Razorpay API Error (${razorpayRes.status}): ${specificDesc}`,
                detail: orderData
            }), { status: razorpayRes.status, headers: { "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({
            ...orderData,
            key_id: keyId
        }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({
            error: "Order creation failed",
            detail: err.message
        }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}
