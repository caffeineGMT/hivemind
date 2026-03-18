-- Promo Codes Migration
-- Run this to add promo code functionality for Product Hunt launch

-- Create promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    discount_percent INTEGER NOT NULL,
    duration_months INTEGER NOT NULL,
    applicable_tiers TEXT NOT NULL, -- JSON array: ["pro", "enterprise"]
    max_uses INTEGER, -- NULL = unlimited
    current_uses INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT 1,
    expires_at TEXT, -- ISO 8601 datetime
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tier TEXT NOT NULL, -- 'starter', 'pro', 'enterprise'
    status TEXT NOT NULL, -- 'active', 'cancelled', 'expired'
    promo_code TEXT,
    original_price REAL,
    discounted_price REAL,
    discount_end_date TEXT, -- When discount expires
    billing_cycle TEXT DEFAULT 'monthly',
    next_billing_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create promo_code_redemptions table (tracking)
CREATE TABLE IF NOT EXISTS promo_code_redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    promo_code TEXT NOT NULL,
    redeemed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    utm_source TEXT,
    utm_campaign TEXT,
    FOREIGN KEY (promo_code) REFERENCES promo_codes(code)
);

-- Create analytics_events table for UTM tracking
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

-- Insert PH50 promo code for Product Hunt launch
INSERT OR IGNORE INTO promo_codes (code, discount_percent, duration_months, applicable_tiers, max_uses, expires_at)
VALUES (
    'PH50',
    50,
    6,
    '["pro"]',
    NULL, -- unlimited uses
    datetime('now', '+30 days')
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON promo_code_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_utm_source ON analytics_events(utm_source);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
