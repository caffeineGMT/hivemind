import { getStripe, STRIPE_PRICES, getTierFromPriceId } from "./stripe-config.js";
import {
  getCompanyByStripeCustomerId,
  getCompanyByStripeSubscriptionId,
  updateSubscription,
  updateStripeCustomerId,
  updateUserEmail,
  checkSubscriptionLimits
} from "./stripe-db.js";
import { getCompany } from "./db.js";

// Create Stripe checkout session
export async function createCheckoutSession(req, res) {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(500).json({ error: "Stripe not configured" });
  }

  try {
    const { tier, companyId, email, successUrl, cancelUrl } = req.body;

    if (!tier || !STRIPE_PRICES[tier]) {
      return res.status(400).json({ error: "Invalid tier" });
    }

    if (!companyId) {
      return res.status(400).json({ error: "Company ID required" });
    }

    const company = getCompany(companyId);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    const priceConfig = STRIPE_PRICES[tier];
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3100";

    // Create or retrieve Stripe customer
    let customerId = company.stripe_customer_id;
    if (!customerId && email) {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          companyId: company.id,
          companyName: company.name
        }
      });
      customerId = customer.id;
      updateStripeCustomerId(company.id, customerId);
      updateUserEmail(company.id, email);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId || undefined,
      customer_email: !customerId && email ? email : undefined,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceConfig.priceId,
          quantity: 1
        }
      ],
      success_url: successUrl || `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/billing`,
      metadata: {
        companyId: company.id,
        tier
      },
      subscription_data: {
        metadata: {
          companyId: company.id,
          tier
        }
      }
    });

    res.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error("Checkout session error:", error);
    res.status(500).json({ error: error.message });
  }
}

// Create Stripe billing portal session
export async function createPortalSession(req, res) {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(500).json({ error: "Stripe not configured" });
  }

  try {
    const { companyId, returnUrl } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: "Company ID required" });
    }

    const company = getCompany(companyId);
    if (!company || !company.stripe_customer_id) {
      return res.status(404).json({ error: "No active subscription found" });
    }

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3100";

    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: returnUrl || `${baseUrl}/billing`
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Portal session error:", error);
    res.status(500).json({ error: error.message });
  }
}

// Get subscription status for a company
export async function getSubscriptionStatus(req, res) {
  try {
    const { companyId } = req.params;
    const company = getCompany(companyId);

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    const limits = checkSubscriptionLimits(companyId);

    res.json({
      tier: company.subscription_tier || "free",
      status: company.subscription_status || "inactive",
      stripeCustomerId: company.stripe_customer_id || null,
      stripeSubscriptionId: company.stripe_subscription_id || null,
      currentPeriodEnd: company.subscription_current_period_end || null,
      limits: limits.limits || null,
      allowed: limits.allowed,
      reason: limits.reason || null
    });
  } catch (error) {
    console.error("Subscription status error:", error);
    res.status(500).json({ error: error.message });
  }
}

// Stripe webhook handler
export async function handleWebhook(req, res) {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(500).json({ error: "Stripe not configured" });
  }

  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");
    return res.status(400).json({ error: "Webhook secret not configured" });
  }

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const companyId = session.metadata.companyId;
        const tier = session.metadata.tier;

        if (!companyId) {
          console.error("No companyId in checkout session metadata");
          break;
        }

        // Update customer ID if it was created during checkout
        if (session.customer) {
          updateStripeCustomerId(companyId, session.customer);
        }

        // If subscription was created, update company
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          updateSubscription({
            companyId,
            tier: tier || "starter",
            status: subscription.status,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: subscription.id,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const companyId = subscription.metadata.companyId;

        if (!companyId) {
          // Try to find company by customer ID
          const company = getCompanyByStripeCustomerId(subscription.customer);
          if (!company) {
            console.error("No company found for subscription:", subscription.id);
            break;
          }
          updateSubscriptionFromStripe(company.id, subscription);
        } else {
          updateSubscriptionFromStripe(companyId, subscription);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        let company = getCompanyByStripeSubscriptionId(subscription.id);

        if (!company) {
          company = getCompanyByStripeCustomerId(subscription.customer);
        }

        if (company) {
          updateSubscription({
            companyId: company.id,
            tier: "free",
            status: "canceled",
            stripeCustomerId: company.stripe_customer_id,
            stripeSubscriptionId: null,
            currentPeriodEnd: null
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const company = getCompanyByStripeSubscriptionId(subscription.id);

        if (company) {
          updateSubscription({
            companyId: company.id,
            tier: getTierFromPriceId(subscription.items.data[0].price.id) || company.subscription_tier,
            status: "active",
            stripeCustomerId: subscription.customer,
            stripeSubscriptionId: subscription.id,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const company = getCompanyByStripeSubscriptionId(subscription.id);

        if (company) {
          updateSubscription({
            companyId: company.id,
            tier: company.subscription_tier || "free",
            status: "past_due",
            stripeCustomerId: subscription.customer,
            stripeSubscriptionId: subscription.id,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
          });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}

// Helper function to update subscription from Stripe subscription object
function updateSubscriptionFromStripe(companyId, subscription) {
  const tier = getTierFromPriceId(subscription.items.data[0].price.id) || "starter";

  updateSubscription({
    companyId,
    tier,
    status: subscription.status,
    stripeCustomerId: subscription.customer,
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
  });
}
