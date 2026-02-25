
export default {
    async scheduled(event, env, ctx) {
        ctx.waitUntil(runSentinel(env));
    },
    async fetch(request, env) {
        // Manual trigger for testing
        if (new URL(request.url).pathname === "/trigger-sentinel") {
            const results = await runSentinel(env);
            return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
        }
        return new Response("Sentinel is active.");
    }
};

async function runSentinel(env) {
    const report = {
        timestamp: new Date().toISOString(),
        anomalies: [],
        checks: {}
    };

    try {
        const timeRange = new Date(Date.now() - 5 * 60000).toISOString(); // Last 5 mins

        // 1. Check 500 Errors Spike
        const { count: errorCount } = await env.DB.prepare("SELECT COUNT(*) as count FROM user_visits WHERE visit_type = 'error' AND created_at > ?")
            .bind(timeRange).first();
        report.checks.server_errors = errorCount;
        if (errorCount > 10) report.anomalies.push(`🔴 CRITICAL: ${errorCount} server errors detected in last 5 mins.`);

        // 2. Check Payment Signature Failures (Fraud attempt)
        const { count: paymentFails } = await env.DB.prepare("SELECT COUNT(*) as count FROM user_visits WHERE visit_type = 'payment_fail_sig' AND created_at > ?")
            .bind(timeRange).first();
        report.checks.payment_fraud_attempts = paymentFails;
        if (paymentFails > 0) report.anomalies.push(`🟡 WARNING: ${paymentFails} invalid payment signature attempts detected.`);

        // 3. Check Wallet Spikes (Abnormal spending)
        const { count: walletSpikes } = await env.DB.prepare("SELECT COUNT(*) as count FROM wallet_transactions WHERE change_amount < -500 AND created_at > ?")
            .bind(timeRange).first();
        report.checks.heavy_spending = walletSpikes;
        if (walletSpikes > 2) report.anomalies.push(`🔴 ALERT: ${walletSpikes} high-value heart transactions detected.`);

        // 4. Brute Force Login Attempts
        const bruteForceIps = await env.DB.prepare(`
            SELECT details->>'$.ip' as ip, COUNT(*) as count 
            FROM user_visits 
            WHERE visit_type = 'login_fail' AND created_at > ? 
            GROUP BY ip HAVING count > 10
        `).bind(timeRange).all();

        if (bruteForceIps.results?.length > 0) {
            report.anomalies.push(`🔴 BRUTE FORCE: ${bruteForceIps.results.length} IPs are attempting multiple login failures.`);
            report.checks.brute_force_ips = bruteForceIps.results;

            // 🛡️ ACTION: Add to Guardian Block List (Auto-Shield)
            for (const row of bruteForceIps.results) {
                if (env.GUARDIAN_KV) {
                    await env.GUARDIAN_KV.put(`block:${row.ip}`, "true", { expirationTtl: 3600 });
                }
            }
        }

        // 5. SEND ALERT IF ANOMALIES FOUND
        if (report.anomalies.length > 0) {
            await sendAlert(env, report);
        }

        return report;
    } catch (err) {
        console.error("Sentinel Error:", err);
        return { error: err.message };
    }
}

async function sendAlert(env, report) {
    const webhookUrl = env.SENTINEL_WEBHOOK_URL;
    if (!webhookUrl) return;

    const message = {
        text: `🚨 *Bondly Sentinel Alert*\n\n` +
            report.anomalies.join("\n") +
            `\n\n_Time: ${report.timestamp}_`
    };

    await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message)
    });
}
