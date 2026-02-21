# 🔧 Razorpay Setup Guide for Bondly

## Current Status
✅ **Code Integration:** COMPLETE  
⚠️ **Environment Setup:** PENDING

## Error You're Seeing
```
"Unexpected end of JSON input"
```

**Reason:** Razorpay API credentials are not configured in Cloudflare environment variables.

---

## Quick Fix Steps

### 1️⃣ Get Razorpay Test Keys

1. Go to: https://dashboard.razorpay.com/
2. Sign up / Login
3. Navigate to: **Settings → API Keys**
4. Click **Generate Test Key**
5. Copy both:
   - `Key ID` (starts with `rzp_test_`)
   - `Key Secret` (keep this secure!)

### 2️⃣ Add to Cloudflare Environment Variables

**If using Cloudflare Pages:**
1. Go to Cloudflare Dashboard
2. Select your project (bondly.online)
3. Go to **Settings → Environment Variables**
4. Add these variables for **Production**:
   ```
   RAZORPAY_KEY_ID = rzp_test_XXXXXXXXXX
   RAZORPAY_KEY_SECRET = your_secret_key_here
   ```
5. Click **Save**
6. **Redeploy** your site

**If testing locally:**
Create a `.env` file in the `functions/` directory:
```bash
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXX
RAZORPAY_KEY_SECRET=your_secret_key_here
```

### 3️⃣ Verify Setup

After adding credentials:
1. Clear browser cache
2. Try purchasing again
3. You should see Razorpay checkout modal instead of error

---

## Test Mode vs Live Mode

### Test Mode (Current)
- Use `rzp_test_` keys
- No real money transactions
- Use test cards: https://razorpay.com/docs/payments/payments/test-card-details/
- Example test card: `4111 1111 1111 1111`, CVV: `123`, Expiry: Any future date

### Live Mode (Production)
1. Complete KYC on Razorpay dashboard
2. Submit business details
3. Wait for approval (1-2 days)
4. Get Live keys (`rzp_live_`)
5. Replace test keys with live keys in Cloudflare

---

## Pricing Configuration

Current prices (from `AuthContext.tsx`):
```javascript
Starter Pass: ₹49
Core Connection: ₹199 (30 days)
Plus Unlimited: ₹499 (lifetime)
Hearts: Dynamic pricing (~₹0.8 per heart)
```

To change prices, edit:
- `src/contexts/AuthContext.tsx` (lines 319-324)
- `constants.ts` (GATING_CONFIG section)

---

## Troubleshooting

### Error: "Payment server error"
→ Check Cloudflare environment variables are set correctly

### Error: "Razorpay SDK failed to load"
→ Check internet connection or firewall blocking Razorpay CDN

### Payment succeeds but profile not updating
→ Check `/api/verify-payment` endpoint logs

### Test payment not working
→ Use official Razorpay test cards only

---

## Security Checklist

✅ API keys stored in environment variables (not in code)  
✅ Payment signature verification on backend  
✅ No sensitive data exposed to frontend  
✅ HTTPS enforced on production  

---

## Support

- Razorpay Docs: https://razorpay.com/docs/
- Razorpay Support: support@razorpay.com
- Test Cards: https://razorpay.com/docs/payments/payments/test-card-details/

---

**Last Updated:** Feb 11, 2026  
**Status:** Ready for testing once credentials are added
