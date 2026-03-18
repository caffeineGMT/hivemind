import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ReferralTracker {
  constructor(dbPath = null) {
    this.dbPath = dbPath || path.join(__dirname, '../../data/partnerships.db');
    this.db = new Database(this.dbPath);
    this.initDatabase();
  }

  initDatabase() {
    // Create partnerships table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS partners (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL, -- 'cursor', 'v0', 'bolt', etc.
        commission_rate REAL DEFAULT 0.20,
        status TEXT DEFAULT 'pending', -- 'pending', 'active', 'paused'
        contract_signed_at TEXT,
        monthly_minimum REAL DEFAULT 100.00,
        payout_email TEXT,
        api_key TEXT UNIQUE,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS referrals (
        id TEXT PRIMARY KEY,
        partner_id TEXT NOT NULL,
        user_id TEXT,
        source_user_id TEXT, -- Partner's user ID
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        ip_address TEXT,
        user_agent TEXT,
        landing_page TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (partner_id) REFERENCES partners(id)
      );

      CREATE TABLE IF NOT EXISTS conversions (
        id TEXT PRIMARY KEY,
        referral_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        plan TEXT NOT NULL, -- 'starter', 'pro', 'enterprise'
        amount REAL NOT NULL,
        recurring BOOLEAN DEFAULT 1,
        converted_at TEXT DEFAULT CURRENT_TIMESTAMP,
        cancelled_at TEXT,
        FOREIGN KEY (referral_id) REFERENCES referrals(id)
      );

      CREATE TABLE IF NOT EXISTS commissions (
        id TEXT PRIMARY KEY,
        partner_id TEXT NOT NULL,
        conversion_id TEXT NOT NULL,
        amount REAL NOT NULL,
        rate REAL NOT NULL,
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
        paid_at TEXT,
        stripe_transfer_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (partner_id) REFERENCES partners(id),
        FOREIGN KEY (conversion_id) REFERENCES conversions(id)
      );

      CREATE TABLE IF NOT EXISTS partnership_events (
        id TEXT PRIMARY KEY,
        partner_id TEXT NOT NULL,
        event_type TEXT NOT NULL, -- 'signed', 'paused', 'renewed', 'terminated'
        details TEXT, -- JSON
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (partner_id) REFERENCES partners(id)
      );

      CREATE INDEX IF NOT EXISTS idx_referrals_partner ON referrals(partner_id);
      CREATE INDEX IF NOT EXISTS idx_referrals_user ON referrals(user_id);
      CREATE INDEX IF NOT EXISTS idx_conversions_referral ON conversions(referral_id);
      CREATE INDEX IF NOT EXISTS idx_commissions_partner ON commissions(partner_id);
      CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
    `);
  }

  // Track a new referral
  trackReferral({ partnerId, userId, sourceUserId, utmParams, metadata }) {
    const id = this.generateId();
    const stmt = this.db.prepare(`
      INSERT INTO referrals (
        id, partner_id, user_id, source_user_id,
        utm_source, utm_medium, utm_campaign,
        ip_address, user_agent, landing_page
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      partnerId,
      userId,
      sourceUserId,
      utmParams?.source || null,
      utmParams?.medium || null,
      utmParams?.campaign || null,
      metadata?.ipAddress || null,
      metadata?.userAgent || null,
      metadata?.landingPage || null
    );

    return { id, partnerId, userId };
  }

  // Track a conversion (user subscribes)
  trackConversion({ referralId, userId, plan, amount, recurring = true }) {
    const id = this.generateId();

    // Get the referral to find partner
    const referral = this.db
      .prepare('SELECT * FROM referrals WHERE id = ?')
      .get(referralId);

    if (!referral) {
      throw new Error('Referral not found');
    }

    // Insert conversion
    const conversionStmt = this.db.prepare(`
      INSERT INTO conversions (id, referral_id, user_id, plan, amount, recurring)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    conversionStmt.run(id, referralId, userId, plan, amount, recurring ? 1 : 0);

    // Calculate commission
    const partner = this.db
      .prepare('SELECT * FROM partners WHERE id = ?')
      .get(referral.partner_id);

    const commissionAmount = amount * partner.commission_rate;

    // Create commission record
    this.createCommission({
      partnerId: partner.id,
      conversionId: id,
      amount: commissionAmount,
      rate: partner.commission_rate
    });

    return { id, conversionId: id, commission: commissionAmount };
  }

  // Create a commission record
  createCommission({ partnerId, conversionId, amount, rate }) {
    const id = this.generateId();
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];

    const stmt = this.db.prepare(`
      INSERT INTO commissions (
        id, partner_id, conversion_id, amount, rate,
        period_start, period_end, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `);

    stmt.run(id, partnerId, conversionId, amount, rate, periodStart, periodEnd);

    return id;
  }

  // Get partner stats
  getPartnerStats(partnerId) {
    const stats = this.db
      .prepare(
        `
      SELECT
        COUNT(DISTINCT r.id) as total_referrals,
        COUNT(DISTINCT c.id) as total_conversions,
        COALESCE(SUM(CASE WHEN c.cancelled_at IS NULL THEN c.amount ELSE 0 END), 0) as active_mrr,
        COALESCE(SUM(com.amount), 0) as total_commissions,
        COALESCE(SUM(CASE WHEN com.status = 'pending' THEN com.amount ELSE 0 END), 0) as pending_commissions,
        COALESCE(SUM(CASE WHEN com.status = 'paid' THEN com.amount ELSE 0 END), 0) as paid_commissions
      FROM partners p
      LEFT JOIN referrals r ON r.partner_id = p.id
      LEFT JOIN conversions c ON c.referral_id = r.id
      LEFT JOIN commissions com ON com.conversion_id = c.id
      WHERE p.id = ?
      GROUP BY p.id
    `
      )
      .get(partnerId);

    return stats || {
      total_referrals: 0,
      total_conversions: 0,
      active_mrr: 0,
      total_commissions: 0,
      pending_commissions: 0,
      paid_commissions: 0
    };
  }

  // Get monthly commission report
  getMonthlyReport(partnerId, year, month) {
    const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const periodEnd = new Date(year, month, 0).toISOString().split('T')[0];

    return this.db
      .prepare(
        `
      SELECT
        c.id,
        c.user_id,
        c.plan,
        c.amount,
        c.converted_at,
        com.amount as commission_amount,
        com.status as commission_status,
        com.paid_at
      FROM conversions c
      INNER JOIN referrals r ON c.referral_id = r.id
      INNER JOIN commissions com ON com.conversion_id = c.id
      WHERE r.partner_id = ?
        AND c.converted_at >= ?
        AND c.converted_at <= ?
      ORDER BY c.converted_at DESC
    `
      )
      .all(partnerId, periodStart, periodEnd);
  }

  // Mark commissions as paid
  markCommissionsPaid(partnerId, periodStart, periodEnd, stripeTransferId) {
    const stmt = this.db.prepare(`
      UPDATE commissions
      SET status = 'paid',
          paid_at = CURRENT_TIMESTAMP,
          stripe_transfer_id = ?
      WHERE partner_id = ?
        AND period_start >= ?
        AND period_end <= ?
        AND status = 'pending'
    `);

    const result = stmt.run(stripeTransferId, partnerId, periodStart, periodEnd);
    return result.changes;
  }

  // Create a new partner
  createPartner({ name, type, commissionRate = 0.2, payoutEmail }) {
    const id = this.generateId();
    const apiKey = this.generateApiKey();

    const stmt = this.db.prepare(`
      INSERT INTO partners (id, name, type, commission_rate, payout_email, api_key, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `);

    stmt.run(id, name, type, commissionRate, payoutEmail, apiKey);

    return { id, name, type, apiKey };
  }

  // Activate a partner (contract signed)
  activatePartner(partnerId) {
    const stmt = this.db.prepare(`
      UPDATE partners
      SET status = 'active',
          contract_signed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(partnerId);

    // Log event
    this.logPartnerEvent(partnerId, 'signed', { status: 'active' });
  }

  // Log partner event
  logPartnerEvent(partnerId, eventType, details) {
    const id = this.generateId();
    const stmt = this.db.prepare(`
      INSERT INTO partnership_events (id, partner_id, event_type, details)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, partnerId, eventType, JSON.stringify(details));
  }

  // Get all active partners
  getActivePartners() {
    return this.db
      .prepare('SELECT * FROM partners WHERE status = "active" ORDER BY name')
      .all();
  }

  // Get partner by API key (for webhook authentication)
  getPartnerByApiKey(apiKey) {
    return this.db
      .prepare('SELECT * FROM partners WHERE api_key = ?')
      .get(apiKey);
  }

  // Get leaderboard
  getPartnerLeaderboard(limit = 10) {
    return this.db
      .prepare(
        `
      SELECT
        p.id,
        p.name,
        p.type,
        COUNT(DISTINCT r.id) as total_referrals,
        COUNT(DISTINCT c.id) as total_conversions,
        COALESCE(SUM(com.amount), 0) as total_commissions
      FROM partners p
      LEFT JOIN referrals r ON r.partner_id = p.id
      LEFT JOIN conversions c ON c.referral_id = r.id
      LEFT JOIN commissions com ON com.conversion_id = c.id
      WHERE p.status = 'active'
      GROUP BY p.id
      ORDER BY total_commissions DESC
      LIMIT ?
    `
      )
      .all(limit);
  }

  // Utility functions
  generateId() {
    return `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateApiKey() {
    return `pk_${Math.random().toString(36).substr(2, 9)}_${Math.random().toString(36).substr(2, 9)}`;
  }

  close() {
    this.db.close();
  }
}

export default ReferralTracker;
