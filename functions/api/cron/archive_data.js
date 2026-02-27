export default {
    async scheduled(event, env, ctx) {
        ctx.waitUntil(handleCron(event, env));
    }
};

async function handleCron(event, env) {
    console.log(`[CRON LOG] Data Archival Triggered at ${new Date().toISOString()}`);
    try {
        // We only delete messages from users on the "free" or "starter" plans that are older than 30 days.
        // Or if you want to be more aggressive, free users older than 7 days.
        // However, the cleanest approach that doesn't rely on complex joins is just cleaning up 
        // really old messages indiscriminately or messages older than 30 days where role='assistant' etc.

        // We will delete ALL messages older than 30 days to prevent D1 exhaustion. 
        // 30 days is plenty for a conversational chat app frontend.

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        // 1. Clean Messages Table
        const msgResult = await env.DB.prepare(
            "DELETE FROM messages WHERE created_at < ?"
        ).bind(thirtyDaysAgo).run();

        // 2. Clean User Visits (Analytics / Logs) older than 15 days to save space
        const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
        const visitResult = await env.DB.prepare(
            "DELETE FROM user_visits WHERE created_at < ?"
        ).bind(fifteenDaysAgo).run();

        // 3. Clean Expired and Revoked Sessions
        const sessionResult = await env.DB.prepare(
            "DELETE FROM user_sessions WHERE revoked = 1 OR expires_at < ?"
        ).bind(Date.now()).run();

        console.log(`[CRON LOG SUCCESS] Messages Deleted: ${msgResult.meta.changes}, Visits Deleted: ${visitResult.meta.changes}, Sessions Deleted: ${sessionResult.meta.changes}`);

    } catch (error) {
        console.error(`[CRON ERR] Fail during DB archive: ${error.message}`);
    }
}
