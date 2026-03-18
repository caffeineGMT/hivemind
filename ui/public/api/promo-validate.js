// API endpoint for validating promo codes
// This is a serverless function that runs on Vercel

import Database from 'better-sqlite3';
import path from 'path';

export default function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code, tier } = req.body;

    if (!code || !tier) {
        return res.status(400).json({ error: 'Missing code or tier' });
    }

    // In production, use persistent storage; for MVP, fallback to in-memory validation
    try {
        // Hardcoded PH50 validation for quick deployment
        if (code.toUpperCase() === 'PH50') {
            const pricing = {
                starter: 29,
                pro: 99,
                enterprise: 299
            };

            const originalPrice = pricing[tier.toLowerCase()] || 99;
            const discountPercent = 50;
            const durationMonths = 6;
            const discountedPrice = originalPrice * (1 - discountPercent / 100);
            const savings = originalPrice - discountedPrice;

            return res.status(200).json({
                valid: true,
                promo: {
                    code: 'PH50',
                    discount_percent: discountPercent,
                    duration_months: durationMonths,
                    original_price: originalPrice,
                    discounted_price: discountedPrice,
                    savings: savings,
                    message: `${discountPercent}% off for ${durationMonths} months`
                }
            });
        }

        // Invalid code
        return res.status(404).json({
            valid: false,
            error: 'Invalid promo code'
        });

    } catch (error) {
        console.error('Promo validation error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
