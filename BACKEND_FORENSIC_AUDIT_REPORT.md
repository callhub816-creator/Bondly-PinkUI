# 🛡️ Backend Forensic Security & Razorpay Compliance Audit Report

**Date:** February 26, 2026
**Domain Analyzed:** `https://bondly.online`
**Scope:** Payment gateways, verification logic, webhook security, origin safety, and abuse vectors.

---

## 1️⃣ Domain & Checkout Safety
**Risk Level: 🟢 Low**

- **Checkout Enforcement:** Razorpay Checkout is dynamically initiated on the client-side (`AuthContext.tsx`). There is no strict domain whitelisting embedded in the frontend bundle preventing initiation from local/unauthorized domains; however, the Razorpay Dashboard itself will reject checkout if the origin isn't whitelisted there.
- **Old Domain Spillage:** No hardcoded references or leakage of old domains were found in the API routes or frontend configurations.
- **HTTPS & Mixed Content:** Cloudflare handles HTTPS edge routing. Furthermore, the `_middleware.js` script injects strict security headers including `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` and a robust `Content-Security-Policy`. 

**Required Fixes:** Ensure your approved `bondly.online` domain is explicitly whitelisted in the Razorpay Dashboard under API domains (if not already done). Re-approval is NOT needed for codebase changes, just Razorpay dashboard settings.

---

## 2️⃣ Webhook Security
**Risk Level: 🟡 Medium**

- **Implementation Status:** ⚠️ **Razorpay Webhooks are completely missing.** The system relies 100% on the frontend receiving the success callback and manually hitting `/api/payment/verify`. 
- **Vulnerability:** If a user closes the browser tab, loses internet connection, or navigates away *exactly* after paying but *before* the callback fires, Razorpay will charge them, but the backend will never allocate the Hearts or Subscription.
- **Idempotency:** On the `/api/payment/verify` route, you have implemented strict idempotency: `SELECT id FROM wallet_transactions WHERE reason = ? AND type = 'payment' - bind(razorpay_order_id)`. This successfully prevents replay attacks.

**Required Fixes:** 
- Implement a backend webhook endpoint (e.g., `/api/webhook/razorpay`) that listens to the `payment.captured` or `order.paid` events. This ensures that even if the client disconnects, the server securely assigns the wallet balance.

---

## 3️⃣ Payment Verification Logic
**Risk Level: 🟢 Low**

- **Server-side Verification:** Excellent. `/api/payment/verify` requires a cryptographic match: `HMAC-SHA256(order_id + payment_id, SECRET) === signature`. No client can fake a successful payment.
- **Data Manipulation Check:** The verification logic strictly pulls the `amount_paid` from the Razorpay API endpoint (`https://api.razorpay.com/v1/orders/`). It does not trust the frontend's requested plan tier. Instead, it rigidly maps `amountPaid === 19900` to `CORE`, `amountPaid === 4900` to `STARTER`, etc.
- **Wallet Manipulation:** The `spend_hearts` API only processes deductions for strictly positive amounts (`amount > 0 && amount <= 1000`) and uses atomic `UPDATE users SET hearts = hearts - ? WHERE hearts >= ?` statements. The `/api/auth/sync` API ignores frontend-supplied wallet balances, fetching truth exclusively from the DB.

**Required Fixes:** None. Verification logic is rock solid.

---

## 4️⃣ CORS & Origin Validation
**Risk Level: 🟡 Medium**

- **Origin Restrictions:** While the `_middleware.js` applies CSP rules (`connect-src 'self' ...`), there is **no explicit `Access-Control-Allow-Origin` or Origin header validation** in the API route handlers (`onRequestPost`). 
- **CSRF Defense:** Fortunately, authentication relies on `auth_token` and `refresh_token` cookies minted with `SameSite=Strict`. This effectively eliminates Cross-Site Request Forgery (CSRF). 
- **Vulnerability:** Scripted bots (cURL, Postman) can still hit your APIs directly if they harvest a valid JWT token. 

**Required Fixes:** 
- Add strict origin checks in `_middleware.js` or inside sensitive POST endpoints: `if (request.headers.get("Origin") !== "https://bondly.online") return 403;`.

---

## 5️⃣ Environment & Secrets
**Risk Level: 🟢 Low**

- **Secret Management:** Secrets (`RAZORPAY_KEY_SECRET`, `JWT_SECRET`) are securely injected via `env`. They are never interpolated into frontend strings.
- **Frontend Keys:** Only `RAZORPAY_KEY_ID` is relayed to the frontend via `/api/payment/create`, which is the intended design of Razorpay integration.

**Required Fixes:** Verify in your Cloudflare dashboard that production environments are using `rzp_live_*` keys, and not `rzp_test_*` keys.

---

## 6️⃣ Abuse & Exploit Risks
**Risk Level: 🔴 High (Premium Persona Bypass)**

- **Bypass Payment & Access Persona:** ⚠️ Your frontend uses `useGating.ts` to hide Premium Personas (ID > 2) from Free/Starter users. However, **your backend (`/api/chat/send.js`) DOES NOT enforce this restriction.** 
- **Exploit:** A free user (or script) could intercept network requests and manually POST to `/api/chat/send` with `chatId: 3` (Premium Persona). The backend will successfully process it, query the LLM, and deduct standard hearts without checking if their subscription tier actually permits access to `chatId: 3`.
- **Duplicate Signatures:** Protected by the atomic transaction idempotency logic.
- **Manual Subscription Triggers:** Protected. Requires valid `RAZORPAY_KEY_SECRET`.

**Required Fixes:** 
- In `functions/api/chat/send.js`, add a server-side lock check before invoking SambaNova. If `chatId > 2` and `user.subscription === 'free'`, reject the request with `403 Forbidden`.

---

## 7️⃣ Domain Change Risk (If applicable)
- Assuming the transition to `bondly.online` was recent: 
- Checkout scripts execute properly relative to the domain.
- There are no old webhook URLs firing (since none exist).

**Required Fixes:** Since webhooks are absent, Razorpay won't send alerts to the wrong domain. *When* you implement webhooks, ensure the Endpoint URL points to `https://bondly.online/api/...`.

---

### 📝 Final Verdict
Your application is **secure against direct financial theft and payment spoofing.** The payment validation cryptography is perfectly sound. 

However, you must fix the **Premium Persona Bypass in the Chat API** and strongly consider adding **Razorpay Webhooks** to prevent customer service nightmares when users close their browser window during the loading transition. Razorpay domain re-approval is **NOT necessary** unless you changed the business category.
