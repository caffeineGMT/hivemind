# Stripe Integration Setup Guide

This guide explains how to set up Stripe subscriptions for Hivemind Engine.

## Overview

Hivemind Engine now supports three subscription tiers:

- **Starter**: $49/mo - 1 company, 5 agents
- **Pro**: $199/mo - 5 companies, 20 agents per company
- **Enterprise**: $999/mo - Unlimited companies and agents

## Setup Steps

### 1. Create a Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. Get your test API keys from the [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)

### 2. Set Up Stripe Products

Run the setup script to create products and prices in Stripe:

```bash
STRIPE_SECRET_KEY=sk_test_your_key node scripts/setup-stripe-products.js
```

This script will:
- Create three products (Starter, Pro, Enterprise)
- Create monthly recurring prices for each
- Output environment variables to add to your `.env` file

### 3. Configure Environment Variables

Add the following to your `.env` file (replace with actual values from step 2):

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # Get this in step 4
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...
```

### 4. Set Up Webhooks

Stripe needs to notify your app about subscription events (payments, cancellations, etc.).

#### For Local Development

Use the Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to your local server
stripe listen --forward-to http://localhost:3100/api/stripe/webhook
```

Copy the webhook signing secret (starts with `whsec_`) and add it to `.env` as `STRIPE_WEBHOOK_SECRET`.

#### For Production (Vercel)

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL: `https://your-app.vercel.app/api/stripe/webhook`
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the signing secret and add it to Vercel environment variables

## Testing the Integration

### Test Cards

Use Stripe's test cards for testing:

- **Success**: `4242 4242 4242 4242`
- **Payment fails**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Any future expiry date and any 3-digit CVC.

### Test Checkout Flow

1. Start your server: `npm start`
2. Navigate to `/app/billing` in your dashboard
3. Click a pricing tier
4. Enter a test email
5. Use test card `4242 4242 4242 4242`
6. Complete checkout

### Verify Webhook Events

In the Stripe CLI output, you should see:
```
✔ Received event: checkout.session.completed
✔ Received event: customer.subscription.created
```

Check your database - the company's `subscription_tier` and `subscription_status` should be updated.

## API Endpoints

### POST /api/stripe/checkout

Create a checkout session for subscribing to a tier.

**Request:**
```json
{
  "tier": "pro",
  "companyId": "abc123",
  "email": "user@example.com",
  "successUrl": "https://app.com/success",
  "cancelUrl": "https://app.com/cancel"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

### POST /api/stripe/portal

Create a billing portal session for managing subscription.

**Request:**
```json
{
  "companyId": "abc123",
  "returnUrl": "https://app.com/billing"
}
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

### GET /api/stripe/subscription/:companyId

Get subscription status for a company.

**Response:**
```json
{
  "tier": "pro",
  "status": "active",
  "stripeCustomerId": "cus_...",
  "stripeSubscriptionId": "sub_...",
  "currentPeriodEnd": "2025-04-18T00:00:00Z",
  "limits": {
    "companies": 5,
    "agents": 20
  },
  "allowed": true,
  "reason": null
}
```

### POST /api/stripe/webhook

Webhook endpoint for Stripe events (signature-verified).

## Database Schema

The following columns are added to the `companies` table:

- `subscription_tier` (TEXT): 'free', 'starter', 'pro', 'enterprise'
- `subscription_status` (TEXT): 'active', 'inactive', 'past_due', 'canceled'
- `stripe_customer_id` (TEXT): Stripe customer ID
- `stripe_subscription_id` (TEXT): Stripe subscription ID
- `subscription_current_period_end` (TEXT): ISO 8601 date
- `user_email` (TEXT): User's email for subscription

## Feature Gating

Use `checkSubscriptionLimits(companyId)` to enforce tier limits:

```javascript
import { checkSubscriptionLimits } from './stripe-db.js';

const limits = checkSubscriptionLimits(companyId);
if (!limits.allowed) {
  return res.status(403).json({ error: limits.reason });
}
```

## Going Live

1. Switch to live API keys in Stripe Dashboard
2. Update `.env` with live keys: `STRIPE_SECRET_KEY=sk_live_...`
3. Update price IDs with live price IDs
4. Set up production webhook endpoint
5. Test with real payment (then refund)

## Troubleshooting

### Webhook signature verification failed

- Check that `STRIPE_WEBHOOK_SECRET` matches your endpoint's secret
- For local dev, make sure `stripe listen` is running
- For production, verify the webhook URL is correct

### Subscription not updating in database

- Check server logs for webhook processing errors
- Verify webhook events are being received (Stripe Dashboard → Webhooks → Logs)
- Ensure metadata includes `companyId` in checkout session

### Customer email not captured

- Email is set during checkout session creation
- If missing, user will be prompted to enter it
- Email is stored in `companies.user_email` for future reference

## Support

For issues with the Stripe integration:
1. Check Stripe Dashboard logs
2. Review server logs for webhook errors
3. Test with `stripe trigger` commands
4. Contact support with error details
