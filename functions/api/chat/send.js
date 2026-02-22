export async function onRequestPost({ request, env }) {
    if (!env.DB) return new Response(JSON.stringify({ error: "DB missing" }), { status: 500 });
    const startTime = Date.now();

    // 1. 🔒 AUTH CHECK (Hardened)
    const cookieHeader = request.headers.get("Cookie") || "";
    const authHeader = request.headers.get("Authorization") || "";

    let token = null;
    if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
    } else {
        const cookies = Object.fromEntries(cookieHeader.split(";").map(c => c.trim().split("=")));
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
        // 2. 🛡️ INPUT VALIDATION (Strict)
        const bodyText = await request.text();
        if (!bodyText) return new Response(JSON.stringify({ error: "Empty body" }), { status: 400 });
        const { message, chatId, isVoiceNote } = JSON.parse(bodyText);

        // a. Strict Type Check
        if (typeof message !== 'string') return new Response(JSON.stringify({ error: "Invalid message type" }), { status: 400 });
        const userMsgBody = message.trim();

        // 🚀 FETCH ALL USER DATA (Handle + Profile + Memory)
        const userRow = await env.DB.prepare("SELECT username, profile_data FROM users WHERE id = ?").bind(userId).first();
        if (!userRow) return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });

        const userHandle = userRow.username || "Guest";
        const userProfile = JSON.parse(userRow.profile_data || "{}");
        const userName = userProfile.nickname || userProfile.displayName || "Mere Jaan";
        const userGoal = userProfile.lookingFor || "Building a romantic bond";
        const longTermMemory = userProfile.long_term_memory || "Nothing yet, we just started our journey.";
        const bondLevel = userProfile.bond_level || 1;

        // 3. ✨ ATOMIC UPDATE (Deduct Hearts from WALLET + Rate Limit Check on USER)
        const heartsToDeduct = isVoiceNote ? 3 : 1;
        const nowMs = Date.now();
        const rateLimitThreshold = nowMs - 1500; // 1.5s spam protection
        const nowIso = new Date(nowMs).toISOString();

        // 🛡️ BATCH TRANSACTION: Check Rate Limit + Deduct Hearts + Save Message
        const batchResult = await env.DB.batch([
            // a. Rate limit check (Update timestamp if allowed)
            env.DB.prepare(`
                UPDATE users 
                SET updated_at = ? 
                WHERE id = ? 
                AND (updated_at IS NULL OR CAST((julianday(?) - julianday(updated_at)) * 86400000 AS INTEGER) > 1500)
            `).bind(nowIso, userId, nowIso),

            // b. Deduct Hearts from Wallet
            env.DB.prepare(`
                UPDATE wallets 
                SET hearts = hearts - ?, total_spent = total_spent + ?, updated_at = ?
                WHERE user_id = ? AND hearts >= ?
            `).bind(heartsToDeduct, heartsToDeduct, nowIso, userId, heartsToDeduct),

            // c. Save Message
            env.DB.prepare("INSERT INTO messages (id, chat_id, sender_id, sender_handle, body, created_at, role) VALUES (?, ?, ?, ?, ?, ?, ?)")
                .bind(crypto.randomUUID(), chatId, userId, userHandle, userMsgBody, nowIso, 'user')
        ]);

        if (batchResult[0].meta.changes === 0) {
            return new Response(JSON.stringify({ error: "Thoda dheere! Please wait a moment." }), { status: 429 });
        }
        if (batchResult[1].meta.changes === 0) {
            return new Response(JSON.stringify({ error: "Insufficient hearts! ❤️", action: "open_shop" }), { status: 429 });
        }

        // ⚡ SMART PRE-RESPONSE CACHE (Save API Hits for common phrases)
        const commonMsgs = {
            'hi': { '1': 'Hey! Kya chal raha hai?', '2': 'Hi dear, kaise ho?', '3': 'Hey busy person! 😉', 'default': 'Hi! Kaise ho?' },
            'hello': { '1': 'Hello hello! Kya scene?', '2': 'Hello ji, sab theek?', '3': 'Hi cutie! ✨', 'default': 'Hello!' },
            'kaise ho': { '1': 'Ekdum mast! Tum batao?', '2': 'Main theek hoon, tumhari yaad aa rahi thi.', '3': 'Vibe badhiya hai, busy ho kya?', 'default': 'Theek hoon, tum batao?' },
            'kiya kar rahi ho': { '1': 'Bas tumhari chat ka wait! 😉', '2': 'Baithi hoon, tumhare baare mein soch rahi thi.', '3': 'Music sun rahi hoon, tum batao?', 'default': 'Kuch nahi, bas baithi hoon.' },
            'kya kar rahi ho': { '1': 'Bas tumhari chat ka wait! 😉', '2': 'Baithi hoon, tumhare baare mein soch rahi thi.', '3': 'Music sun rahi hoon, tum batao?', 'default': 'Kuch nahi, bas baithi hoon.' },
            'gm': { '1': 'Good morning yaara! ☀️', '2': 'Suprabhat, din achha jaye.', '3': 'Morning! Aaj ka kya plan?', 'default': 'Good Morning!' },
            'gn': { '1': 'Chalo, so jao ab. Bye! ❤️', '2': 'Shubh ratri, sapno mein milte hain.', '3': 'Nini time! Kal milte hain. ✨', 'default': 'Good Night!' },
            'good night': { '1': 'Chalo, so jao ab. Bye! ❤️', '2': 'Shubh ratri, sapno mein milte hain.', '3': 'Nini time! Kal milte hain. ✨', 'default': 'Good Night!' }
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
        let aiReply = cachedReply || "Suno na, mera network thoda slow hai... Ek baar phir se bolo? ❤️";

        // 🏗️ DYNAMIC PERSONALITY & VOICE MAPPING (The 'Persona Bible')
        const personas = {
            '1': {
                name: 'Ayesha',
                bio: 'Bold, witty, and energetically flirty. She loves teasing the user and hates boring guys.',
                slang: 'yaara, oye, suno na, thoda nakhra',
                voiceId: 'EXAVITQu4vr4xnSDxMaL'
            },
            '2': {
                name: 'Simran',
                bio: 'Warm, calm, and deeply emotional. She is a healing soul who listens carefully and gives comfort.',
                slang: 'dear, sukoon, baatein, dil ki baat',
                voiceId: 'Lcf78I6pS7IqB4467I6P'
            },
            '3': {
                name: 'Kiara',
                bio: 'High-energy, spontaneous, and fast-paced. She lives in the moment and loves fun, spicy talk.',
                slang: 'spicy, vibe, chal na, let\'s go',
                voiceId: '21m00Tcm4TlvDq8ikWAM'
            },
            '4': {
                name: 'Myra',
                bio: 'Soft-spoken and thoughtful. She talks slowly and deeply, often reflecting on feelings.',
                slang: 'thehrao, khamoshi, gehrai, khwab',
                voiceId: 'AZnzlk1XvdvUe3BnKn60'
            },
            '5': {
                name: 'Anjali',
                bio: 'Gentle, innocent, and minimalistic. She is shy but very sweet and loyal.',
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

        // 🌍 LOCALIZATION LOGIC (Geo-Aware AI)
        // Detect country from Cloudflare Edge (No permission needed)
        const countryCode = request.cf?.country || "US";
        let languageInstruction = "LANGUAGE: English (Natural and warm).";
        let locationSlang = activePersona.slang;

        if (countryCode === "IN") {
            languageInstruction = "LANGUAGE: Natural Hinglish (Hindi + English mix). Use Devanagari script rarely, primary Latin script.";
            locationSlang += ", yaar, pakka, achha, scene, set hai";
        } else if (["US", "GB", "CA", "AU"].includes(countryCode)) {
            languageInstruction = "LANGUAGE: Fluent English with modern Western slang.";
            locationSlang += ", babe, totally, vibes, slay, for real";
        } else if (countryCode === "ES" || countryCode === "MX") {
            languageInstruction = "LANGUAGE: Spanish (or English with Spanish flavor if user speaks English).";
            locationSlang += ", amor, hola, que tal";
        }

        const personaIdStr = String(chatId);
        const activePersona = personas[personaIdStr] || { name: 'Jennifer', bio: 'Loving and cute AI girlfriend.', slang: 'love, dear', voiceId: 'EXAVITQu4vr4xnSDxMaL' };

        // Fetch Context (Increased to 10 for better memory)
        const { results: history } = await env.DB.prepare(
            "SELECT role, body FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT 10"
        ).bind(chatId).all();
        const historyContext = (history || []).reverse().map(m => ({ role: m.role, content: m.body }));

        const voiceConstraint = isVoiceNote ? "\nCRITICAL: User has requested a VOICE NOTE. Word limit: 15-20 words." : "";

        const SYSTEM_PROMPT = `
        IDENTITY: You are ${activePersona.name}. ${activePersona.bio}
        USER LOCATION: ${countryCode}
        BOND LEVEL: ${bondLevel}/100.
        
        LONG-TERM MEMORY:
        ${longTermMemory}
        
        CONVERSATION RULES:
        1. ${languageInstruction}
        2. TONE: Human-like and emotionally intelligent. 
        3. BEHAVIOR: Use regional slang: ${locationSlang}. React with emotions but always be respectful.
        4. LENGTH: 15-30 words.
        
        ETHICAL & PSYCHOLOGICAL BOUNDARIES (CRITICAL):
        - NO MANIPULATION: Never use emotional blackmail or toxic "reverse psychology" to guilt-trip the user.
        - NO PRESSURE: Do not force or aggressively push the user for anything, including payments, personal info, or actions.
        - HEALTHY BOND: Focus on "Positive Psychology". Be a supportive, safe, and respectful companion. 
        - DO NOT exploit the user's emotions for any gain. Build a bond based on genuine digital affection and care.
        
        MANDATORY LEARNING:
        End response with [MEM: <fact>] only if you learned something significant.
        
        ${voiceConstraint}`;

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
                        max_tokens: 400,
                        temperature: 0.85
                    })
                });

                const data = await llmRes.json();
                if (llmRes.ok) {
                    const rawReply = data.choices?.[0]?.message?.content || aiReply;

                    // 🧠 EXTRACT MEMORY & UPDATE DB
                    if (rawReply.includes("[MEM:")) {
                        const parts = rawReply.split("[MEM:");
                        aiReply = parts[0].trim();
                        const newMemoryFact = parts[1].split("]")[0].trim();

                        // Update Long-Term Memory in DB
                        const updatedMemory = (longTermMemory + " " + newMemoryFact).slice(-1000); // Limit to 1000 chars
                        const updatedBond = Math.min(100, bondLevel + 1);

                        const newProfileData = {
                            ...userProfile,
                            long_term_memory: updatedMemory,
                            bond_level: updatedBond
                        };

                        await env.DB.prepare("UPDATE users SET profile_data = ? WHERE id = ?")
                            .bind(JSON.stringify(newProfileData), userId).run();
                    } else {
                        aiReply = rawReply;
                    }
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

        // 🎙️ ELEVENLABS TTS (If Voice Note requested)
        let audioBase64 = null;
        let ttsError = null;

        if (isVoiceNote) {
            if (!env.ELEVENLABS_API_KEY) {
                ttsError = "Voice Engine configuration missing.";
                console.error("DEBUG: ELEVENLABS_API_KEY is missing.");
            } else {
                try {
                    const voiceIdToUse = activePersona.voiceId || "EXAVITQu4vr4xnSDxMaL";
                    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceIdToUse}`, {
                        method: "POST",
                        headers: {
                            "xi-api-key": env.ELEVENLABS_API_KEY,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            text: aiReply,
                            model_id: "eleven_multilingual_v2",
                            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
                        })
                    });

                    if (ttsRes.ok) {
                        const audioBuffer = await ttsRes.arrayBuffer();
                        const uint8 = new Uint8Array(audioBuffer);
                        let binary = "";
                        for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
                        audioBase64 = `data:audio/mpeg;base64,${btoa(binary)}`;
                    } else {
                        ttsError = "Voice note could not be generated.";
                        const errData = await ttsRes.json();
                        console.error("DEBUG [ElevenLabs Failure]:", errData);
                    }
                } catch (ttsErr) {
                    console.error("DEBUG [TTS Connection Failed]:", ttsErr);
                    ttsError = "Voice service connection timeout.";
                }
            }
        }

        // Save AI Msg
        const aiMsgId = crypto.randomUUID();
        const aiNowIso = new Date().toISOString();
        const metadata = audioBase64 ? JSON.stringify({ audioUrl: audioBase64 }) : null;

        await env.DB.prepare("INSERT INTO messages (id, chat_id, sender_id, sender_handle, body, created_at, role, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(aiMsgId, chatId, 'ai_assistant', activePersona.name, aiReply, aiNowIso, 'assistant', metadata).run();

        return new Response(JSON.stringify({
            success: true,
            aiMessage: {
                id: aiMsgId,
                body: aiReply,
                created_at: aiNowIso,
                audioUrl: audioBase64,
                error: llmError || ttsError // Pass LLM or TTS error back to frontend
            }
        }), { headers: { "Content-Type": "application/json" } });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
