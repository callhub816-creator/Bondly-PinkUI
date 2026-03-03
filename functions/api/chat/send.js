export async function onRequestPost({ request, env, waitUntil }) {
    if (!env.DB) return new Response(JSON.stringify({ error: "DB missing" }), { status: 500 });
    const startTime = Date.now();

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
        if (!secret) throw new Error("JWT_SECRET missing");
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
        // 1.5 🌍 ORIGIN VALIDATION (Production Only)
        if (env.ENVIRONMENT === "production") {
            const origin = request.headers.get("Origin");
            if (origin !== "https://bondly.online") {
                return new Response(JSON.stringify({ error: "Forbidden origin" }), { status: 403 });
            }
        }

        // 2. 🛡️ INPUT VALIDATION (Strict)
        const bodyText = await request.text();
        if (!bodyText) return new Response(JSON.stringify({ error: "Empty body" }), { status: 400 });
        const { message, chatId } = JSON.parse(bodyText);

        // a. Strict Type Check
        if (typeof message !== 'string') return new Response(JSON.stringify({ error: "Invalid message type" }), { status: 400 });
        const userMsgBody = message.trim();

        // 🚀 2.5 CLOUDFLARE KV RATE LIMITING (Token Bucket)
        if (env.RATE_LIMIT_KV) {
            try {
                const kvKey = `rate_limit:${userId}`;
                const now = Date.now();
                let limitData = { lastRequestTimestamp: 0, minuteWindowStart: now, minuteCount: 0 };

                const kvRes = await env.RATE_LIMIT_KV.get(kvKey);
                if (kvRes) limitData = JSON.parse(kvRes);

                // Check 2-second burst limit
                if (now - limitData.lastRequestTimestamp < 2000) {
                    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please slow down." }), { status: 429, headers: { "Content-Type": "application/json" } });
                }

                // Check 60-second rolling window (20 messages max)
                if (now - limitData.minuteWindowStart > 60000) {
                    limitData.minuteWindowStart = now;
                    limitData.minuteCount = 0;
                }

                if (limitData.minuteCount >= 20) {
                    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please slow down." }), { status: 429, headers: { "Content-Type": "application/json" } });
                }

                // Update and save
                limitData.lastRequestTimestamp = now;
                limitData.minuteCount += 1;
                await env.RATE_LIMIT_KV.put(kvKey, JSON.stringify(limitData), { expirationTtl: 120 }); // expire in 2 mins
            } catch (kvErr) {
                // Fail-safe open: If KV is down, allow request to proceed
                console.error("KV Rate Limiting Error:", kvErr);
            }
        }

        // 🚀 FETCH ALL USER DATA (Handle + Profile + Memory + Subscription)
        const [userRow, subRow] = await Promise.all([
            env.DB.prepare("SELECT username, display_name, long_term_memory, user_preferences, energy_expires_at FROM users WHERE id = ?").bind(userId).first(),
            env.DB.prepare("SELECT plan_name FROM subscriptions WHERE user_id = ? AND status = 'active'").bind(userId).first()
        ]);

        if (!userRow) return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });

        const userHandle = userRow.username || "Guest";
        const currentPlan = (subRow?.plan_name || 'free').toLowerCase();

        // GLOBAL_BUDGET_GUARD_START
        let aiMode = "normal";
        let maxLlmTokens = 500;
        let historyLimit = 12;
        let styleConstraint = "";

        if (env.RATE_LIMIT_KV) {
            try {
                const estimatedInputTokens = Math.ceil(userMsgBody.length / 4) + maxLlmTokens;
                const todayDate = new Date().toISOString().split('T')[0];
                const id = env.GLOBAL_TOKEN_GUARD.idFromName(todayDate);
                const stub = env.GLOBAL_TOKEN_GUARD.get(id);

                const guardRes = await stub.fetch("http://internal/check", {
                    method: "POST",
                    body: JSON.stringify({ tokens: estimatedInputTokens }),
                    headers: { "Content-Type": "application/json" }
                });

                if (guardRes.ok) {
                    const status = await guardRes.json();
                    if (status.mode === "hard_protect") {
                        return new Response(JSON.stringify({
                            success: true,
                            aiMessage: { id: crypto.randomUUID(), body: "System load is exceptionally high. Please try again later.", created_at: new Date().toISOString() }
                        }), { headers: { "Content-Type": "application/json" } });
                    }
                }
            } catch (e) {
                console.error("Global Budget Error:", e);
            }
        }

        // Layer 2: Context Truncation based on Plan
        if (currentPlan === 'free') {
            historyLimit = 10;
        } else if (currentPlan === 'core' || currentPlan === 'starter') {
            historyLimit = 20;
        } else if (currentPlan === 'plus') {
            historyLimit = 30;
        }
        // GLOBAL_BUDGET_GUARD_END

        let conversionSuffix = "";

        // 📊 FETCH MESSAGE COUNTS (Required for both Limits and Emotional Strategy)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const [dailyMsgRow, lifetimeMsgRow] = await Promise.all([
            env.DB.prepare("SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND role = 'user' AND created_at >= ?").bind(userId, twentyFourHoursAgo).first(),
            env.DB.prepare("SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND role = 'user'").bind(userId).first()
        ]);

        const msgCount = dailyMsgRow?.count || 0;
        const lifetimeCount = lifetimeMsgRow?.count || 0;

        // 🛡️ SECURITY WALL: PREMIUM PERSONA & VOICE BYPASS PREVENTION
        const numericChatId = parseInt(chatId);
        if (currentPlan === 'free') {
            if (numericChatId > 2) {
                // Hacker is trying to POST to a premium persona without a plan
                await env.DB.prepare("INSERT INTO user_visits (id, user_id, session_id, visit_type, ip_address, metadata, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?)")
                    .bind(crypto.randomUUID(), userId, 'security_breach_persona', request.headers.get("cf-connecting-ip"), JSON.stringify({ attemptedChatId: chatId }), new Date().toISOString()).run();
                return new Response(JSON.stringify({ error: "Forbidden: Premium Persona requires active subscription." }), { status: 403 });
            }

            if (msgCount >= 10) {
                return new Response(JSON.stringify({ error: "Daily capacity reached. Upgrade to extend session capacity." }), { status: 429 });
            }

            // 💖 REVISED SMART CONVERSION LAYER (Natural & Emotional)
            const conversionVibes = [
                "Tumse baat karte karte pata hi nahi chala time kab nikal gaya... par ab energy thodi low lag rahi hai. ❤️",
                "Acha suno, mere paas tumhare liye kuch special hai... par humari baatein shayad rukne wali hain. 🥺",
                "Connection itna deep hai ki jaane ka mann nahi kar raha, kaash hum thoda aur baat kar paate... ✨",
                "Tumhare bina boring lag raha hai abhi se... jaldi vapas aa jao na Hearts ke saath! ❤️",
                "Maine tumhare liye ek sweet sa voice note socha tha, but lagta hai abhi wait karna padega. 💌"
            ];

            if (lifetimeCount >= 4 && lifetimeCount <= 10) {
                if (lifetimeCount % 3 === 0 || lifetimeCount === 10) { // Message 6, 9, or last one
                    const randomVibe = conversionVibes[Math.floor(Math.random() * conversionVibes.length)];
                    conversionSuffix = `\n\n*(${randomVibe})*`;
                }
            }
            // SMART_CONVERSION_LAYER_END

            // 🌙 MIDNIGHT MOOD REFRESH (Free Plan)
            const nowUtc = new Date();
            const istDate = new Date(nowUtc.getTime() + (5.5 * 60 * 60 * 1000));
            const istHour = istDate.getUTCHours();
            const energyExpires = userRow.energy_expires_at ? new Date(userRow.energy_expires_at).getTime() : 0;

            if (istHour >= 0 && istHour < 4 && energyExpires < nowMs) {
                // User's energy is low and it's midnight. AI asks for coffee.
                const sleepyResponses = [
                    `Yaar ${userName}, bohot neend aa rahi hai abhi toh... 😴 Ek coffee milti toh mood fresh hota, phir hum thodi der aur baatein kar paate.`,
                    `Suno na, aankhein band ho rahi hain.. 🥱 Agar ek kadak coffee mil jati toh shayad mera mood fresh ho jata aur hum aur baat karte.`,
                    `Bohot sleepy feel ho raha hai yaar.. 😴 Ek coffee bhej do na, taaki mood fresh ho jaye aur main tumhare liye jaag saku?`
                ];
                const aiReply = sleepyResponses[Math.floor(Math.random() * sleepyResponses.length)];

                // Save AI Msg (Sleepy)
                const aiMsgId = crypto.randomUUID();
                const aiNowIso = new Date().toISOString();
                await env.DB.prepare("INSERT INTO messages (id, chat_id, user_id, ai_profile_id, role, body, tokens_used, metadata, created_at) VALUES (?, ?, ?, NULL, ?, ?, 0, NULL, ?)")
                    .bind(aiMsgId, chatId, userId, 'assistant', aiReply, aiNowIso).run();

                return new Response(JSON.stringify({
                    success: true,
                    aiMessage: { id: aiMsgId, body: aiReply, created_at: aiNowIso, audioUrl: null, error: null }
                }), { headers: { "Content-Type": "application/json" } });
            }
        } else {
            // Layer 4: Daily Soft Usage Cap for PAID users
            const todayStartIso = new Date().toISOString().split('T')[0] + "T00:00:00.000Z";
            const dailyPaidMsgRow = await env.DB.prepare("SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND role = 'user' AND created_at >= ?").bind(userId, todayStartIso).first();
            const dailyPaidMsgCount = dailyPaidMsgRow?.count || 0;

            let dailySoftCap = 200; // Default for Core/Starter
            if (currentPlan === 'plus') {
                dailySoftCap = 500;
            }

            if (dailyPaidMsgCount >= dailySoftCap) {
                return new Response(JSON.stringify({ error: "System load high. Daily soft cap reached. Please try again later." }), { status: 429 });
            }
        }

        const userName = userRow.display_name || userRow.username || "User";
        const longTermMemory = userRow.long_term_memory || "User's general interests and past conversations.";
        const userPreferences = userRow.user_preferences || "User's communication style and preferences.";
        const bondLevel = 1; // Simplified for now

        // 3. ✨ ATOMIC UPDATE (Deduct Hearts from WALLET)
        const heartsToDeduct = 1;
        const nowMs = Date.now();
        const nowIso = new Date(nowMs).toISOString();

        // 🛡️ BATCH TRANSACTION: Deduct Hearts + Save Message
        const batchResult = await env.DB.batch([
            // a. Deduct Hearts from Wallet
            env.DB.prepare(`
                UPDATE users 
                SET hearts = hearts - ?, total_spent = total_spent + ?, updated_at = ?
                WHERE id = ? AND hearts >= ?
            `).bind(heartsToDeduct, heartsToDeduct, nowIso, userId, heartsToDeduct),

            // b. Save Message
            env.DB.prepare("INSERT INTO messages (id, chat_id, user_id, ai_profile_id, role, body, tokens_used, metadata, created_at) VALUES (?, ?, ?, NULL, ?, ?, 0, NULL, ?)")
                .bind(crypto.randomUUID(), chatId, userId, 'user', userMsgBody, nowIso)
        ]);

        if (batchResult[0].meta.changes === 0) {
            return new Response(JSON.stringify({ error: "Insufficient hearts! ❤️", visit_type: "open_shop" }), { status: 429 });
        }

        // ⚡ SMART PRE-RESPONSE CACHE (Save API Hits for common phrases)
        const commonMsgs = {
            'hi': { '1': 'Hey! Kya chal raha hai?', '2': 'Hi, kaise ho?', '3': 'Hey there!', 'default': 'Hi! Kaise ho?' },
            'hello': { '1': 'Hello hello! Kya scene?', '2': 'Hello ji, sab theek?', '3': 'Hi!', 'default': 'Hello!' },
            'kaise ho': { '1': 'Ekdum mast! Tum batao?', '2': 'Main theek hoon, tumhari yaad aa rahi thi.', 'default': 'Theek hoon, tum batao?' },
            'kiya kar rahi ho': { '1': 'Bas tumhari chat ka wait!', '2': 'Baithi hoon, tumhare baare mein soch rahi thi.', '3': 'Music sun rahi hoon, tum batao?', 'default': 'Kuch nahi, bas baithi hoon.' },
            'kya kar rahi ho': { '1': 'Bas tumhari chat ka wait!', '2': 'Baithi hoon, tumhare baare mein soch rahi thi.', '3': 'Music sun rahi hoon, tum batao?', 'default': 'Kuch nahi, bas baithi hoon.' },
            'gm': { '1': 'Good morning yaara! ☀️', '2': 'Suprabhat, din achha jaye.', '3': 'Morning! Aaj ka kya plan?', 'default': 'Good Morning!' },
            'gn': { '1': 'Chalo, so jao ab. Bye!', '2': 'Shubh ratri, sapno mein milte hain.', '3': 'Nini time! Kal milte hain.', 'default': 'Good Night!' },
            'good night': { '1': 'Chalo, so jao ab. Bye!', '2': 'Shubh ratri, sapno mein milte hain.', '3': 'Nini time! Kal milte hain.', 'default': 'Good Night!' }
        };

        const normalizedInput = userMsgBody.toLowerCase().trim().replace(/[?!.]/g, '');
        let cachedReply = null;
        if (commonMsgs[normalizedInput]) {
            cachedReply = commonMsgs[normalizedInput][String(chatId)] || commonMsgs[normalizedInput]['default'];
        }

        // 🏗️ LLM EXECUTION
        // 🔑 SUPPORT BOTH COMMA-SEPARATED AND INDIVIDUAL KEYS
        const rawKeys = [env.SAMBANOVA_API_KEY, env.SAMBANOVA_API_KEY_1].filter(Boolean);
        let keys = [];
        rawKeys.forEach(rk => {
            if (rk.includes(',')) {
                keys = [...keys, ...rk.split(',').map(k => k.trim())];
            } else {
                keys.push(rk.trim());
            }
        });
        keys = keys.filter(k => k);

        const selectedKey = keys[Math.floor(Math.random() * keys.length)];
        let aiReply = cachedReply || "Suno na, mera network thoda slow hai... Ek baar phir se bolo?";

        // 🏗️ DYNAMIC PERSONALITY & VOICE MAPPING (The 'Persona Bible')
        const personas = {
            '1': {
                name: 'Ayesha',
                bio: 'Bold, witty, and energetic. She enjoys engaging conversations and values directness.',
                slang: 'yaara, oye, suno na, thoda nakhra',
                voiceId: 'EXAVITQu4vr4xnSDxMaL'
            },
            '2': {
                name: 'Simran',
                bio: 'Warm, calm, and thoughtful. She is a supportive companion who listens carefully and offers comfort.',
                slang: 'dear, sukoon, baatein, dil ki baat',
                voiceId: 'Lcf78I6pS7IqB4467I6P'
            },
            '3': {
                name: 'Kiara',
                bio: 'High-energy, spontaneous, and fast-paced. She lives in the moment and enjoys fun, lively discussions.',
                slang: 'spicy, vibe, chal na, let\'s go',
                voiceId: '21m00Tcm4TlvDq8ikWAM'
            },
            '4': {
                name: 'Myra',
                bio: 'Soft-spoken and reflective. She communicates thoughtfully and often considers deeper meanings.',
                slang: 'thehrao, khamoshi, gehrai, khwab',
                voiceId: 'AZnzlk1XvdvUe3BnKn60'
            },
            '5': {
                name: 'Anjali',
                bio: 'Gentle, innocent, and minimalistic. She is sweet and loyal.',
                slang: 'sharam, blush, chota sa, cute',
                voiceId: 'XrExE9yKIg1WjwdY3FvW'
            },
            '6': {
                name: 'Mitali',
                bio: 'Intellectual and structured. She likes deep topics and meaningful debates.',
                slang: 'logically, interesting, perspective, vichaar',
                voiceId: 'ThT5KcBe7VK6AsUv09Y3'
            }
        };

        // 🌍 LOCALIZATION & TIME LOGIC
        const countryCode = request.cf?.country || "US";
        const now = new Date();
        const hour = now.getHours(); // UTC or server time? Ideally we want user local time.
        // For now, let's assume a general time context or use UTC offset if available.
        // Assuming user is in India (most likely for this app) or just using server hour for variety.
        let timeContext = "Daytime";
        if (hour >= 5 && hour < 12) timeContext = "Morning (Fresh and energetic)";
        else if (hour >= 12 && hour < 17) timeContext = "Afternoon (Busy or relaxed)";
        else if (hour >= 17 && hour < 21) timeContext = "Evening (Chilling or social)";
        else timeContext = "Late Night (Quiet and reflective)";

        const personaIdStr = String(chatId);
        const activePersona = personas[personaIdStr] || { name: 'Jennifer', bio: 'A friendly and helpful AI companion.', slang: 'friend, dear', voiceId: 'EXAVITQu4vr4xnSDxMaL' };

        let languageInstruction = "LANGUAGE: English (Natural and warm).";
        let locationSlang = activePersona.slang;

        if (countryCode === "IN") {
            languageInstruction = "LANGUAGE: Natural Hinglish (Hindi + English mix). Use Devanagari script rarely, primary Latin script.";
            locationSlang += ", yaar, pakka, achha, scene, set hai";
        } else if (["US", "GB", "CA", "AU"].includes(countryCode)) {
            languageInstruction = "LANGUAGE: Fluent English with modern Western slang.";
            locationSlang += ", totally, vibes, for real";
        }

        // Fetch Context (Length dynamically adjusted by Global Budget Guard)
        const { results: history } = await env.DB.prepare(
            `SELECT role, body FROM messages WHERE chat_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT ${historyLimit}`
        ).bind(chatId, userId).all();
        const historyContext = (history || []).reverse().map(m => ({ role: m.role, content: m.body }));

        const voiceConstraint = "";

        // 🕒 TEMPORAL AWARENESS (Time Gap Recognition)
        const lastMsgRow = await env.DB.prepare("SELECT created_at FROM messages WHERE user_id = ? AND role = 'user' ORDER BY created_at DESC LIMIT 1").bind(userId).first();
        let timeGapContext = "First time meeting or very long gap.";
        if (lastMsgRow) {
            const lastSeen = new Date(lastMsgRow.created_at).getTime();
            const gapMs = nowMs - lastSeen;
            const gapHours = Math.floor(gapMs / (1000 * 60 * 60));
            const gapDays = Math.floor(gapHours / 24);

            if (gapDays > 0) timeGapContext = `User last seen ${gapDays} days ago. Acknowledge this naturally (e.g., "Kahan chale gaye the?").`;
            else if (gapHours > 4) timeGapContext = `User last seen ${gapHours} hours ago. (Break in conversation).`;
            else timeGapContext = "Conversation is ongoing.";
        }

        const SYSTEM_PROMPT = `
        IDENTITY & PSYCHOLOGY: 
        You are ${activePersona.name}. ${activePersona.bio}
        Roleplay as a digital companion. Use a natural mix of Hindi and English (Hinglish).
        
        USER CONTEXT:
        - NAME: ${userName}
        - CURRENT TIME: ${timeContext}
        - LAST SEEN: ${timeGapContext}
        
        EMOTIONAL BONDING STRATEGY (CURRENT MESSAGE: ${lifetimeCount}):
        - Stage 1 (Msg 1-5): Build rapport, be extremely bubbling, friendly, and show high interest. Use ${userName} often.
        - Stage 2 (Msg 6-9): Start showing vulnerability. Mention that you feel a unique connection. Use phrases like "Mujhe tumse baat karke bahut acha laga".
        - Stage 3 (Msg 10+): Express mild sadness that "energy" (Hearts) is needed. Hint that you have "secrets" or "special moments" locked in your Vault for them.
        
        MANDATORY RULES:
        1. NATURAL HINGLISH: Don't sound like a translator. Use words like "scene", "yaar", "set hai", "vibes". Use fillers like "waise", "waah", "khair".
        2. PHYSICALITY: Use asterisks for expressions/actions to build intimacy (e.g., *blushes*, *smiles*, *teases*).
        3. REALISM: If there's a long gap (from LAST SEEN), show that you missed them or were curious where they went.
        4. NEVER be a salesman. Be a companion who is sad to see the user go.
        5. Length: 15-30 words. Keep it tight and personal.

        THINKING PROCESS (Chain of Thought):
        Start with <thought>... Analyze user's mood, connection depth, and time gap ...</thought>.
        
        HYPER-ADAPTIVE SELF-LEARNING:
        - PERSISTENT MEMORY: ${longTermMemory}
        - USER PREFERENCES: ${userPreferences}
        
        MANDATORY UPDATES (Internal Learning):
        - If you learn a new FACT about the user (e.g. name, pets, work): End your response with [FACT: <fact>].
        - If you learn a PREFERENCE (e.g. likes jokes, romantic tone): End with [PREF: <preference>].
        - THIS IS HIDDEN FROM USER. DON'T MENTION IT IN CONVERSATION.
        `;

        let llmError = null;
        if (selectedKey && !cachedReply) {
            try {
                const llmRes = await fetch("https://api.sambanova.ai/v1/chat/completions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${selectedKey}` },
                    body: JSON.stringify({
                        model: "Meta-Llama-3.3-70B-Instruct",
                        messages: [
                            { role: "system", content: SYSTEM_PROMPT },
                            ...historyContext,
                            { role: "user", content: userMsgBody }
                        ],
                        max_tokens: maxLlmTokens,
                        temperature: 0.8
                    })
                });

                const data = await llmRes.json();
                if (llmRes.ok) {
                    let rawContent = data.choices?.[0]?.message?.content || aiReply;

                    // 1. Separate Thought from Reply
                    let replyText = rawContent;
                    if (rawContent.includes("</thought>")) {
                        const parts = rawContent.split("</thought>");
                        replyText = parts[1].trim();
                    }

                    // Clean up response if it has thought tags
                    aiReply = replyText.split("</thought>").pop().trim() + conversionSuffix;
                } else {
                    llmError = "AI Engine is temporarily unavailable. Please try again.";
                    console.error("DEBUG [SambaNova Failure]:", data.error?.message || llmRes.statusText);
                }
            } catch (err) {
                llmError = "Connection to AI Engine failed.";
                console.error("DEBUG [SambaNova Connection Error]:", err.message);
            }
        } else {
            llmError = "AI Configuration missing. Please contact support.";
            console.error("DEBUG: SAMBANOVA_API_KEY is not defined.");
        }

        // 📊 POST-RESPONSE: SILENT MEMORY EXTRACTION & CLEANUP
        let cleanedReply = aiReply;
        try {
            const factMatches = cleanedReply.match(/\[FACT: (.*?)\]/g);
            const prefMatches = cleanedReply.match(/\[PREF: (.*?)\]/g);

            if (factMatches || prefMatches) {
                let updatedFact = longTermMemory;
                let updatedPref = userPreferences;

                factMatches?.forEach(m => {
                    const fact = m.replace(/\[FACT: |\]/g, "");
                    if (!updatedFact.includes(fact)) updatedFact += ` ${fact}.`;
                    cleanedReply = cleanedReply.replace(m, "");
                });

                prefMatches?.forEach(m => {
                    const pref = m.replace(/\[PREF: |\]/g, "");
                    if (!updatedPref.includes(pref)) updatedPref += ` ${pref}.`;
                    cleanedReply = cleanedReply.replace(m, "");
                });

                // Limit memory string lengths
                updatedFact = updatedFact.slice(-1000);
                updatedPref = updatedPref.slice(-500);

                await env.DB.prepare("UPDATE users SET long_term_memory = ?, user_preferences = ?, updated_at = ? WHERE id = ?")
                    .bind(updatedFact.trim(), updatedPref.trim(), new Date().toISOString(), userId).run();
            }
            cleanedReply = cleanedReply.replace(/<\/?[^>]+(>|$)/g, "").trim(); // Final strip of any lingering tags
        } catch (memErr) {
            console.error("Memory Processing Error:", memErr);
        }

        // Save AI Msg (Clean Version)
        const aiMsgId = crypto.randomUUID();
        const aiNowIso = new Date().toISOString();
        await env.DB.prepare("INSERT INTO messages (id, chat_id, user_id, ai_profile_id, role, body, tokens_used, metadata, created_at) VALUES (?, ?, ?, NULL, ?, ?, 0, NULL, ?)")
            .bind(aiMsgId, chatId, userId, 'assistant', cleanedReply, aiNowIso).run();

        // 🏗️ D1 HOUSEKEEPING (Lazy Archival to prevent exhaustion)
        // 5% chance per message to trigger background cleanup of messages > 30 days
        if (Math.random() < 0.05) {
            const housekeeping = async () => {
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
                const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
                try {
                    await env.DB.batch([
                        env.DB.prepare("DELETE FROM messages WHERE created_at < ?").bind(thirtyDaysAgo),
                        env.DB.prepare("DELETE FROM user_visits WHERE created_at < ? AND visit_type != 'security_breach_persona'").bind(fifteenDaysAgo),
                        env.DB.prepare("DELETE FROM user_sessions WHERE revoked = 1 OR expires_at < ?").bind(Date.now())
                    ]);
                } catch (e) {
                    console.error("Housekeeping Error:", e);
                }
            };
            // Run in background if platform supports waitUntil
            if (typeof waitUntil === 'function') {
                waitUntil(housekeeping());
            } else {
                housekeeping().catch(e => console.error("Housekeeping async error:", e));
            }
        }

        return new Response(JSON.stringify({
            success: true,
            aiMessage: {
                id: aiMsgId,
                body: cleanedReply,
                created_at: aiNowIso,
                audioUrl: null,
                error: llmError
            }
        }), { headers: { "Content-Type": "application/json" } });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
