# 📋 Bondly Pending Tasks List - Feb 11, 2026

Here is the comprehensive list of pending tasks based on project analysis and conversation history.

---

## 🚨 IMMEDIATE PRIORITY (Revenue Blocker)

### 1. Razorpay Environment Setup
- **Status:** ⚠️ Code is ready, but Keys are missing in Cloudflare.
- **Why:** Payments will fail with 500 Error until this is fixed.
- **Action:**
  - Login to Cloudflare Dashboard.
  - Go to **Settings → Environment Variables**.
  - Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.

---

## 🚀 HIGH PRIORITY (Core Features)

### 2. Voice Note Feature
- **Status:** ❌ Proposed but NOT implemented.
- **Reference:** Conversation `f8a69613...`
- **Missing:**
  - Microphone recording UI in `Composer.tsx`.
  - Audio file handling/uploading.
  - `<audio>` player in `MessageItem.tsx`.
- **Action:** Build `VoiceRecorder` component and integrate with chat.

### 3. SambaNova Reliability (Rate Limits)
- **Status:** ⚠️ Basic implementation only.
- **Current Logic:** Randomly picks a key. If it fails, the request fails.
- **Required Logic:** "Round-Robin with Failover" – If Key 1 fails (429), immediately try Key 2.
- **Action:** Refactor `functions/chat.js` for robust error handling and key rotation.

---

## 🎨 MEDIUM PRIORITY (User Experience)

### 4. Midnight Mode (Full UI)
- **Status:** ⚠️ Partially implemented.
- **Issues:**
  - `ChatScreen.tsx` has hardcoded `bg-white` and `bg-pink-500`.
  - Message bubbles need dark mode specific colors.
  - Shop Modal is dark-mode ready, but Chat is not.
- **Action:** Update all hardcoded colors with Tailwind `dark:` classes.

### 5. Realtime Typing Indicators
- **Status:** ⏳ Placeholder code.
- **Current Code:** `broadcastTyping` function in `ChatScreen.tsx` is empty/TODO.
- **Action:** Implement Supabase realtime channels or efficient polling.

---

## 📈 LOW PRIORITY (Growth & SEO)

### 6. AdSense Approval Prep
- **Status:** ⚠️ Missing script placeholders.
- **Action:** Add AdSense script tag to `index.html`.

### 7. Blog Section
- **Status:** ❌ Missing.
- **Why:** Required for SEO and AdSense compliance.
- **Action:** Create a `/blog` route and add high-quality articles (e.g., E-Challan post).

---

## 🛠️ RECOMMENDED NEXT STEP

**Option A (Fix Revenue):** I can **refactor `functions/chat.js`** for better reliability while you set up Razorpay keys.
**Option B (New Feature):** I can **build the Voice Note** feature.
**Option C (UI Polish):** I can **fix Midnight Mode** in Chat Screen.

Which one should I start with?
