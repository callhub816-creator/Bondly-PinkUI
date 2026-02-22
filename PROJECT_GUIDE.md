# 📚 Bondly Project Resource Guide

This document combines all essential project documentation, including operations, setup, fixes, and pending tasks.

---

## 🎯 1. Master Operations (Single Source of Truth)

**Date:** Jan 29, 2026  
**Status:** LAUNCH READY (Razorpay-Safe)  
**Goal:** Generate sustainable revenue via AI Companionship (India Market).

### 🛡️ Executive Summary
Bondly is a premium AI conversational platform designed for emotional well-being and companionship. Built with a "Razorpay-First" mindset, the platform uses a "Safe Wording" strategy (Mental Wellness/Entertainment) to ensure payment gateway approval while delivering deep, personal engagement through advanced LLM technology.

### 🔒 Core Configuration
- **Domain:** [bondly.online](https://bondly.online)
- **Primary AI Model:** SambaNova LLaMA 3.3 70B (High-quality, Hinglish optimized)
- **Architecture:** Hybrid storage. Payments and subscriptions are server-verified. Non-critical session data may use client-side storage.
- **Key Rotation:** `sambaRotator` (Supports multi-key pool for rate-limit resilience).

### 💰 Monetization Engine
Bondly operates on a "Soft-Hook" monetization philosophy:
1.  **Emotional Currency (Hearts):** Used to unlock "Locked Letters" and send gifts.
2.  **The Vault (Locked Letters):** Triggered every 8–12 messages. High-value emotional content requires Hearts to unlock.
3.  **Midnight Lock (₹99 Pass):** Gating from 10 PM – 4 AM. Free users must buy a "Midnight Pass" or subscribe.
4.  **Daily Message Limit:** 30 messages/day for free users.
5.  **Subscriptions:** 
    *   **Basic:** ₹199/week (Extended limits + Priority access).
    *   **Plus:** ₹499/month (Infinite context + Priority AI).

### 🏛️ Razorpay Compliance Strategy
**Theme: Mental Wellness & Entertainment**
- **SOP:** Avoid "Dating", "Girlfriend", "Adult", or "Unfiltered".
- **Approved Terms:** Virtual Companion, Emotional Support, AI Wellness, Mindful Conversation.
- **Required Footer Data:** (Already Implemented)
    - Business Address (Bengaluru, India)
    - Pricing Table (Weekly/Monthly)
    - Support Email (support@bondly.online)
    - Legal Links (Privacy, Terms, Refund)

### 🚀 Quality & Retention Features
- **Dynamic Reply Delay:** ~3s to ~9s (Randomized ±1s).
- **Smart Retention Nudges:** Max 1 per session from 2nd session onward.
- **Relationship XP Bar:** Real-time progression (Stranger → Friend → Close → Trusted).
- **Daily Login Bonus:** +10 Hearts added automatically every 24 hours.

---

## 🔧 2. Razorpay Implementation & Setup

### 💡 Issue Found & Fixed (Feb 11, 2026)
**Problem:** Payment failing with "Unexpected end of JSON input".
**Root Cause:** Wrong API endpoint paths in `AuthContext.tsx`. Endpoint paths corrected from `/api/create-order` to `/create-order` to match Cloudflare Functions structure.

### ⚙️ Quick Setup Steps
1. **Get Razorpay Test Keys:** From [Razorpay Dashboard](https://dashboard.razorpay.com/) (Settings → API Keys).
2. **Add to Cloudflare:** Go to Settings → Environment Variables. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
3. **Verify:** Redeploy and test. If successful, you'll see the Razorpay checkout modal.

### 💳 Pricing Configuration
- **Starter Pass:** ₹49
- **Core Connection:** ₹199
- **Plus Unlimited:** ₹499
- **Hearts:** Dynamic (~₹0.8 per heart)

---

## 📋 3. Pending Tasks List

### 🚨 Immediate Priority (Revenue Blocker)
- **Razorpay Environment Setup:** Code is ready, but Keys need to be added in the Cloudflare Dashboard.

### 🚀 High Priority (Core Features)
- **Voice Note Feature:** Missing microphone recording UI, audio handling, and playback.
- **SambaNova Reliability:** Refactor `functions/chat.js` for "Round-Robin with Failover" key rotation.

### 🎨 Medium Priority (User Experience)
- **Midnight Mode (Full UI):** Update hardcoded colors in `ChatScreen.tsx` with Tailwind `dark:` classes.
- **Realtime Typing Indicators:** Implement via Ably/Pusher or efficient polling.

### 📈 Low Priority (Growth & SEO)
- **AdSense Approval Prep:** Missing script placeholders in `index.html`.
- **Blog Section:** Required for SEO. Create `/blog` route and initial articles.

---

## ⛔ Hard No (Do Not Build Until Revenue)
- NO ElevenLabs Voice integration.
- NO New personas beyond the core 6.
- NO UI redesigns.
- NO Admin dashboards or PWA wrappers.
