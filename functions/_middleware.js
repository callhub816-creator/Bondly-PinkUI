
export async function onRequest({ request, next, env }) {
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const now = Date.now();
    const minuteAgo = now - 60000;

    // 🛡️ PHASE 2: GUARDIAN (Runtime Defense)
    const adminIp = env.ADMIN_IP || "127.0.0.1";
    const emergencyDisable = env.GUARDIAN_MODE === "OFF";

    if (!emergencyDisable && ip !== adminIp) {
        try {
            // 1. Check if IP is explicitly blocked
            const isBlocked = await env.GUARDIAN_KV?.get(`block:${ip}`);
            if (isBlocked) {
                return new Response(JSON.stringify({
                    error: "Your IP has been temporarily flagged for suspicious activity. (Guardian Block)",
                    expiry: "1 Hour"
                }), { status: 403, headers: { "Content-Type": "application/json" } });
            }

            // 2. High-Performance Rate Limiting (Using KV)
            const kvKey = `hits:${ip}:${Math.floor(now / 60000)}`; // Per minute bucket
            const hits = (parseInt(await env.GUARDIAN_KV?.get(kvKey)) || 0) + 1;

            await env.GUARDIAN_KV?.put(kvKey, hits.toString(), { expirationTtl: 120 });

            // Threshold: 100 requests per minute
            if (hits > 100) {
                await env.GUARDIAN_KV?.put(`block:${ip}`, "true", { expirationTtl: 3600 }); // Block for 1 hour

                // 📝 Log the block event in D1 for audit (Fixed table name and columns)
                await env.DB.prepare("INSERT INTO user_visits (id, user_id, session_id, visit_type, ip_address, metadata, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?)")
                    .bind(crypto.randomUUID(), "SYSTEM", "guardian_block", ip, JSON.stringify({ hits }), new Date().toISOString()).run();

                return new Response(JSON.stringify({ error: "Guardian: Attack detected. IP blocked for 1 hour." }), { status: 403 });
            }
        } catch (e) {
            console.error("Guardian KV Error:", e.message);
            // Fail-open: if KV fails, don't crash the site
        }
    }

    // 🛡️ PHASE 2.5: STRICT ORIGIN SPOOFING / CSRF PROTECTION
    if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
        const origin = request.headers.get("Origin");

        if (origin) {
            try {
                const originUrl = new URL(origin);
                const hostname = originUrl.hostname;
                const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
                const isProd = hostname === "bondly.online" || hostname.endsWith(".bondly.online");
                const isPreview = hostname.endsWith(".pages.dev");

                if (!isLocal && !isProd && !isPreview) {
                    return new Response(JSON.stringify({ error: "Forbidden: Invalid Origin Blocked (CSRF Guard)" }), { status: 403, headers: { "Content-Type": "application/json" } });
                }
            } catch (e) {
                return new Response(JSON.stringify({ error: "Forbidden: Malformed Origin" }), { status: 403, headers: { "Content-Type": "application/json" } });
            }
        } else {
            // Strict enforce: If there is no Origin on a POST (e.g. from Postman or cURL), block it.
            return new Response(JSON.stringify({ error: "Forbidden: Missing Origin Header (CSRF Guard)" }), { status: 403, headers: { "Content-Type": "application/json" } });
        }
    }

    const response = await next();

    // 2. 🔒 SECURITY HEADERS (Production Hardening)
    const newHeaders = new Headers(response.headers);
    const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://static.cloudflareinsights.com https://apis.google.com https://www.gstatic.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https://*",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' https://api.sambanova.ai https://api.elevenlabs.io https://*.elevenlabs.io https://cloudflareinsights.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
        "frame-src 'self' https://api.razorpay.com https://bondly-9ec57.firebaseapp.com https://*.firebaseapp.com https://accounts.google.com",
        "media-src 'self' data: https://*",
        "worker-src 'self' blob:"
    ].join("; ");

    newHeaders.set("Content-Security-Policy", csp);
    newHeaders.set("X-Frame-Options", "DENY");
    newHeaders.set("X-Content-Type-Options", "nosniff");
    newHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
    newHeaders.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
    });
}
