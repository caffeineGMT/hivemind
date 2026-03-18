import Stripe from "stripe";

// Initialize Stripe lazily — only when actually needed (avoids crash without API key)
let _stripe = null;
export function getStripe() {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null;
    _stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" });
  }
  return _stripe;
}
// Legacy export for files that import `stripe` directly
export const stripe = null;

// Stripe pricing configuration
export const STRIPE_PRICES = {
  starter: {
    priceId: process.env.STRIPE_STARTER_PRICE_ID || "price_starter",
    amount: 4900, // $49.00 in cents
    name: "Starter",
    companies: 1,
    agents: 5,
    features: [
      "1 AI Company",
      "5 AI Agents",
      "Basic Dashboard",
      "Email Support"
    ]
  },
  pro: {
    priceId: process.env.STRIPE_PRO_PRICE_ID || "price_pro",
    amount: 19900, // $199.00 in cents
    name: "Pro",
    companies: 5,
    agents: 20,
    features: [
      "5 AI Companies",
      "20 AI Agents per company",
      "Advanced Analytics",
      "Priority Support",
      "API Access"
    ]
  },
  enterprise: {
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || "price_enterprise",
    amount: 99900, // $999.00 in cents
    name: "Enterprise",
    companies: 999999,
    agents: 999999,
    features: [
      "Unlimited Companies",
      "Unlimited Agents",
      "White-label Dashboard",
      "Dedicated Support",
      "Custom Integrations",
      "SLA Guarantee"
    ]
  }
};

// Get tier from price ID
export function getTierFromPriceId(priceId) {
  for (const [tier, config] of Object.entries(STRIPE_PRICES)) {
    if (config.priceId === priceId) {
      return tier;
    }
  }
  return null;
}

// Get price config by tier
export function getPriceConfig(tier) {
  return STRIPE_PRICES[tier] || null;
}
