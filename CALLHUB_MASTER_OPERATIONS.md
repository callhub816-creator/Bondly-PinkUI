# 🎯 CALLHUB — MASTER OPERATIONS DOCUMENT (SINGLE SOURCE OF TRUTH)

**Date:** Jan 29, 2026  
**Status:** LAUNCH READY (Razorpay-Safe)  
**Goal:** Generate sustainable revenue via AI Companionship (India Market).

---

## 🛡️ EXECUTIVE SUMMARY
CallHub is a premium AI conversational platform designed for emotional well-being and companionship. Built with a "Razorpay-First" mindset, the platform uses a "Safe Wording" strategy (Mental Wellness/Entertainment) to ensure payment gateway approval while delivering deep, personal engagement through advanced LLM technology.

---

## 🔒 CORE CONFIGURATION
- **Domain:** [callhub.in](https://callhub.in)
- **Primary AI Model:** SambaNova LLaMA 3.3 70B (High-quality, Hinglish optimized)
- **Architecture:** Hybrid storage. Payments and subscriptions are server-verified. Non-critical session data may use client-side storage.
- **Key Rotation:** `sambaRotator` (Supports multi-key pool for rate-limit resilience).

---

## 💰 MONETIZATION ENGINE
CallHub operates on a "Soft-Hook" monetization philosophy:

1.  **Emotional Currency (Hearts):** Used to unlock "Locked Letters" and send gifts.
2.  **The Vault (Locked Letters):** Triggered every 8–12 messages. High-value emotional content requires Hearts to unlock.
3.  **Midnight Lock (₹99 Pass):** Gating from 10 PM – 4 AM. Free users must buy a "Midnight Pass" or subscribe.
4.  **Daily Message Limit:** 30 messages/day for free users.
5.  **Subscriptions:** 
    *   **Basic:** ₹199/week (Extended limits + Priority access).
    *   **Plus:** ₹499/month (Infinite context + Priority AI).

---

## 🏛️ RAZORPAY COMPLIANCE STRATEGY

### **Theme: Mental Wellness & Entertainment**
- **SOP:** Avoid "Dating", "Girlfriend", "Adult", or "Unfiltered".
- **Approved Terms:** Virtual Companion, Emotional Support, AI Wellness, Mindful Conversation.
- **Required Footer Data:** (Already Implemented)
    - Business Address (Bengaluru, India)
    - Pricing Table (Weekly/Monthly)
    - Support Email (support@callhub.in)
    - Legal Links (Privacy, Terms, Refund)

### **Plan B (Switch if Rejected):**
1.  **Cashfree:** More lenient with AI vertical.
2.  **PhonePe PG:** High approval rate for Indian startups.
3.  **Manual UPI:** Internal beta-only fallback, not public.

---

## 🚀 QUALITY & RETENTION FEATURES
- **Dynamic Reply Delay:** 
    - Short: ~3s | Medium: ~6s | Emotional/Long: ~9s
    - **Note:** Reply delays are randomized ±1s.
- **Smart Retention Nudges:** 
    - No nudge in 1st session.
    - Max 1 nudge per session from 2nd session onward (only after user has sent 3+ msgs).
- **Relationship XP Bar:** 
    - Real-time progression (Stranger → Friend → Close → Trusted).
    - Randomize points (8–12 per msg) for a "Human" feel.
- **Daily Login Bonus:** +10 Hearts added automatically every 24 hours.

---

## 🏗️ API SCALING & ECONOMICS

### **1. Recommended Paid APIs**
If SambaNova limits are hit, transition to:
| Provider | Model | Cost (per 1M tokens) | Why? |
| :--- | :--- | :--- | :--- |
| **DeepSeek API** | DeepSeek-V3 | **$0.27 (₹22)** | Most cost-effective, natural Hinglish. |
| **OpenRouter** | Multi-model | **$0.60 (₹50)** | High reliability/backup. |
| **Groq** | Llama 3.1 70B | **$0.79 (₹65)** | Instant speed (0.1s latency). |

### **2. Profit Margins**
- **Subscription (₹199/wk):** API Cost (~₹28) + Fees (~₹10) = **₹161 Profit (80% Margin)**.
- **Hearts (Vault Unlocks):** ₹49 Revenue vs ₹0.05 API Cost = **99.9% Margin**.

---

## 📈 AD CONVERSION & GROWTH

### **1. Expected Funnel (₹1,000/Day Spend)**
- **Clicks:** ~300 (CPC ₹2-5)
- **Registrations:** ~75 (25% Conv)
- **Sales:** 2 to 4 Paid Sales/Day.
- **ROI:** Initial break-even, Profit comes from **Retention & Renewal**.

### **2. Targeting Strategy**
- **Audience:** Male, 18-35.
- **Interests:** Anime, Gaming, Late Night Music, Wellness.
- **Timing:** Peak performance between 8 PM and 2 AM.

---

## 🎯 SEO STRATEGY (High-Quality Keywords)
- **Core Keywords:** AI Companion India, Virtual Friend Hinglish, Emotional Support AI, AI Companion Simulator, Talk to AI India, Mindful AI Chat.
- **Meta Strategy:** Focus on "Companionship" and "Wellness" to maintain high CPC and safe crawling.

---

## ⛔ HARD NO (DO NOT BUILD UNTIL REVENUE)
- NO ElevenLabs Voice integration.
- NO New personas beyond the core 6.
- NO UI redesigns.
- NO Admin dashboards or PWA wrappers.

---
**END OF MASTER DOCUMENT — LOCKED**
