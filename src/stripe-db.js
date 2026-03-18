import { getDb } from "./db.js";

// Add subscription columns to companies table if they don't exist
export function ensureSubscriptionColumns() {
  const db = getDb();
  try {
    const cols = db.prepare("PRAGMA table_info(companies)").all();
    const colNames = cols.map(c => c.name);

    if (!colNames.includes("subscription_tier")) {
      db.exec("ALTER TABLE companies ADD COLUMN subscription_tier TEXT DEFAULT 'free'");
    }
    if (!colNames.includes("subscription_status")) {
      db.exec("ALTER TABLE companies ADD COLUMN subscription_status TEXT DEFAULT 'inactive'");
    }
    if (!colNames.includes("stripe_customer_id")) {
      db.exec("ALTER TABLE companies ADD COLUMN stripe_customer_id TEXT");
    }
    if (!colNames.includes("stripe_subscription_id")) {
      db.exec("ALTER TABLE companies ADD COLUMN stripe_subscription_id TEXT");
    }
    if (!colNames.includes("subscription_current_period_end")) {
      db.exec("ALTER TABLE companies ADD COLUMN subscription_current_period_end TEXT");
    }
    if (!colNames.includes("user_email")) {
      db.exec("ALTER TABLE companies ADD COLUMN user_email TEXT");
    }
  } catch (err) {
    console.error("Failed to add subscription columns:", err);
  }
}

// Update company subscription from Stripe webhook
export function updateSubscription({ companyId, tier, status, stripeCustomerId, stripeSubscriptionId, currentPeriodEnd }) {
  const db = getDb();
  db.prepare(`
    UPDATE companies
    SET subscription_tier = ?,
        subscription_status = ?,
        stripe_customer_id = ?,
        stripe_subscription_id = ?,
        subscription_current_period_end = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(tier, status, stripeCustomerId, stripeSubscriptionId, currentPeriodEnd, companyId);
}

// Get company by Stripe customer ID
export function getCompanyByStripeCustomerId(customerId) {
  return getDb().prepare("SELECT * FROM companies WHERE stripe_customer_id = ?").get(customerId);
}

// Get company by Stripe subscription ID
export function getCompanyByStripeSubscriptionId(subscriptionId) {
  return getDb().prepare("SELECT * FROM companies WHERE stripe_subscription_id = ?").get(subscriptionId);
}

// Update company Stripe customer ID
export function updateStripeCustomerId(companyId, customerId) {
  getDb().prepare("UPDATE companies SET stripe_customer_id = ?, updated_at = datetime('now') WHERE id = ?").run(customerId, companyId);
}

// Update company user email
export function updateUserEmail(companyId, email) {
  getDb().prepare("UPDATE companies SET user_email = ?, updated_at = datetime('now') WHERE id = ?").run(email, companyId);
}

// Get subscription limits for a tier
export function getSubscriptionLimits(tier) {
  const limits = {
    free: { companies: 1, agents: 3 },
    starter: { companies: 1, agents: 5 },
    pro: { companies: 5, agents: 20 },
    enterprise: { companies: 999999, agents: 999999 }
  };
  return limits[tier] || limits.free;
}

// Check if company is within subscription limits
export function checkSubscriptionLimits(companyId) {
  const db = getDb();
  const company = db.prepare("SELECT * FROM companies WHERE id = ?").get(companyId);
  if (!company) return { allowed: false, reason: "Company not found" };

  const tier = company.subscription_tier || "free";
  const limits = getSubscriptionLimits(tier);

  // Count user's total companies
  const userCompanies = db.prepare(
    "SELECT COUNT(*) as count FROM companies WHERE user_email = ? OR id = ?"
  ).get(company.user_email || "", companyId);

  // Count agents for this company
  const agentCount = db.prepare(
    "SELECT COUNT(*) as count FROM agents WHERE company_id = ?"
  ).get(companyId);

  if (userCompanies.count > limits.companies) {
    return {
      allowed: false,
      reason: `Company limit exceeded for ${tier} tier (${limits.companies} max)`,
      limit: limits.companies,
      current: userCompanies.count
    };
  }

  if (agentCount.count > limits.agents) {
    return {
      allowed: false,
      reason: `Agent limit exceeded for ${tier} tier (${limits.agents} max)`,
      limit: limits.agents,
      current: agentCount.count
    };
  }

  return { allowed: true, tier, limits };
}

// Initialize subscription columns on module load
ensureSubscriptionColumns();
