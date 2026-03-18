import { Paddle } from "@paddle/paddle-node-sdk";
import crypto from "node:crypto";

// Initialize Paddle client
// For production, set PADDLE_API_KEY and PADDLE_WEBHOOK_SECRET in environment
const paddle = new Paddle(process.env.PADDLE_API_KEY || "test_api_key_placeholder");

// Paddle Price IDs (replace with actual IDs from your Paddle dashboard)
export const PADDLE_PRICES = {
  pro: process.env.PADDLE_PRICE_PRO || "pri_pro_placeholder",
  team: process.env.PADDLE_PRICE_TEAM || "pri_team_placeholder",
  enterprise: process.env.PADDLE_PRICE_ENTERPRISE || "pri_enterprise_placeholder",
};

// Tier limits configuration
export const TIER_LIMITS = {
  free: {
    maxProjects: 1,
    maxAgents: 3,
    maxMonthlyBudget: 50, // USD
    features: ["Basic agents", "Single project", "Community support"],
  },
  pro: {
    maxProjects: 5,
    maxAgents: 10,
    maxMonthlyBudget: 500,
    features: [
      "Up to 10 agents",
      "5 concurrent projects",
      "Priority support",
      "Advanced analytics",
      "Cost tracking & budgets",
    ],
    price: 49,
    currency: "USD",
    interval: "month",
  },
  team: {
    maxProjects: 20,
    maxAgents: 50,
    maxMonthlyBudget: 2000,
    features: [
      "Up to 50 agents",
      "20 concurrent projects",
      "Team collaboration",
      "Advanced health monitoring",
      "Custom integrations",
      "Dedicated support",
    ],
    price: 199,
    currency: "USD",
    interval: "month",
  },
  enterprise: {
    maxProjects: -1, // unlimited
    maxAgents: -1, // unlimited
    maxMonthlyBudget: -1, // unlimited
    features: [
      "Unlimited agents",
      "Unlimited projects",
      "White-label options",
      "SLA guarantees",
      "Custom deployment",
      "24/7 premium support",
      "Dedicated account manager",
    ],
    price: 999,
    currency: "USD",
    interval: "month",
  },
};

/**
 * Create a Paddle checkout link for a specific tier
 * @param {string} accountId - Company/account ID (used as custom data)
 * @param {string} tier - Tier name: 'pro', 'team', or 'enterprise'
 * @returns {Promise<string>} - Checkout URL
 */
export async function createCheckoutLink(accountId, tier) {
  if (!["pro", "team", "enterprise"].includes(tier)) {
    throw new Error(`Invalid tier: ${tier}. Must be 'pro', 'team', or 'enterprise'.`);
  }

  const priceId = PADDLE_PRICES[tier];

  try {
    // Create a transaction (checkout session) with Paddle
    const checkout = await paddle.transactions.create({
      items: [
        {
          priceId,
          quantity: 1,
        },
      ],
      customData: {
        accountId,
        tier,
      },
      returnUrl: `${process.env.APP_URL || "http://localhost:3100"}/billing/success?tier=${tier}`,
    });

    return checkout.checkoutUrl;
  } catch (error) {
    console.error("[paddle] Error creating checkout link:", error);
    throw error;
  }
}

/**
 * Handle Paddle webhook events
 * Processes subscription lifecycle events: created, updated, canceled
 * @param {Object} payload - Webhook payload from Paddle
 * @param {string} signature - Paddle-Signature header
 * @returns {Object} - Result with status and tier changes
 */
export function handleWebhook(payload, signature) {
  // Verify webhook signature (important for security)
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

  if (webhookSecret) {
    const isValid = verifyWebhookSignature(payload, signature, webhookSecret);
    if (!isValid) {
      throw new Error("Invalid webhook signature");
    }
  }

  const eventType = payload.event_type;
  const data = payload.data;

  // Extract account info from custom data
  const customData = data.custom_data || {};
  const accountId = customData.accountId;
  const tier = customData.tier || "free";

  console.log(`[paddle] Webhook received: ${eventType} for account ${accountId}, tier ${tier}`);

  // Handle different event types
  switch (eventType) {
    case "transaction.completed":
      // Payment successful, activate subscription
      return {
        action: "activate",
        accountId,
        tier,
        subscriptionId: data.subscription_id,
        status: "active",
      };

    case "subscription.created":
      // New subscription created (often follows transaction.completed)
      return {
        action: "activate",
        accountId,
        tier,
        subscriptionId: data.id,
        status: "active",
      };

    case "subscription.updated":
      // Subscription modified (plan change, etc.)
      const newStatus = data.status; // active, paused, canceled
      return {
        action: "update",
        accountId,
        tier,
        subscriptionId: data.id,
        status: newStatus,
      };

    case "subscription.canceled":
    case "subscription.past_due":
      // Subscription canceled or payment failed
      return {
        action: "downgrade",
        accountId,
        tier: "free", // Revert to free tier
        subscriptionId: data.id,
        status: "canceled",
      };

    case "subscription.trialing":
      // Trial period started (14-day free trial)
      return {
        action: "trial_started",
        accountId,
        tier,
        subscriptionId: data.id,
        status: "trialing",
        trialEndsAt: data.current_billing_period?.ends_at,
      };

    default:
      console.log(`[paddle] Unhandled webhook event: ${eventType}`);
      return { action: "ignored", eventType };
  }
}

/**
 * Verify Paddle webhook signature
 * @param {Object} payload - Webhook body
 * @param {string} signature - Paddle-Signature header value
 * @param {string} secret - Webhook secret from Paddle dashboard
 * @returns {boolean} - True if signature is valid
 */
function verifyWebhookSignature(payload, signature, secret) {
  try {
    // Paddle uses HMAC-SHA256 for webhook verification
    // Format: ts=timestamp;h1=signature_hash
    const parts = signature.split(";");
    const timestamp = parts.find((p) => p.startsWith("ts="))?.split("=")[1];
    const hash = parts.find((p) => p.startsWith("h1="))?.split("=")[1];

    if (!timestamp || !hash) return false;

    // Reconstruct signed payload
    const signedPayload = `${timestamp}:${JSON.stringify(payload)}`;
    const expectedHash = crypto
      .createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(expectedHash)
    );
  } catch (error) {
    console.error("[paddle] Signature verification error:", error);
    return false;
  }
}

/**
 * Create a billing portal URL for customers to manage their subscription
 * @param {string} customerId - Paddle customer ID
 * @returns {Promise<string>} - Billing portal URL
 */
export async function createBillingPortalLink(customerId) {
  try {
    // Paddle provides a customer portal for managing subscriptions
    // This requires the customer ID from the subscription
    const portalUrl = `https://sandbox-vendor.paddle.com/customers/${customerId}`;
    // For production: https://vendor.paddle.com/customers/${customerId}

    return portalUrl;
  } catch (error) {
    console.error("[paddle] Error creating billing portal link:", error);
    throw error;
  }
}

/**
 * Check if an account can perform an action based on tier limits
 * @param {string} tier - Current tier: 'free', 'pro', 'team', 'enterprise'
 * @param {string} action - Action to check: 'create_project', 'create_agent'
 * @param {number} currentCount - Current count of resources
 * @returns {Object} - { allowed: boolean, limit: number, message: string }
 */
export function checkTierLimit(tier, action, currentCount) {
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

  let limit, resource;

  switch (action) {
    case "create_project":
      limit = limits.maxProjects;
      resource = "projects";
      break;
    case "create_agent":
      limit = limits.maxAgents;
      resource = "agents";
      break;
    default:
      return { allowed: true, limit: -1, message: "Unknown action" };
  }

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, limit: -1, message: "Unlimited" };
  }

  const allowed = currentCount < limit;
  const message = allowed
    ? `${currentCount + 1}/${limit} ${resource}`
    : `Limit reached: ${limit} ${resource} on ${tier} tier. Upgrade to add more.`;

  return { allowed, limit, message, current: currentCount };
}
