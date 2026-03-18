# Promo Code Implementation - PH50

## Overview
Implement a promo code system that gives Product Hunt users 50% off Pro tier for 6 months.

**Code:** PH50
**Discount:** 50% off ($29/mo → $14.50/mo)
**Duration:** 6 months
**Tier:** Pro only (not applicable to Free or Enterprise)
**Limit:** Unlimited uses (to maximize conversions)
**Expiry:** 30 days after Product Hunt launch

---

## Database Schema

### Create `promo_codes` table (SQLite)

```sql
CREATE TABLE IF NOT EXISTS promo_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    discount_percent INTEGER NOT NULL,
    duration_months INTEGER NOT NULL,
    applicable_tiers TEXT NOT NULL, -- JSON array: ["pro"]
    max_uses INTEGER, -- NULL = unlimited
    current_uses INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT 1,
    expires_at TEXT, -- ISO 8601 datetime
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert PH50 code
INSERT INTO promo_codes (code, discount_percent, duration_months, applicable_tiers, max_uses, expires_at)
VALUES (
    'PH50',
    50,
    6,
    '["pro"]',
    NULL,
    datetime('now', '+30 days')
);
```

### Create `user_subscriptions` table (if not exists)

```sql
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tier TEXT NOT NULL, -- 'free', 'pro', 'enterprise'
    status TEXT NOT NULL, -- 'active', 'cancelled', 'expired'
    promo_code TEXT,
    original_price REAL,
    discounted_price REAL,
    discount_end_date TEXT, -- When discount expires
    billing_cycle TEXT DEFAULT 'monthly',
    next_billing_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Create `promo_code_redemptions` table (tracking)

```sql
CREATE TABLE IF NOT EXISTS promo_code_redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    promo_code TEXT NOT NULL,
    redeemed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    utm_source TEXT,
    utm_campaign TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (promo_code) REFERENCES promo_codes(code)
);
```

---

## Backend API Endpoints

### 1. Validate Promo Code

**Endpoint:** `POST /api/promo/validate`

```javascript
// api/promo/validate.js
import Database from 'better-sqlite3';

export default function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code, tier } = req.body;

    if (!code || !tier) {
        return res.status(400).json({ error: 'Missing code or tier' });
    }

    const db = new Database('./data/hivemind.db');

    try {
        // Fetch promo code
        const promo = db.prepare(`
            SELECT * FROM promo_codes
            WHERE code = ? AND active = 1
        `).get(code.toUpperCase());

        if (!promo) {
            return res.status(404).json({
                valid: false,
                error: 'Invalid promo code'
            });
        }

        // Check expiry
        if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
            return res.status(400).json({
                valid: false,
                error: 'Promo code has expired'
            });
        }

        // Check max uses
        if (promo.max_uses && promo.current_uses >= promo.max_uses) {
            return res.status(400).json({
                valid: false,
                error: 'Promo code has reached maximum uses'
            });
        }

        // Check applicable tiers
        const applicableTiers = JSON.parse(promo.applicable_tiers);
        if (!applicableTiers.includes(tier.toLowerCase())) {
            return res.status(400).json({
                valid: false,
                error: `Promo code not applicable to ${tier} tier`
            });
        }

        // Calculate pricing
        const pricing = {
            free: 0,
            pro: 29,
            enterprise: 99
        };

        const originalPrice = pricing[tier.toLowerCase()];
        const discountAmount = (originalPrice * promo.discount_percent) / 100;
        const discountedPrice = originalPrice - discountAmount;

        return res.status(200).json({
            valid: true,
            promo: {
                code: promo.code,
                discount_percent: promo.discount_percent,
                duration_months: promo.duration_months,
                original_price: originalPrice,
                discounted_price: discountedPrice,
                savings: discountAmount,
                message: `${promo.discount_percent}% off for ${promo.duration_months} months`
            }
        });
    } catch (error) {
        console.error('Promo validation error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    } finally {
        db.close();
    }
}
```

### 2. Apply Promo Code (During Checkout)

**Endpoint:** `POST /api/subscription/create`

```javascript
// api/subscription/create.js
import Database from 'better-sqlite3';

export default function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, tier, promoCode, utmSource, utmCampaign } = req.body;

    const db = new Database('./data/hivemind.db');

    try {
        db.prepare('BEGIN TRANSACTION').run();

        let discountedPrice = null;
        let discountEndDate = null;

        // If promo code provided, validate and apply
        if (promoCode) {
            const promo = db.prepare(`
                SELECT * FROM promo_codes
                WHERE code = ? AND active = 1
            `).get(promoCode.toUpperCase());

            if (!promo) {
                db.prepare('ROLLBACK').run();
                return res.status(400).json({ error: 'Invalid promo code' });
            }

            // Apply discount
            const pricing = { free: 0, pro: 29, enterprise: 99 };
            const originalPrice = pricing[tier.toLowerCase()];
            discountedPrice = originalPrice * (1 - promo.discount_percent / 100);

            // Calculate discount end date
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + promo.duration_months);
            discountEndDate = endDate.toISOString();

            // Increment promo code usage
            db.prepare(`
                UPDATE promo_codes
                SET current_uses = current_uses + 1, updated_at = CURRENT_TIMESTAMP
                WHERE code = ?
            `).run(promo.code);

            // Track redemption
            db.prepare(`
                INSERT INTO promo_code_redemptions (user_id, promo_code, utm_source, utm_campaign)
                VALUES (?, ?, ?, ?)
            `).run(userId, promo.code, utmSource, utmCampaign);
        }

        // Create subscription
        const pricing = { free: 0, pro: 29, enterprise: 99 };
        const originalPrice = pricing[tier.toLowerCase()];
        const nextBillingDate = new Date();
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

        db.prepare(`
            INSERT INTO user_subscriptions (
                user_id, tier, status, promo_code, original_price,
                discounted_price, discount_end_date, next_billing_date
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            userId,
            tier,
            'active',
            promoCode?.toUpperCase() || null,
            originalPrice,
            discountedPrice,
            discountEndDate,
            nextBillingDate.toISOString()
        );

        db.prepare('COMMIT').run();

        return res.status(200).json({
            success: true,
            subscription: {
                tier,
                original_price: originalPrice,
                current_price: discountedPrice || originalPrice,
                discount_ends: discountEndDate,
                next_billing: nextBillingDate.toISOString()
            }
        });
    } catch (error) {
        db.prepare('ROLLBACK').run();
        console.error('Subscription creation error:', error);
        return res.status(500).json({ error: 'Failed to create subscription' });
    } finally {
        db.close();
    }
}
```

---

## Frontend Integration

### Checkout Form Component

```javascript
// ui/src/components/Checkout.tsx
import { useState } from 'react';

export default function Checkout() {
    const [promoCode, setPromoCode] = useState('');
    const [promoApplied, setPromoApplied] = useState(null);
    const [promoError, setPromoError] = useState('');
    const [tier, setTier] = useState('pro');

    const handleApplyPromo = async () => {
        setPromoError('');
        setPromoApplied(null);

        try {
            const response = await fetch('/api/promo/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: promoCode, tier })
            });

            const data = await response.json();

            if (data.valid) {
                setPromoApplied(data.promo);
            } else {
                setPromoError(data.error);
            }
        } catch (error) {
            setPromoError('Failed to validate promo code');
        }
    };

    const handleCheckout = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const utmSource = urlParams.get('ref') || urlParams.get('utm_source');
        const utmCampaign = urlParams.get('utm_campaign');

        const response = await fetch('/api/subscription/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: getCurrentUserId(), // Implement this
                tier,
                promoCode: promoApplied?.code || null,
                utmSource,
                utmCampaign
            })
        });

        const data = await response.json();
        if (data.success) {
            window.location.href = '/dashboard?upgraded=true';
        }
    };

    return (
        <div className="checkout-form">
            <h2>Upgrade to Pro</h2>

            {/* Pricing */}
            <div className="pricing">
                <div className={promoApplied ? 'original-price strike' : 'price'}>
                    ${promoApplied?.original_price || 29}/month
                </div>
                {promoApplied && (
                    <div className="discounted-price">
                        ${promoApplied.discounted_price}/month
                        <span className="discount-badge">
                            {promoApplied.discount_percent}% off for {promoApplied.duration_months} months
                        </span>
                    </div>
                )}
            </div>

            {/* Promo Code Input */}
            <div className="promo-section">
                <input
                    type="text"
                    placeholder="Promo code (e.g., PH50)"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    className="promo-input"
                />
                <button onClick={handleApplyPromo} className="apply-btn">
                    Apply
                </button>
            </div>

            {promoError && (
                <div className="error-message">{promoError}</div>
            )}

            {promoApplied && (
                <div className="success-message">
                    ✅ Promo code applied! You save ${promoApplied.savings}/month
                </div>
            )}

            {/* Checkout Button */}
            <button onClick={handleCheckout} className="checkout-btn">
                Upgrade Now
            </button>
        </div>
    );
}
```

### Auto-Apply Promo from URL

```javascript
// Auto-apply PH50 if user comes from Product Hunt
useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');

    if (ref === 'producthunt') {
        setPromoCode('PH50');
        handleApplyPromo();
    }
}, []);
```

---

## UTM Tracking Setup

### Track Product Hunt traffic

**URLs to use:**
- Product Hunt link: `https://hivemind-engine.vercel.app?ref=producthunt`
- Email links: `?utm_source=email&utm_campaign=ph_launch`
- Twitter links: `?utm_source=twitter&utm_campaign=ph_launch`
- Discord links: `?utm_source=discord&utm_campaign=ph_support`

### Analytics Tracking Table

```sql
CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL, -- 'page_view', 'signup', 'upgrade', 'promo_applied'
    user_id INTEGER,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    referrer TEXT,
    user_agent TEXT,
    ip_address TEXT,
    metadata TEXT, -- JSON
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Track Page Views with UTM

```javascript
// ui/src/utils/analytics.js
export function trackPageView() {
    const urlParams = new URLSearchParams(window.location.search);
    const utmData = {
        source: urlParams.get('utm_source') || urlParams.get('ref'),
        medium: urlParams.get('utm_medium'),
        campaign: urlParams.get('utm_campaign'),
        content: urlParams.get('utm_content')
    };

    // Save to localStorage (persist across pages)
    if (utmData.source) {
        localStorage.setItem('utm_data', JSON.stringify(utmData));
    }

    // Send to backend
    fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            event_type: 'page_view',
            utm_source: utmData.source,
            utm_medium: utmData.medium,
            utm_campaign: utmData.campaign,
            utm_content: utmData.content,
            referrer: document.referrer,
            user_agent: navigator.userAgent
        })
    });
}

// Call on app load
trackPageView();
```

---

## Admin Dashboard - Promo Analytics

### Create Promo Stats Endpoint

```javascript
// api/admin/promo-stats.js
export default function handler(req, res) {
    const db = new Database('./data/hivemind.db');

    try {
        const stats = db.prepare(`
            SELECT
                pc.code,
                pc.discount_percent,
                pc.duration_months,
                pc.current_uses,
                pc.max_uses,
                COUNT(DISTINCT pcr.user_id) as unique_users,
                SUM(CASE WHEN us.status = 'active' THEN 1 ELSE 0 END) as active_subscriptions,
                GROUP_CONCAT(DISTINCT pcr.utm_source) as traffic_sources
            FROM promo_codes pc
            LEFT JOIN promo_code_redemptions pcr ON pc.code = pcr.promo_code
            LEFT JOIN user_subscriptions us ON pcr.user_id = us.user_id
            WHERE pc.code = 'PH50'
            GROUP BY pc.code
        `).get();

        const dailyRedemptions = db.prepare(`
            SELECT
                DATE(redeemed_at) as date,
                COUNT(*) as redemptions,
                utm_source
            FROM promo_code_redemptions
            WHERE promo_code = 'PH50'
            GROUP BY DATE(redeemed_at), utm_source
            ORDER BY date DESC
        `).all();

        return res.status(200).json({
            stats,
            daily_redemptions: dailyRedemptions
        });
    } finally {
        db.close();
    }
}
```

---

## Testing Checklist

- [ ] PH50 code validates correctly
- [ ] Discount calculates properly (50% off $29 = $14.50)
- [ ] Duration is set to 6 months
- [ ] Code only applies to Pro tier
- [ ] UTM parameters are tracked
- [ ] Redemption count increments
- [ ] Expired codes are rejected
- [ ] Invalid codes show error message
- [ ] Auto-apply works from ?ref=producthunt
- [ ] Checkout flow completes successfully
- [ ] Subscription table updates correctly
- [ ] Admin dashboard shows accurate stats

---

## Launch Day Checklist

- [ ] Activate PH50 code in database
- [ ] Test checkout flow end-to-end
- [ ] Verify UTM tracking works
- [ ] Monitor redemptions in real-time
- [ ] Set up alerts for high redemption volume
- [ ] Prepare to extend expiry if launch goes viral

---

## Post-Launch Analysis

**Metrics to track:**
- Total PH50 redemptions
- Conversion rate (PH visitors → signups → paid)
- Revenue generated from promo
- Retention rate after 6 months (when discount expires)
- Most effective traffic source (email, Twitter, PH comments, etc.)

**SQL Query for Analysis:**

```sql
SELECT
    DATE(pcr.redeemed_at) as date,
    COUNT(*) as redemptions,
    SUM(us.discounted_price) as revenue_discounted,
    SUM(us.original_price) as revenue_full_price,
    pcr.utm_source,
    pcr.utm_campaign
FROM promo_code_redemptions pcr
JOIN user_subscriptions us ON pcr.user_id = us.user_id
WHERE pcr.promo_code = 'PH50'
GROUP BY DATE(pcr.redeemed_at), utm_source, utm_campaign
ORDER BY date DESC;
```
