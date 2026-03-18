// API endpoint for creating subscriptions
// This is a serverless function that runs on Vercel

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

    const { tier, promoCode, utmSource, utmCampaign } = req.body;

    if (!tier) {
        return res.status(400).json({ error: 'Missing tier' });
    }

    try {
        // For MVP: Log the subscription attempt
        console.log('[Subscription] New signup:', {
            tier,
            promoCode,
            utmSource,
            utmCampaign,
            timestamp: new Date().toISOString()
        });

        // Calculate pricing
        const pricing = {
            starter: 29,
            pro: 99,
            enterprise: 299
        };

        let originalPrice = pricing[tier.toLowerCase()] || 99;
        let currentPrice = originalPrice;

        // Apply promo code discount
        if (promoCode === 'PH50') {
            currentPrice = originalPrice * 0.5; // 50% off
        }

        // In production, integrate with Paddle/Stripe here
        // For now, return success with mock checkout URL
        const checkoutUrl = `/dashboard?upgraded=true&tier=${tier}&promo=${promoCode || 'none'}`;

        return res.status(200).json({
            success: true,
            checkoutUrl,
            subscription: {
                tier,
                original_price: originalPrice,
                current_price: currentPrice,
                promo_code: promoCode || null,
                utm_source: utmSource || null,
                utm_campaign: utmCampaign || null
            }
        });

    } catch (error) {
        console.error('Subscription creation error:', error);
        return res.status(500).json({ error: 'Failed to create subscription' });
    }
}
