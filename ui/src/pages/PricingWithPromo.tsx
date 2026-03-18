import { useState, useEffect } from 'react';
import { Check, Zap, Users, Building, Sparkles, Shield, Clock, Tag, AlertCircle } from 'lucide-react';

const TIER_CONFIG = {
  starter: {
    name: 'Starter',
    price: 29,
    interval: 'month',
    description: 'Perfect for solo founders testing AI automation',
    icon: Zap,
    features: [
      '3 AI companies',
      '10 agents per company',
      'Basic monitoring dashboard',
      'Community support',
      '100 deployments/month',
      'Cost tracking & alerts',
      'Auto-healing enabled',
    ],
    cta: 'Start 14-Day Trial',
    popular: false,
    disabled: false,
  },
  pro: {
    name: 'Pro',
    price: 99,
    interval: 'month',
    description: 'For entrepreneurs scaling multiple AI businesses',
    icon: Users,
    features: [
      '10 AI companies',
      'Unlimited agents',
      'Advanced analytics & insights',
      'Priority support (24h response)',
      'Unlimited deployments',
      'Cross-project analytics',
      'Team collaboration (5 seats)',
      'Custom integrations',
      'API access',
    ],
    cta: 'Start 14-Day Trial',
    popular: true,
    disabled: false,
  },
  enterprise: {
    name: 'Enterprise',
    price: 299,
    interval: 'month',
    description: 'For agencies and teams managing AI portfolios',
    icon: Building,
    features: [
      'Unlimited AI companies',
      'Unlimited agents',
      'White-label options',
      'Dedicated support manager',
      'Unlimited deployments',
      'Advanced security & compliance',
      'Team collaboration (unlimited)',
      'Custom AI models',
      'SLA guarantees (99.9% uptime)',
      'Dedicated infrastructure',
      'Priority feature requests',
      'Onboarding & training',
    ],
    cta: 'Start 14-Day Trial',
    popular: false,
    disabled: false,
  },
};

interface PromoCodeValidation {
  valid: boolean;
  code?: string;
  discount_percent?: number;
  duration_months?: number;
  original_price?: number;
  discounted_price?: number;
  savings?: number;
  message?: string;
  error?: string;
}

export default function Pricing() {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoValidation, setPromoValidation] = useState<PromoCodeValidation | null>(null);
  const [promoError, setPromoError] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  // Auto-apply promo code from URL (e.g., ?ref=producthunt)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    const utmSource = urlParams.get('utm_source');

    if (ref === 'producthunt' || utmSource === 'producthunt') {
      setPromoCode('PH50');
      validatePromoCode('PH50', 'pro');
    }
  }, []);

  const validatePromoCode = async (code: string, tier: string) => {
    if (!code.trim()) {
      setPromoValidation(null);
      setPromoError('');
      return;
    }

    setIsValidatingPromo(true);
    setPromoError('');

    try {
      const response = await fetch('http://localhost:3100/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: code.toUpperCase(), tier }),
      });

      const data = await response.json();

      if (data.valid) {
        setPromoValidation(data.promo);
        setPromoError('');
      } else {
        setPromoValidation(null);
        setPromoError(data.error || 'Invalid promo code');
      }
    } catch (error) {
      console.error('Promo validation error:', error);
      setPromoError('Failed to validate promo code');
      setPromoValidation(null);
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleApplyPromo = () => {
    if (!selectedTier) {
      setPromoError('Please select a plan first');
      return;
    }
    validatePromoCode(promoCode, selectedTier);
  };

  const handleUpgrade = async (tier: string) => {
    if (tier === 'free') return;

    setIsLoading(true);
    setSelectedTier(tier);

    try {
      // Extract UTM parameters from URL
      const urlParams = new URLSearchParams(window.location.search);
      const utmSource = urlParams.get('ref') || urlParams.get('utm_source') || '';
      const utmCampaign = urlParams.get('utm_campaign') || '';

      const response = await fetch('http://localhost:3100/api/subscription/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          tier,
          promoCode: promoValidation?.code || null,
          utmSource,
          utmCampaign,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout');
      }

      const { checkoutUrl } = await response.json();

      // Redirect to Paddle checkout or custom checkout
      window.location.href = checkoutUrl || '/dashboard?upgraded=true';
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
      setSelectedTier(null);
    }
  };

  const getEffectivePrice = (tierKey: string) => {
    const tier = TIER_CONFIG[tierKey as keyof typeof TIER_CONFIG];
    if (!promoValidation || selectedTier !== tierKey) {
      return tier.price;
    }
    return promoValidation.discounted_price || tier.price;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Header */}
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 ring-1 ring-amber-500/30">
          <Sparkles className="h-8 w-8 text-amber-500" />
        </div>

        <h1 className="mb-4 bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-5xl font-bold tracking-tight text-transparent">
          Choose Your Plan
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-zinc-400">
          Start with a 14-day free trial on Pro or Team. No credit card required. Scale as you grow.
        </p>

        {/* Trial Badge + Product Hunt Offer */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 ring-1 ring-amber-500/20">
            <Clock className="h-4 w-4" />
            <span>14-day free trial • Cancel anytime</span>
          </div>

          {/* Product Hunt Special Offer Banner */}
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-5 py-2.5 text-sm font-semibold text-purple-300 ring-1 ring-purple-500/30">
            <Tag className="h-4 w-4" />
            <span>🚀 Product Hunt Special: 50% off Pro with code <span className="font-mono text-purple-200">PH50</span></span>
          </div>
        </div>

        {/* Promo Code Input (Floating) */}
        <div className="mx-auto mt-8 max-w-md">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur">
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Tag className="h-4 w-4" />
              Have a promo code?
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Enter code (e.g., PH50)"
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              <button
                onClick={handleApplyPromo}
                disabled={isValidatingPromo || !promoCode.trim() || !selectedTier}
                className="rounded-lg bg-amber-500 px-6 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isValidatingPromo ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
                ) : (
                  'Apply'
                )}
              </button>
            </div>

            {/* Promo validation feedback */}
            {promoValidation && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-400">
                <Check className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <div className="font-semibold">Code applied!</div>
                  <div className="text-xs text-green-400/80">
                    {promoValidation.message} • Save ${promoValidation.savings?.toFixed(2)}/month
                  </div>
                </div>
              </div>
            )}

            {promoError && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>{promoError}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-20 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(TIER_CONFIG).map(([key, tier]) => {
          const Icon = tier.icon;
          const isPopular = tier.popular;
          const isSelected = selectedTier === key;
          const effectivePrice = getEffectivePrice(key);
          const hasDiscount = promoValidation && isSelected && effectivePrice < tier.price;

          return (
            <div
              key={key}
              onClick={() => setSelectedTier(key)}
              className={`relative flex cursor-pointer flex-col rounded-2xl border bg-zinc-900/50 p-6 backdrop-blur transition hover:border-zinc-700 ${
                isPopular
                  ? 'border-amber-500/50 ring-2 ring-amber-500/20'
                  : isSelected
                  ? 'border-purple-500/50 ring-2 ring-purple-500/20'
                  : 'border-zinc-800'
              }`}
            >
              {/* Popular Badge */}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-1 text-xs font-semibold text-zinc-950">
                    MOST POPULAR
                  </div>
                </div>
              )}

              {/* Discount Badge */}
              {hasDiscount && (
                <div className="absolute -top-3 right-4">
                  <div className="rounded-full bg-gradient-to-r from-green-500 to-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                    {promoValidation.discount_percent}% OFF
                  </div>
                </div>
              )}

              {/* Icon */}
              <div className="mb-4">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${
                  isPopular ? 'bg-amber-500/10' : isSelected ? 'bg-purple-500/10' : 'bg-zinc-800'
                }`}>
                  <Icon className={`h-6 w-6 ${
                    isPopular ? 'text-amber-500' : isSelected ? 'text-purple-400' : 'text-zinc-400'
                  }`} />
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="mb-2 text-2xl font-bold text-zinc-100">{tier.name}</h3>
              <p className="mb-6 text-sm text-zinc-500">{tier.description}</p>

              {/* Price */}
              <div className="mb-6">
                {tier.price === 0 ? (
                  <div className="text-4xl font-bold text-zinc-100">Free</div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    {hasDiscount && (
                      <span className="text-2xl font-semibold text-zinc-500 line-through">
                        ${tier.price}
                      </span>
                    )}
                    <span className={`text-4xl font-bold ${hasDiscount ? 'text-green-400' : 'text-zinc-100'}`}>
                      ${effectivePrice}
                    </span>
                    <span className="text-zinc-500">/{tier.interval}</span>
                  </div>
                )}
                {hasDiscount && promoValidation && (
                  <div className="mt-1 text-xs text-green-400">
                    For {promoValidation.duration_months} months, then ${tier.price}/mo
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="mb-8 flex-1 space-y-3">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${
                      isPopular ? 'text-amber-500' : isSelected ? 'text-purple-400' : 'text-zinc-500'
                    }`} />
                    <span className="text-zinc-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleUpgrade(key)}
                disabled={tier.disabled || isLoading}
                className={`w-full rounded-lg py-3 font-semibold transition ${
                  tier.disabled
                    ? 'cursor-not-allowed bg-zinc-800 text-zinc-600'
                    : isPopular
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 hover:from-amber-600 hover:to-amber-700 active:scale-95'
                    : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 active:scale-95'
                } ${isLoading && selectedTier === key ? 'opacity-50' : ''}`}
              >
                {isLoading && selectedTier === key ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-900" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  tier.cta
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* FAQ / Additional Info */}
      <div className="mx-auto max-w-4xl border-t border-zinc-800 px-4 pt-12 pb-20">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="mb-3 text-lg font-semibold text-zinc-100">Free Trial Details</h3>
            <p className="text-sm text-zinc-400">
              All paid plans include a 14-day free trial. No credit card required to start. You can
              cancel anytime during or after the trial.
            </p>
          </div>
          <div>
            <h3 className="mb-3 text-lg font-semibold text-zinc-100">Billing & Payment</h3>
            <p className="text-sm text-zinc-400">
              Secure payment processing via Paddle. Update or cancel your subscription anytime through
              the billing portal. Refunds available within 30 days.
            </p>
          </div>
          <div>
            <h3 className="mb-3 text-lg font-semibold text-zinc-100">Promo Codes</h3>
            <p className="text-sm text-zinc-400">
              Product Hunt users: Use code <span className="font-mono text-purple-400">PH50</span> for
              50% off Pro for 6 months. Limited time offer!
            </p>
          </div>
          <div>
            <h3 className="mb-3 text-lg font-semibold text-zinc-100">Questions?</h3>
            <p className="text-sm text-zinc-400">
              Check out our <a href="/docs" className="text-amber-500 hover:underline">documentation</a> or{' '}
              <a href="mailto:support@hivemind.ai" className="text-amber-500 hover:underline">contact support</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
