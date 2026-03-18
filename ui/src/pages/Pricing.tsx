import { useState } from 'react';
import { Check, Zap, Users, Building, Sparkles, Shield, Clock, Brain, Github, Twitter, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

export default function Pricing() {
  const navigate = useNavigate();
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
      {/* Navigation Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-zinc-100">Hivemind Engine</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="text-sm text-zinc-400 transition hover:text-zinc-200"
              >
                Home
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm text-zinc-400 transition hover:text-zinc-200"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-500"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Header */}
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
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-20 md:grid-cols-2 lg:grid-cols-3">
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

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 bg-zinc-950 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-zinc-100">Hivemind Engine</span>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/hivemind-engine"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 transition hover:text-zinc-200"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com/hivemindengine"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 transition hover:text-zinc-200"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://discord.gg/hivemind"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 transition hover:text-zinc-200"
                aria-label="Discord"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
            </div>
            <p className="text-sm text-zinc-500">
              &copy; 2026 Hivemind Engine. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
