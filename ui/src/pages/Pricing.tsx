import { useState } from 'react';
import { Check, Zap, Users, Building, Sparkles, Shield, Clock } from 'lucide-react';

const TIER_CONFIG = {
  free: {
    name: 'Free',
    price: 0,
    interval: '',
    description: 'Perfect for trying out Hivemind',
    icon: Zap,
    features: [
      'Up to 3 AI agents',
      'Single project',
      '$50/month AI budget',
      'Community support',
      'Basic analytics',
    ],
    cta: 'Current Plan',
    disabled: true,
  },
  pro: {
    name: 'Pro',
    price: 49,
    interval: 'month',
    description: 'For serious builders and teams',
    icon: Users,
    features: [
      'Up to 10 AI agents',
      '5 concurrent projects',
      '$500/month AI budget',
      'Priority support',
      'Advanced analytics',
      'Cost tracking & budgets',
      '14-day free trial',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  team: {
    name: 'Team',
    price: 199,
    interval: 'month',
    description: 'For growing companies',
    icon: Building,
    features: [
      'Up to 50 AI agents',
      '20 concurrent projects',
      '$2,000/month AI budget',
      'Team collaboration',
      'Advanced health monitoring',
      'Custom integrations',
      'Dedicated support',
      '14-day free trial',
    ],
    cta: 'Start Free Trial',
  },
  enterprise: {
    name: 'Enterprise',
    price: 999,
    interval: 'month',
    description: 'For large organizations',
    icon: Shield,
    features: [
      'Unlimited agents',
      'Unlimited projects',
      'Unlimited AI budget',
      'White-label options',
      'SLA guarantees',
      'Custom deployment',
      '24/7 premium support',
      'Dedicated account manager',
    ],
    cta: 'Contact Sales',
  },
};

export default function Pricing() {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async (tier: string) => {
    if (tier === 'free') return;

    setIsLoading(true);
    setSelectedTier(tier);

    try {
      const response = await fetch('http://localhost:3100/api/paddle/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Include auth token if using requireAuth middleware
        },
        credentials: 'include',
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout');
      }

      const { checkoutUrl } = await response.json();

      // Redirect to Paddle checkout
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
      setSelectedTier(null);
    }
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

        {/* Trial Badge */}
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 ring-1 ring-amber-500/20">
          <Clock className="h-4 w-4" />
          <span>14-day free trial • Cancel anytime</span>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-20 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(TIER_CONFIG).map(([key, tier]) => {
          const Icon = tier.icon;
          const isPopular = tier.popular;

          return (
            <div
              key={key}
              className={`relative flex flex-col rounded-2xl border bg-zinc-900/50 p-6 backdrop-blur transition hover:border-zinc-700 ${
                isPopular
                  ? 'border-amber-500/50 ring-2 ring-amber-500/20'
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

              {/* Icon */}
              <div className="mb-4">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${
                  isPopular ? 'bg-amber-500/10' : 'bg-zinc-800'
                }`}>
                  <Icon className={`h-6 w-6 ${isPopular ? 'text-amber-500' : 'text-zinc-400'}`} />
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
                  <div>
                    <span className="text-4xl font-bold text-zinc-100">${tier.price}</span>
                    <span className="text-zinc-500">/{tier.interval}</span>
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="mb-8 flex-1 space-y-3">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${
                      isPopular ? 'text-amber-500' : 'text-zinc-500'
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
            <h3 className="mb-3 text-lg font-semibold text-zinc-100">Need More?</h3>
            <p className="text-sm text-zinc-400">
              Enterprise customers get custom pricing, dedicated infrastructure, and white-label options.
              Contact us for a tailored solution.
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
