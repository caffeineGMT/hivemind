import express from 'express';
import { ReferralTracker } from './referral-tracker.js';

const router = express.Router();
const tracker = new ReferralTracker();

// Middleware to authenticate partner API requests
function authenticatePartner(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const partner = tracker.getPartnerByApiKey(apiKey);

  if (!partner) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.partner = partner;
  next();
}

// Track a referral (public endpoint, called when user clicks referral link)
router.post('/api/partnerships/track', (req, res) => {
  try {
    const { ref, source_user_id, user_id, utm_source, utm_medium, utm_campaign } = req.body;

    // Get partner by type/ref
    const partners = tracker.getActivePartners();
    const partner = partners.find(p => p.type === ref || p.id === ref);

    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Track referral
    const result = tracker.trackReferral({
      partnerId: partner.id,
      userId: user_id,
      sourceUserId: source_user_id,
      utmParams: {
        source: utm_source,
        medium: utm_medium,
        campaign: utm_campaign
      },
      metadata: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        landingPage: req.headers.referer
      }
    });

    res.json({
      success: true,
      referral_id: result.id,
      partner: partner.name
    });
  } catch (error) {
    console.error('Error tracking referral:', error);
    res.status(500).json({ error: 'Failed to track referral' });
  }
});

// Track a conversion (internal endpoint, called when user subscribes)
router.post('/api/partnerships/convert', (req, res) => {
  try {
    const { referral_id, user_id, plan, amount, recurring } = req.body;

    const result = tracker.trackConversion({
      referralId: referral_id,
      userId: user_id,
      plan,
      amount,
      recurring
    });

    res.json({
      success: true,
      conversion_id: result.id,
      commission: result.commission
    });
  } catch (error) {
    console.error('Error tracking conversion:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get partner stats (partner API endpoint)
router.get('/api/partnerships/stats', authenticatePartner, (req, res) => {
  try {
    const stats = tracker.getPartnerStats(req.partner.id);
    res.json({
      partner: {
        name: req.partner.name,
        type: req.partner.type,
        commission_rate: req.partner.commission_rate,
        status: req.partner.status
      },
      stats
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get monthly report (partner API endpoint)
router.get('/api/partnerships/reports/:year/:month', authenticatePartner, (req, res) => {
  try {
    const { year, month } = req.params;
    const report = tracker.getMonthlyReport(req.partner.id, parseInt(year), parseInt(month));

    res.json({
      period: `${year}-${month}`,
      partner: req.partner.name,
      conversions: report,
      summary: {
        total_conversions: report.length,
        total_revenue: report.reduce((sum, c) => sum + c.amount, 0),
        total_commission: report.reduce((sum, c) => sum + c.commission_amount, 0)
      }
    });
  } catch (error) {
    console.error('Error getting report:', error);
    res.status(500).json({ error: 'Failed to get report' });
  }
});

// Get partner leaderboard (public endpoint)
router.get('/api/partnerships/leaderboard', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = tracker.getPartnerLeaderboard(limit);

    res.json({
      leaderboard: leaderboard.map(p => ({
        name: p.name,
        type: p.type,
        total_referrals: p.total_referrals,
        total_conversions: p.total_conversions,
        total_commissions: p.total_commissions
      }))
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Admin: Create a new partner (requires admin auth - add your auth middleware)
router.post('/api/partnerships/partners', (req, res) => {
  try {
    // TODO: Add admin authentication middleware
    const { name, type, commission_rate, payout_email } = req.body;

    const partner = tracker.createPartner({
      name,
      type,
      commissionRate: commission_rate,
      payoutEmail: payout_email
    });

    res.json({
      success: true,
      partner: {
        id: partner.id,
        name: partner.name,
        type: partner.type,
        api_key: partner.apiKey
      },
      message: 'Partner created. Share the API key with them securely.'
    });
  } catch (error) {
    console.error('Error creating partner:', error);
    res.status(500).json({ error: 'Failed to create partner' });
  }
});

// Admin: Activate a partner (contract signed)
router.post('/api/partnerships/partners/:id/activate', (req, res) => {
  try {
    // TODO: Add admin authentication middleware
    const { id } = req.params;

    tracker.activatePartner(id);

    res.json({
      success: true,
      message: 'Partner activated'
    });
  } catch (error) {
    console.error('Error activating partner:', error);
    res.status(500).json({ error: 'Failed to activate partner' });
  }
});

// Admin: Mark commissions as paid
router.post('/api/partnerships/commissions/pay', (req, res) => {
  try {
    // TODO: Add admin authentication middleware
    const { partner_id, period_start, period_end, stripe_transfer_id } = req.body;

    const count = tracker.markCommissionsPaid(
      partner_id,
      period_start,
      period_end,
      stripe_transfer_id
    );

    res.json({
      success: true,
      commissions_paid: count,
      stripe_transfer_id
    });
  } catch (error) {
    console.error('Error marking commissions paid:', error);
    res.status(500).json({ error: 'Failed to mark commissions paid' });
  }
});

// Webhook: Handle partner events (e.g., from Cursor, v0, bolt.new)
router.post('/api/partnerships/webhook/:partner_type', (req, res) => {
  try {
    const { partner_type } = req.params;
    const event = req.body;

    console.log(`Webhook from ${partner_type}:`, event);

    // Handle different event types
    switch (event.type) {
      case 'user.exported':
        // User exported project from partner to Hivemind
        tracker.trackReferral({
          partnerId: partner_type,
          userId: event.user_id,
          sourceUserId: event.partner_user_id,
          utmParams: {
            source: partner_type,
            medium: 'export',
            campaign: event.campaign || 'organic'
          },
          metadata: {
            ...event.metadata
          }
        });
        break;

      case 'user.deployed':
        // User successfully deployed via partner integration
        // This might trigger additional commission bonus
        console.log('User deployed successfully via partner');
        break;

      default:
        console.log('Unknown event type:', event.type);
    }

    res.json({ success: true, received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
