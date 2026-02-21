export async function onRequestPost({ request, env }) {
    try {
        const body = await request.json();
        const amount = body.amount;

        const keyId = (env.RAZORPAY_KEY_ID || "").trim();
        const keySecret = (env.RAZORPAY_KEY_SECRET || "").trim();

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
                amount: amount || 9900,
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
