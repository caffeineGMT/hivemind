#!/usr/bin/env node

/**
 * Setup Stripe Products and Prices for Hivemind Engine
 *
 * Run this script once to create products and prices in Stripe.
 * It will output the price IDs that need to be added to your .env file.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-products.js
 */

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia"
});

const PRODUCTS = [
  {
    name: "Hivemind Starter",
    description: "Perfect for individuals and small projects",
    tier: "starter",
    price: 4900, // $49.00
    features: [
      "1 AI Company",
      "5 AI Agents",
      "Basic Dashboard",
      "Email Support"
    ]
  },
  {
    name: "Hivemind Pro",
    description: "For teams and growing businesses",
    tier: "pro",
    price: 19900, // $199.00
    features: [
      "5 AI Companies",
      "20 AI Agents per company",
      "Advanced Analytics",
      "Priority Support",
      "API Access"
    ]
  },
  {
    name: "Hivemind Enterprise",
    description: "Unlimited scale for large organizations",
    tier: "enterprise",
    price: 99900, // $999.00
    features: [
      "Unlimited Companies",
      "Unlimited Agents",
      "White-label Dashboard",
      "Dedicated Support",
      "Custom Integrations",
      "SLA Guarantee"
    ]
  }
];

async function setupProducts() {
  console.log("🚀 Setting up Stripe products and prices...\n");

  const results = [];

  for (const config of PRODUCTS) {
    try {
      // Create product
      console.log(`Creating product: ${config.name}...`);
      const product = await stripe.products.create({
        name: config.name,
        description: config.description,
        metadata: {
          tier: config.tier,
          features: config.features.join(", ")
        }
      });

      // Create price
      console.log(`Creating price for ${config.name}...`);
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: config.price,
        currency: "usd",
        recurring: {
          interval: "month"
        },
        metadata: {
          tier: config.tier
        }
      });

      console.log(`✅ Created ${config.name}`);
      console.log(`   Product ID: ${product.id}`);
      console.log(`   Price ID: ${price.id}`);
      console.log();

      results.push({
        tier: config.tier,
        productId: product.id,
        priceId: price.id
      });
    } catch (error) {
      console.error(`❌ Error creating ${config.name}:`, error.message);
    }
  }

  console.log("\n📋 Add these environment variables to your .env file:\n");
  console.log("# Stripe Configuration");
  console.log(`STRIPE_SECRET_KEY=${process.env.STRIPE_SECRET_KEY}`);
  console.log("STRIPE_WEBHOOK_SECRET=whsec_... # Get this from Stripe Dashboard");

  for (const result of results) {
    const envVar = `STRIPE_${result.tier.toUpperCase()}_PRICE_ID`;
    console.log(`${envVar}=${result.priceId}`);
  }

  console.log("\n✨ Setup complete!");
  console.log("\n📝 Next steps:");
  console.log("1. Add the environment variables above to your .env file");
  console.log("2. Set up a webhook endpoint in Stripe Dashboard:");
  console.log("   - URL: https://your-domain.com/api/stripe/webhook");
  console.log("   - Events: customer.subscription.created, customer.subscription.updated,");
  console.log("             customer.subscription.deleted, invoice.payment_succeeded,");
  console.log("             invoice.payment_failed, checkout.session.completed");
  console.log("3. Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET");
}

// Validate environment
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ Error: STRIPE_SECRET_KEY environment variable is required");
  console.error("\nUsage:");
  console.error("  STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-products.js");
  process.exit(1);
}

setupProducts().catch(console.error);
