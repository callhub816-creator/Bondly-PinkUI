### BACKEND FORENSIC AUDIT REPORT

#### 1. DATABASE QUERY SCAN
**`functions/_middleware.js`**
- **Tables used:** `USER_VISITS`
- **Columns referenced:** `id`, `user_id`, `session_id`, `visit_type`, `ip_address`, `metadata`, `created_at`
- **Type of operation:** `INSERT`

**`functions/api/admin/users.js`**
- **Tables used:** `USERS`
- **Columns referenced:** `id`, `username`, `display_name`, `created_at`
- **Type of operation:** `SELECT`

**`functions/api/auth/bonus.js`**
- **Tables used:** `WALLET_TRANSACTIONS`, `USERS`, `USER_VISITS`
- **Columns referenced:** `created_at`, `user_id`, `type`, `id`, `hearts`, `total_earned`, `updated_at`, `amount`, `reason`, `ip_address`, `visit_type`, `metadata`
- **Type of operation:** `SELECT`, `UPDATE`, `INSERT`

**`functions/api/auth/firebase-login.js`**
- **Tables used:** `USERS`, `WALLETS`, `SUBSCRIPTIONS`, `USER_SESSIONS`
- **Columns referenced:** `id`, `provider`, `provider_id`, `username`, `display_name`, `email`, `role`, `hearts`, `total_spent`, `total_earned`, `created_at`, `updated_at`, `last_login_at`, `user_id`, `plan_name`, `status`, `refresh_token`, `expires_at`
- **Type of operation:** `SELECT`, `INSERT`, `UPDATE`

**`functions/api/auth/login.js`**
- **Tables used:** `USER_VISITS`, `USERS`, `SUBSCRIPTIONS`, `USER_SESSIONS`
- **Columns referenced:** `visit_type`, `created_at`, `metadata`, `username`, `id`, `hearts`, `plan_name`, `user_id`, `status`, `last_login_at`, `updated_at`, `refresh_token`, `expires_at`
- **Type of operation:** `SELECT`, `UPDATE`, `INSERT`

**`functions/api/auth/refresh.js`**
- **Tables used:** `USER_SESSIONS`, `USERS`
- **Columns referenced:** `refresh_token`, `revoked`, `expires_at`, `id`, `username`, `display_name`, `user_id`, `created_at`
- **Type of operation:** `SELECT`, `UPDATE`, `INSERT`

**`functions/api/auth/signup.js`**
- **Tables used:** `USERS`, `SUBSCRIPTIONS`, `USER_SESSIONS`, `WALLET_TRANSACTIONS`, `USER_VISITS`
- **Columns referenced:** `id`, `username`, `provider`, `provider_id`, `display_name`, `email`, `role`, `hearts`, `total_spent`, `total_earned`, `created_at`, `updated_at`, `user_id`, `plan_name`, `plan_price`, `payment_id`, `status`, `started_at`, `expires_at`, `refresh_token`, `ip_address`, `user_agent`, `revoked`, `amount`, `balance_after`, `type`, `reason`, `reference_id`, `session_id`, `visit_type`, `metadata`
- **Type of operation:** `SELECT`, `INSERT`

**`functions/api/auth/sync.js`**
- **Tables used:** `USERS`, `SUBSCRIPTIONS`
- **Columns referenced:** `id`, `hearts`, `plan_name`, `user_id`, `status`
- **Type of operation:** `SELECT`

**`functions/api/chat/index.js`**
- **Tables used:** `MESSAGES`
- **Columns referenced:** `chat_id`, `created_at`
- **Type of operation:** `SELECT`

**`functions/api/chat/send.js`**
- **Tables used:** `USERS`, `MESSAGES`
- **Columns referenced:** `username`, `id`, `updated_at`, `hearts`, `total_spent`, `chat_id`, `user_id`, `ai_profile_id`, `role`, `body`, `tokens_used`, `metadata`, `created_at`
- **Type of operation:** `SELECT`, `UPDATE`, `INSERT`

**`functions/api/payment/verify.js`**
- **Tables used:** `USER_VISITS`, `WALLET_TRANSACTIONS`, `USERS`, `SUBSCRIPTIONS`
- **Columns referenced:** `id`, `user_id`, `session_id`, `visit_type`, `ip_address`, `metadata`, `created_at`, `reason`, `type`, `hearts`, `total_earned`, `updated_at`, `amount`, `balance_after`, `reference_id`, `plan_name`, `status`, `started_at`
- **Type of operation:** `SELECT`, `UPDATE`, `INSERT`

**`functions/api/user/spend_hearts.js`**
- **Tables used:** `WALLET_TRANSACTIONS`, `USERS`, `USER_VISITS`
- **Columns referenced:** `user_id`, `created_at`, `id`, `hearts`, `total_spent`, `updated_at`, `amount`, `type`, `reason`, `ip_address`, `visit_type`, `metadata`
- **Type of operation:** `SELECT`, `UPDATE`, `INSERT`

**`functions/sentinel.js`**
- **Tables used:** `USER_VISITS`, `WALLET_TRANSACTIONS`
- **Columns referenced:** `visit_type`, `created_at`, `change_amount`, `details`
- **Type of operation:** `SELECT`

---

#### 2. SCHEMA DEFINITION MISMATCH & RISK REPORT

| File | Mismatch Detected | Risk Level |
|------|-------------------|------------|
| `api/auth/firebase-login.js` | Direct query explicitly referencing `wallets` table which has been removed | **Critical** |
| `api/auth/firebase-login.js` | Executes `UPDATE users SET last_login_at` referencing a `last_login_at` column which does not exist in schema | **Critical** |
| `api/auth/login.js` | Executes `UPDATE users SET last_login_at` referencing missing logic | **Critical** |
| `sentinel.js` | Queries `change_amount` column from `WALLET_TRANSACTIONS`, current column is `amount` | **Critical** |
| `sentinel.js` | Extracts json data query against `details->>'$.ip'` from `USER_VISITS`. Schema column is `metadata`. | **Critical** |
| `api/auth/bonus.js` | `WALLET_TRANSACTIONS` INSERT query structure omits schema required fields: `balance_after`, `reference_id` | Medium |
| `api/user/spend_hearts.js` | `WALLET_TRANSACTIONS` INSERT query structure omits `balance_after`, `reference_id` | Medium |
| `api/auth/bonus.js` | `USER_VISITS` INSERT query structure omits expected structural fields: `session_id`, `ip_address` | Medium |
| `api/auth/login.js` | `USER_VISITS` INSERT query structure omits `session_id`, `ip_address` | Medium |
| `api/user/spend_hearts.js`| `USER_VISITS` INSERT query structure omits `session_id`, `ip_address` | Medium |
| `api/auth/firebase-login.js` | `USER_SESSIONS` INSERT omits specific required table references: `ip_address`, `user_agent`, `revoked` | Medium |
| `api/auth/login.js` | `USER_SESSIONS` INSERT omits `ip_address`, `user_agent`, `revoked` | Medium |
| `api/auth/refresh.js` | `USER_SESSIONS` INSERT omits `ip_address`, `user_agent`, `revoked` | Medium |

---

#### 3. POTENTIAL CAUSE IDENTIFICATIONS

**Causes of 401 Unauthorized Errors:**
- In `refresh.js`, D1 query explicitly checks `revoked = 0`. But because newly created entries across `login.js`, `firebase-login.js`, and `refresh.js` fail to insert `revoked=0` natively, they will potentially default to `NULL`. SQLite queries evaluating whether `NULL = 0` evaluate implicitly to false.

**Causes of D1 SQL/Schema Errors:**
- The presence of the `wallets` table interaction on user generation.
- Attempting to push variable values to `users.last_login_at`.
- Automated executions via `sentinel.js` running queries matching non-existent columns (`change_amount`, `details`).

**Causes of Token/Session Mismatches:**
- D1 `user_sessions` missing required logging footprints during creation constraints token viability across different verification scopes.

---

#### 4. UNUSED & DEAD LOGIC

- **UNUSED TABLES:** `AI_PROFILES` is never natively queried via CRUD inside the backend. Instead, an in-memory mapped object array dictating persona variables is defined directly within `functions/api/chat/send.js`.
- **password_hash / password_salt:** Verified as dead code. Has natively been removed from all authentications.
- **profile_data:** Verified as dead code. Extracted structurally from schemas and hard-coded out in sync operations.
- **wallets:** Verified as dead code but is dangerously still referenced strictly in `firebase-login.js` initialization arrays.
- **wallet_audit_log:** Verified as dead code. Properly migrated natively over to `wallet_transactions` structurally.
- **personas:** Valid dead code context as schema tables; operates through inline memory indexing now.
- **processed_orders / payments:** Verified as dead code. Removed and correctly replaced natively into generic transactions and visits logic via Razorpay tracking schemas.
