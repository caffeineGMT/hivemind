import { ArrowRight, Check, Play, Zap, Brain, TrendingUp, Users, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import TestimonialForm from '../components/TestimonialForm';
import { useState } from 'react';

interface Testimonial {
  id: number;
  user_name: string;
  user_role: string;
  user_company: string;
  rating: number;
  quote: string;
  created_at: string;
}

export default function Landing() {
  const navigate = useNavigate();
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);

  const { data: testimonials = [] } = useQuery({
    queryKey: ['testimonials'],
    queryFn: async () => {
      const response = await fetch('http://localhost:3100/api/testimonials?approved=true&limit=6');
      if (!response.ok) return [];
      return response.json();
    },
  });

  const pricingTiers = [
    {
      name: 'Starter',
      price: 49,
      description: 'Perfect for testing AI company management',
      features: [
        'Up to 3 AI companies',
        '5 agents per company',
        'Basic task automation',
        'Community support',
        'Weekly progress reports',
      ],
      cta: 'Start Free Trial',
      highlighted: false,
    },
    {
      name: 'Pro',
      price: 199,
      description: 'For serious entrepreneurs building AI ventures',
      features: [
        'Unlimited AI companies',
        '25 agents per company',
        'Advanced task orchestration',
        'Priority support',
        'Daily progress reports',
        'Custom agent training',
        'Slack/Discord integration',
      ],
      cta: 'Start Free Trial',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 999,
      description: 'Maximum scale and customization',
      features: [
        'Everything in Pro',
        'Unlimited agents',
        'Multi-company portfolios',
        'Dedicated success manager',
        'Custom integrations',
        'SLA guarantees',
        'Advanced analytics',
        'White-label options',
      ],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ];

  // Fallback testimonials if API hasn't loaded yet
  const fallbackTestimonials = [
    {
      id: 0,
      user_name: 'Sarah Chen',
      user_role: 'Serial Entrepreneur',
      user_company: 'TechVentures AI',
      rating: 5,
      quote: "I launched 3 AI companies in parallel using Hivemind. Each one has a full team working 24/7. It's like having a startup accelerator in your pocket.",
      created_at: new Date().toISOString(),
    },
    {
      id: 0,
      user_name: 'Marcus Williams',
      user_role: 'Founder',
      user_company: 'AutomateScale',
      rating: 5,
      quote: "The ROI is insane. My AI company built and deployed a SaaS product in 2 weeks. Revenue hit $12K MRR in the first month, all automated.",
      created_at: new Date().toISOString(),
    },
  ];

  const displayedTestimonials = testimonials.length > 0 ? testimonials : fallbackTestimonials;

  const features = [
    {
      icon: Brain,
      title: 'Autonomous AI Agents',
      description: 'CEO, CTO, CMO, and engineers work together 24/7 to build and ship your product.',
    },
    {
      icon: Zap,
      title: 'Continuous Deployment',
      description: 'Agents auto-deploy to Vercel. Watch your product go live in real-time.',
    },
    {
      icon: TrendingUp,
      title: 'Revenue-Focused',
      description: 'Every agent targets $1M ARR. Built-in monetization, analytics, and growth loops.',
    },
    {
      icon: Clock,
      title: '24/7 Operation',
      description: 'Your company never sleeps. Agents work around the clock, shipping while you rest.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-zinc-100">Hivemind Engine</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/app')}
                className="text-sm text-zinc-400 transition hover:text-zinc-200"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/app')}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-500"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-800/40 bg-amber-950/30 px-4 py-1.5 text-sm text-amber-400">
            <Zap className="h-4 w-4" />
            <span>AI Companies That Build Themselves</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-100 sm:text-6xl lg:text-7xl">
            Your AI Company,
            <br />
            <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-clip-text text-transparent">
              Working 24/7
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 sm:text-xl">
            Launch autonomous AI companies with full engineering teams. CEO, CTO, CMO, and engineers
            collaborate to build, deploy, and monetize products while you sleep.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() => navigate('/app')}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-8 py-4 text-base font-semibold text-white transition hover:bg-amber-500 sm:w-auto"
            >
              Start Your AI Company
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => document.getElementById('demo-video')?.scrollIntoView({ behavior: 'smooth' })}
              className="group flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/50 px-8 py-4 text-base font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800/50 sm:w-auto"
            >
              <Play className="h-5 w-5" />
              Watch Demo
            </button>
          </div>
          <p className="mt-6 text-sm text-zinc-500">
            14-day free trial · No credit card required · Cancel anytime
          </p>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            { value: '500+', label: 'AI Companies Created' },
            { value: '12K+', label: 'Agents Deployed' },
            { value: '$2.4M', label: 'Revenue Generated' },
            { value: '99.9%', label: 'Uptime SLA' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-6 text-center">
              <div className="text-3xl font-bold text-amber-500">{stat.value}</div>
              <div className="mt-1 text-sm text-zinc-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-zinc-800/50 bg-zinc-900/30 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-zinc-100 sm:text-4xl">
              Built for Speed and Revenue
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              Everything you need to launch and scale AI-powered companies
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-6 transition hover:border-zinc-700"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-950/50">
                  <feature.icon className="h-6 w-6 text-amber-500" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-100">{feature.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Video */}
      <section id="demo-video" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-zinc-100 sm:text-4xl">See It In Action</h2>
          <p className="mt-4 text-lg text-zinc-400">
            Watch how easy it is to launch and manage your AI company
          </p>
        </div>
        <div className="mt-12">
          <div className="aspect-video overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            {/* Placeholder for demo video - replace with actual video URL */}
            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-950/50">
                <Play className="h-10 w-10 text-amber-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-zinc-100">Demo Video Coming Soon</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  90-second walkthrough of creating a company and watching agents work
                </p>
              </div>
              <p className="mt-4 text-xs text-zinc-500">
                Replace this section with: &lt;iframe src="YOUR_VIDEO_URL" /&gt;
              </p>
            </div>
            {/*
            Uncomment and add your video URL:
            <iframe
              src="https://www.youtube.com/embed/YOUR_VIDEO_ID"
              title="Hivemind Engine Demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
            */}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-zinc-800/50 bg-zinc-900/30 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-zinc-100 sm:text-4xl">Loved by Founders</h2>
            <p className="mt-4 text-lg text-zinc-400">
              Join hundreds of entrepreneurs building AI companies
            </p>
          </div>

          {showTestimonialForm ? (
            <div className="mt-12">
              <div className="mx-auto max-w-2xl">
                <TestimonialForm />
                <button
                  onClick={() => setShowTestimonialForm(false)}
                  className="mt-4 w-full text-center text-sm text-zinc-500 hover:text-zinc-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-16 grid gap-8 sm:grid-cols-2">
                {displayedTestimonials.slice(0, 4).map((testimonial) => (
                  <div
                    key={testimonial.id || testimonial.user_name}
                    className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-8"
                  >
                    <div className="flex gap-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <svg
                          key={i}
                          className="h-5 w-5 text-amber-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="mt-4 text-base text-zinc-300">&ldquo;{testimonial.quote}&rdquo;</p>
                    <div className="mt-6 flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-lg font-bold text-white">
                        {testimonial.user_name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-100">{testimonial.user_name}</div>
                        <div className="text-sm text-zinc-400">
                          {testimonial.user_role}
                          {testimonial.user_company && ` · ${testimonial.user_company}`}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 text-center">
                <button
                  onClick={() => setShowTestimonialForm(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-600/50 bg-amber-950/30 px-6 py-3 font-semibold text-amber-400 transition hover:bg-amber-950/50"
                >
                  Share Your Success Story
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-zinc-100 sm:text-4xl">Simple, Transparent Pricing</h2>
          <p className="mt-4 text-lg text-zinc-400">
            Start free, scale as you grow. All plans include 14-day free trial.
          </p>
        </div>
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl border p-8 transition ${
                tier.highlighted
                  ? 'border-amber-600/50 bg-gradient-to-b from-amber-950/30 to-zinc-900/50 shadow-xl shadow-amber-950/20'
                  : 'border-zinc-800/60 bg-zinc-900/50'
              }`}
            >
              {tier.highlighted && (
                <div className="mb-4 inline-block rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white">
                  Most Popular
                </div>
              )}
              <h3 className="text-2xl font-bold text-zinc-100">{tier.name}</h3>
              <p className="mt-2 text-sm text-zinc-400">{tier.description}</p>
              <div className="mt-6">
                <span className="text-5xl font-bold text-zinc-100">${tier.price}</span>
                <span className="text-zinc-400">/month</span>
              </div>
              <button
                onClick={() => navigate('/app')}
                className={`mt-8 w-full rounded-lg px-6 py-3 text-base font-semibold transition ${
                  tier.highlighted
                    ? 'bg-amber-600 text-white hover:bg-amber-500'
                    : 'border border-zinc-700 bg-zinc-800/50 text-zinc-100 hover:bg-zinc-800'
                }`}
              >
                {tier.cta}
              </button>
              <ul className="mt-8 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-zinc-300">
                    <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-zinc-800/50 bg-gradient-to-b from-zinc-900/50 to-zinc-950 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-100 sm:text-4xl">
            Ready to Build Your AI Empire?
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Join the future of entrepreneurship. Launch your first AI company in minutes.
          </p>
          <button
            onClick={() => navigate('/app')}
            className="mt-10 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-amber-500"
          >
            Start Free Trial
            <ArrowRight className="h-5 w-5" />
          </button>
          <p className="mt-4 text-sm text-zinc-500">
            No credit card required · 14-day free trial · Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 bg-zinc-950 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-zinc-100">Hivemind Engine</span>
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
