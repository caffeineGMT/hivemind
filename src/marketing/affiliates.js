// Affiliate & Referral Program Management
// Track referrals, calculate commissions, manage payouts

import Database from 'better-sqlite3';
import crypto from 'crypto';

const db = new Database('./data/marketing.db');

// Initialize affiliate tables
db.exec(`
  CREATE TABLE IF NOT EXISTS affiliates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    name TEXT,
    email TEXT,
    commission_rate REAL DEFAULT 0.20,
    total_referrals INTEGER DEFAULT 0,
    total_revenue REAL DEFAULT 0,
    total_commission REAL DEFAULT 0,
    payout_method TEXT DEFAULT 'stripe',
    payout_email TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    affiliate_id INTEGER NOT NULL,
    referred_user_id TEXT NOT NULL,
    referral_code TEXT NOT NULL,
    conversion_status TEXT DEFAULT 'pending',
    trial_start_date DATETIME,
    subscription_start_date DATETIME,
    subscription_plan TEXT,
    subscription_amount REAL,
    commission_amount REAL,
    commission_paid BOOLEAN DEFAULT 0,
    commission_paid_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (affiliate_id) REFERENCES affiliates(id)
  );

  CREATE TABLE IF NOT EXISTS commission_payouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    affiliate_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    period_start DATE,
    period_end DATE,
    status TEXT DEFAULT 'pending',
    paid_date DATETIME,
    stripe_payout_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (affiliate_id) REFERENCES affiliates(id)
  );

  CREATE INDEX IF NOT EXISTS idx_referrals_affiliate ON referrals(affiliate_id);
  CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
  CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(conversion_status);
`);

/**
 * Generate unique affiliate code
 */
function generateAffiliateCode(name) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 8);
  const random = crypto.randomBytes(3).toString('hex');
  return `${base}-${random}`;
}

/**
 * Create new affiliate
 */
export function createAffiliate(userData) {
  const code = generateAffiliateCode(userData.name);

  const stmt = db.prepare(`
    INSERT INTO affiliates (user_id, code, name, email, commission_rate, payout_email)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    userData.userId,
    code,
    userData.name,
    userData.email,
    userData.commissionRate || 0.2,
    userData.payoutEmail || userData.email
  );

  return {
    id: result.lastInsertRowid,
    code,
    commissionRate: userData.commissionRate || 0.2,
  };
}

/**
 * Get affiliate by code
 */
export function getAffiliateByCode(code) {
  const stmt = db.prepare('SELECT * FROM affiliates WHERE code = ?');
  return stmt.get(code);
}

/**
 * Track referral click
 */
export function trackReferralClick(referralCode, visitorData = {}) {
  const affiliate = getAffiliateByCode(referralCode);

  if (!affiliate) {
    return { success: false, error: 'Invalid referral code' };
  }

  // Store referral code in cookie/session for later attribution
  // This would typically be done client-side
  return {
    success: true,
    affiliateId: affiliate.id,
    code: referralCode,
  };
}

/**
 * Create referral when user signs up
 */
export function createReferral(affiliateCode, userId) {
  const affiliate = getAffiliateByCode(affiliateCode);

  if (!affiliate) {
    return { success: false, error: 'Invalid affiliate code' };
  }

  const stmt = db.prepare(`
    INSERT INTO referrals (affiliate_id, referred_user_id, referral_code, trial_start_date)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const result = stmt.run(affiliate.id, userId, affiliateCode);

  // Update affiliate stats
  db.prepare('UPDATE affiliates SET total_referrals = total_referrals + 1 WHERE id = ?').run(
    affiliate.id
  );

  return {
    success: true,
    referralId: result.lastInsertRowid,
  };
}

/**
 * Mark referral as converted (paid subscription)
 */
export function convertReferral(userId, subscriptionData) {
  const referral = db
    .prepare('SELECT * FROM referrals WHERE referred_user_id = ? AND conversion_status = "pending"')
    .get(userId);

  if (!referral) {
    return { success: false, error: 'No pending referral found' };
  }

  const affiliate = db.prepare('SELECT * FROM affiliates WHERE id = ?').get(referral.affiliate_id);

  // Calculate commission (20% of first 3 months)
  const monthlyAmount = subscriptionData.amount;
  const commissionMonths = 3;
  const commissionAmount = monthlyAmount * commissionMonths * affiliate.commission_rate;

  // Update referral
  db.prepare(`
    UPDATE referrals SET
      conversion_status = 'converted',
      subscription_start_date = CURRENT_TIMESTAMP,
      subscription_plan = ?,
      subscription_amount = ?,
      commission_amount = ?
    WHERE id = ?
  `).run(subscriptionData.plan, monthlyAmount, commissionAmount, referral.id);

  // Update affiliate totals
  db.prepare(`
    UPDATE affiliates SET
      total_revenue = total_revenue + ?,
      total_commission = total_commission + ?
    WHERE id = ?
  `).run(monthlyAmount * commissionMonths, commissionAmount, affiliate.id);

  return {
    success: true,
    commissionAmount,
    affiliateId: affiliate.id,
  };
}

/**
 * Get affiliate dashboard data
 */
export function getAffiliateDashboard(affiliateId) {
  const affiliate = db.prepare('SELECT * FROM affiliates WHERE id = ?').get(affiliateId);

  if (!affiliate) {
    return null;
  }

  const referrals = db
    .prepare('SELECT * FROM referrals WHERE affiliate_id = ? ORDER BY created_at DESC')
    .all(affiliateId);

  const stats = {
    totalReferrals: affiliate.total_referrals,
    convertedReferrals: referrals.filter((r) => r.conversion_status === 'converted').length,
    pendingReferrals: referrals.filter((r) => r.conversion_status === 'pending').length,
    totalRevenue: affiliate.total_revenue,
    totalCommission: affiliate.total_commission,
    unpaidCommission: db
      .prepare(
        'SELECT SUM(commission_amount) as total FROM referrals WHERE affiliate_id = ? AND commission_paid = 0 AND conversion_status = "converted"'
      )
      .get(affiliateId).total || 0,
    conversionRate:
      affiliate.total_referrals > 0
        ? (referrals.filter((r) => r.conversion_status === 'converted').length /
            affiliate.total_referrals) *
          100
        : 0,
  };

  return {
    affiliate,
    referrals,
    stats,
  };
}

/**
 * Generate payout for affiliate
 */
export function generatePayout(affiliateId, periodStart, periodEnd) {
  // Get all unpaid commissions in period
  const commissions = db
    .prepare(
      `
    SELECT * FROM referrals
    WHERE affiliate_id = ?
      AND commission_paid = 0
      AND conversion_status = 'converted'
      AND subscription_start_date BETWEEN ? AND ?
  `
    )
    .all(affiliateId, periodStart, periodEnd);

  if (commissions.length === 0) {
    return { success: false, error: 'No unpaid commissions in period' };
  }

  const totalAmount = commissions.reduce((sum, c) => sum + c.commission_amount, 0);

  // Create payout record
  const payout = db
    .prepare(
      `
    INSERT INTO commission_payouts (affiliate_id, amount, period_start, period_end, status)
    VALUES (?, ?, ?, ?, 'pending')
  `
    )
    .run(affiliateId, totalAmount, periodStart, periodEnd);

  return {
    success: true,
    payoutId: payout.lastInsertRowid,
    amount: totalAmount,
    commissionCount: commissions.length,
  };
}

/**
 * Mark payout as paid
 */
export function markPayoutPaid(payoutId, stripePayoutId) {
  db.prepare(
    `
    UPDATE commission_payouts
    SET status = 'paid', paid_date = CURRENT_TIMESTAMP, stripe_payout_id = ?
    WHERE id = ?
  `
  ).run(stripePayoutId, payoutId);

  // Mark individual commissions as paid
  const payout = db.prepare('SELECT * FROM commission_payouts WHERE id = ?').get(payoutId);

  db.prepare(
    `
    UPDATE referrals
    SET commission_paid = 1, commission_paid_date = CURRENT_TIMESTAMP
    WHERE affiliate_id = ?
      AND conversion_status = 'converted'
      AND commission_paid = 0
      AND subscription_start_date BETWEEN ? AND ?
  `
  ).run(payout.affiliate_id, payout.period_start, payout.period_end);

  return { success: true };
}

/**
 * Get top affiliates (leaderboard)
 */
export function getTopAffiliates(limit = 10) {
  return db
    .prepare(
      `
    SELECT id, name, code, total_referrals, total_revenue, total_commission
    FROM affiliates
    WHERE status = 'active'
    ORDER BY total_revenue DESC
    LIMIT ?
  `
    )
    .all(limit);
}

/**
 * Get affiliate performance metrics
 */
export function getAffiliateMetrics(affiliateId, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const metrics = {
    newReferrals: db
      .prepare('SELECT COUNT(*) as count FROM referrals WHERE affiliate_id = ? AND created_at >= ?')
      .get(affiliateId, startDate).count,

    newConversions: db
      .prepare(
        'SELECT COUNT(*) as count FROM referrals WHERE affiliate_id = ? AND conversion_status = "converted" AND subscription_start_date >= ?'
      )
      .get(affiliateId, startDate).count,

    newRevenue:
      db
        .prepare(
          'SELECT SUM(subscription_amount * 3) as total FROM referrals WHERE affiliate_id = ? AND subscription_start_date >= ?'
        )
        .get(affiliateId, startDate).total || 0,

    newCommission:
      db
        .prepare(
          'SELECT SUM(commission_amount) as total FROM referrals WHERE affiliate_id = ? AND subscription_start_date >= ?'
        )
        .get(affiliateId, startDate).total || 0,
  };

  return metrics;
}

export default {
  createAffiliate,
  getAffiliateByCode,
  trackReferralClick,
  createReferral,
  convertReferral,
  getAffiliateDashboard,
  generatePayout,
  markPayoutPaid,
  getTopAffiliates,
  getAffiliateMetrics,
};
