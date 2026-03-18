import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, SubscriptionStatus } from '../api';

interface BillingProps {
  companyId?: string;
}

const PRICING_TIERS = [
  {
    tier: 'starter',
    name: 'Starter',
    price: 49,
    description: 'Perfect for individuals and small projects',
    features: [
      '1 AI Company',
      '5 AI Agents',
      'Basic Dashboard',
      'Email Support',
    ],
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: 199,
    description: 'For teams and growing businesses',
    features: [
      '5 AI Companies',
      '20 AI Agents per company',
      'Advanced Analytics',
      'Priority Support',
      'API Access',
    ],
    popular: true,
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    price: 999,
    description: 'Unlimited scale for large organizations',
    features: [
      'Unlimited Companies',
      'Unlimited Agents',
      'White-label Dashboard',
      'Dedicated Support',
      'Custom Integrations',
      'SLA Guarantee',
    ],
  },
];

export default function Billing({ companyId }: BillingProps) {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      loadSubscription();
    }
  }, [companyId]);

  async function loadSubscription() {
    if (!companyId) return;
    try {
      const data = await api.getSubscription(companyId);
      setSubscription(data);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(tier: string) {
    if (!companyId) return;
    setCheckoutLoading(tier);
    try {
      const email = prompt('Enter your email address:');
      if (!email) {
        setCheckoutLoading(null);
        return;
      }

      const session = await api.createCheckout({
        tier,
        companyId,
        email,
        successUrl: `${window.location.origin}/app/billing?success=true`,
        cancelUrl: `${window.location.origin}/app/billing`,
      });

      // Redirect to Stripe Checkout
      window.location.href = session.url;
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Failed to create checkout session. Please try again.');
      setCheckoutLoading(null);
    }
  }

  async function handleManageSubscription() {
    if (!companyId) return;
    try {
      const session = await api.createPortal(companyId, window.location.href);
      window.location.href = session.url;
    } catch (error) {
      console.error('Failed to open billing portal:', error);
      alert('Failed to open billing portal. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading subscription...</div>
      </div>
    );
  }

  const currentTier = subscription?.tier || 'free';
  const isActive = subscription?.status === 'active';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <button
            onClick={() => navigate('/app')}
            className="mb-6 text-purple-300 hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-5xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-purple-200">
            Scale your AI workforce with flexible pricing
          </p>
        </div>

        {/* Current Subscription Status */}
        {isActive && (
          <div className="max-w-2xl mx-auto mb-12 bg-purple-500/20 border border-purple-400/30 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold mb-1">Current Plan</h3>
                <p className="text-purple-200">
                  {PRICING_TIERS.find(t => t.tier === currentTier)?.name || 'Free'} Plan
                  {subscription?.currentPeriodEnd && (
                    <span className="ml-2 text-sm">
                      • Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={handleManageSubscription}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Manage Subscription
              </button>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {PRICING_TIERS.map((tier) => {
            const isCurrent = currentTier === tier.tier;
            const isUpgrade = !isCurrent && !isActive;

            return (
              <div
                key={tier.tier}
                className={`
                  relative rounded-xl p-8 border-2 transition-all
                  ${tier.popular
                    ? 'bg-purple-500/20 border-purple-400 scale-105'
                    : 'bg-white/5 border-white/10 hover:border-purple-400/50'
                  }
                  ${isCurrent ? 'ring-4 ring-green-500/50' : ''}
                `}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Current Plan
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {tier.name}
                  </h3>
                  <p className="text-purple-200 text-sm mb-4">
                    {tier.description}
                  </p>
                  <div className="text-5xl font-bold text-white mb-2">
                    ${tier.price}
                  </div>
                  <div className="text-purple-300 text-sm">per month</div>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start text-purple-100">
                      <svg
                        className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(tier.tier)}
                  disabled={isCurrent || checkoutLoading === tier.tier}
                  className={`
                    w-full py-3 px-6 rounded-lg font-semibold transition-all
                    ${isCurrent
                      ? 'bg-gray-500 cursor-not-allowed text-white'
                      : tier.popular
                      ? 'bg-purple-500 hover:bg-purple-600 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                    }
                    ${checkoutLoading === tier.tier ? 'opacity-50 cursor-wait' : ''}
                  `}
                >
                  {checkoutLoading === tier.tier
                    ? 'Loading...'
                    : isCurrent
                    ? 'Current Plan'
                    : isUpgrade
                    ? `Get ${tier.name}`
                    : `Upgrade to ${tier.name}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ / Additional Info */}
        <div className="max-w-4xl mx-auto mt-16 text-center">
          <h2 className="text-2xl font-bold text-white mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4 text-left">
            <details className="bg-white/5 rounded-lg p-6">
              <summary className="text-white font-semibold cursor-pointer">
                Can I change my plan later?
              </summary>
              <p className="text-purple-200 mt-3">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately,
                and billing is prorated.
              </p>
            </details>
            <details className="bg-white/5 rounded-lg p-6">
              <summary className="text-white font-semibold cursor-pointer">
                What payment methods do you accept?
              </summary>
              <p className="text-purple-200 mt-3">
                We accept all major credit cards (Visa, Mastercard, American Express) via Stripe.
              </p>
            </details>
            <details className="bg-white/5 rounded-lg p-6">
              <summary className="text-white font-semibold cursor-pointer">
                Is there a free trial?
              </summary>
              <p className="text-purple-200 mt-3">
                Every account starts with a Free tier that includes 1 company and 3 agents.
                You can upgrade anytime to unlock more features.
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
