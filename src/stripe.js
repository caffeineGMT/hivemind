import Stripe from "stripe";

// Initialize Stripe with secret key from environment
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Pricing configuration
export const PRICING = {
  STARTER: {
    name: "Starter",
    price: 49,
    agent_hours_included: 10,
    api_calls_included: 10000,
  },
  PRO: {
    name: "Pro",
    price: 199,
    agent_hours_included: 50,
    api_calls_included: 100000,
  },
  ENTERPRISE: {
    name: "Enterprise",
    price: 999,
    agent_hours_included: 500,
    api_calls_included: 1000000,
  },
};

export const OVERAGE_RATES = {
  agent_hour: 10.0, // $10 per extra agent hour
  api_call_1000: 1.0, // $1 per 1000 extra API calls
};

/**
 * Report usage to Stripe Metering API for overage billing
 * @param {Object} params
 * @param {string} params.customerId - Stripe customer ID
 * @param {string} params.metric - Usage metric (agent_hours, api_calls)
 * @param {number} params.value - Usage value
 * @param {string} params.timestamp - ISO timestamp (optional, defaults to now)
 * @returns {Promise<Object>} Stripe meter event
 */
export async function reportUsageToStripe({ customerId, metric, value, timestamp }) {
  if (!stripe) {
    console.warn("[Stripe] Stripe not configured (STRIPE_SECRET_KEY missing), skipping usage report");
    return null;
  }

  try {
    // Create a usage record for billing
    const event = await stripe.billing.meterEvents.create({
      event_name: `hivemind_${metric}`,
      payload: {
        stripe_customer_id: customerId,
        value: Math.ceil(value), // Round up to nearest integer
      },
      timestamp: timestamp ? Math.floor(new Date(timestamp).getTime() / 1000) : undefined,
    });

    console.log(`[Stripe] Reported ${value} ${metric} for customer ${customerId}`);
    return event;
  } catch (error) {
    console.error(`[Stripe] Failed to report usage: ${error.message}`);
    throw error;
  }
}

/**
 * Calculate overages based on plan limits
 * @param {Object} usage - Current usage { agent_hours, api_calls }
 * @param {string} planTier - Plan tier (STARTER, PRO, ENTERPRISE)
 * @returns {Object} Overage calculation
 */
export function calculateOverages(usage, planTier = "STARTER") {
  const plan = PRICING[planTier] || PRICING.STARTER;

  const agentHourOverage = Math.max(0, usage.agent_hours - plan.agent_hours_included);
  const apiCallOverage = Math.max(0, usage.api_calls - plan.api_calls_included);

  const agentHourCost = agentHourOverage * OVERAGE_RATES.agent_hour;
  const apiCallCost = (apiCallOverage / 1000) * OVERAGE_RATES.api_call_1000;

  return {
    plan: plan.name,
    base_price: plan.price,
    included: {
      agent_hours: plan.agent_hours_included,
      api_calls: plan.api_calls_included,
    },
    usage: {
      agent_hours: usage.agent_hours,
      api_calls: usage.api_calls,
    },
    overages: {
      agent_hours: agentHourOverage,
      api_calls: apiCallOverage,
    },
    overage_costs: {
      agent_hours: agentHourCost,
      api_calls: apiCallCost,
      total: agentHourCost + apiCallCost,
    },
    total_cost: plan.price + agentHourCost + apiCallCost,
  };
}

/**
 * Get or create a Stripe customer for a company
 * @param {Object} params
 * @param {string} params.email - Customer email
 * @param {string} params.companyName - Company name
 * @param {string} params.companyId - Internal company ID
 * @returns {Promise<Object>} Stripe customer
 */
export async function getOrCreateCustomer({ email, companyName, companyId }) {
  if (!stripe) {
    console.warn("[Stripe] Stripe not configured, returning mock customer");
    return { id: "cus_mock_" + companyId, email, name: companyName };
  }

  try {
    // Search for existing customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });

    if (customers.data.length > 0) {
      return customers.data[0];
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name: companyName,
      metadata: {
        hivemind_company_id: companyId,
      },
    });

    console.log(`[Stripe] Created customer ${customer.id} for ${companyName}`);
    return customer;
  } catch (error) {
    console.error(`[Stripe] Failed to get/create customer: ${error.message}`);
    throw error;
  }
}

/**
 * Create a subscription for a customer
 * @param {Object} params
 * @param {string} params.customerId - Stripe customer ID
 * @param {string} params.planTier - Plan tier (STARTER, PRO, ENTERPRISE)
 * @returns {Promise<Object>} Stripe subscription
 */
export async function createSubscription({ customerId, planTier = "STARTER" }) {
  if (!stripe) {
    console.warn("[Stripe] Stripe not configured, returning mock subscription");
    return { id: "sub_mock_" + customerId, customer: customerId, status: "active" };
  }

  const plan = PRICING[planTier] || PRICING.STARTER;

  try {
    // You would need to create price IDs in Stripe dashboard first
    // This is a simplified example
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Hivemind ${plan.name} Plan`,
            },
            unit_amount: plan.price * 100, // Amount in cents
            recurring: {
              interval: "month",
            },
          },
        },
      ],
      metadata: {
        plan_tier: planTier,
        agent_hours_included: plan.agent_hours_included,
        api_calls_included: plan.api_calls_included,
      },
    });

    console.log(`[Stripe] Created subscription ${subscription.id} for customer ${customerId}`);
    return subscription;
  } catch (error) {
    console.error(`[Stripe] Failed to create subscription: ${error.message}`);
    throw error;
  }
}
