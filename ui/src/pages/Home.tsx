import { ArrowRight, Check, Play, Zap, Brain, TrendingUp, Users, Clock, Github, Twitter, MessageCircle, Terminal } from 'lucide-react';
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

export default function Home() {
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
    {
      id: 0,
      user_name: 'Jessica Park',
      user_role: 'Technical Founder',
      user_company: 'CloudSync Pro',
      rating: 5,
      quote: "The auto-healing feature saved me countless hours. Agents detect and fix deployment failures automatically. I sleep better knowing my AI team is on it.",
      created_at: new Date().toISOString(),
    },
  ];

  const displayedTestimonials = testimonials.length > 0 ? testimonials : fallbackTestimonials;

  const features = [
    {
      icon: Brain,
      title: 'Multi-Project Management',
      description: 'Run multiple AI companies simultaneously. Each with dedicated agents, isolated budgets, and independent KPIs.',
    },
    {
      icon: Zap,
      title: 'Real-Time Monitoring',
      description: 'Live dashboard shows agent activity, task progress, deployment status, and system health 24/7.',
    },
    {
      icon: TrendingUp,
      title: 'Cost Tracking & Analytics',
      description: 'Track API costs per agent, project ROI, and revenue metrics. Built-in budget alerts and cost optimization.',
    },
    {
      icon: Clock,
      title: 'Auto-Healing Agents',
      description: 'Agents detect failures and self-recover. Automatic rollback on deployment failures. Zero downtime.',
    },
    {
      icon: Users,
      title: 'Cross-Project Analytics',
      description: 'Aggregate performance across all your AI companies. Identify top performers and scale what works.',
    },
    {
      icon: Zap,
      title: 'Continuous Deployment',
      description: 'Agents auto-deploy to Vercel with health checks. Watch your product go live in real-time.',
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

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-800/40 bg-amber-950/30 px-4 py-1.5 text-sm text-amber-400">
            <Zap className="h-4 w-4" />
            <span>AI Companies That Build Themselves</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-100 sm:text-6xl lg:text-7xl">
            Build Your AI Company
            <br />
            <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-clip-text text-transparent">
              in Minutes
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 sm:text-xl">
            Launch autonomous AI companies with full engineering teams. CEO, CTO, CMO, and engineers
            collaborate to build, deploy, and monetize products while you sleep.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() => navigate('/dashboard')}
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
        </div>

        {/* Animated Terminal Demo */}
        <div className="mt-16">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-3">
              <div className="flex gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500"></div>
                <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
              </div>
              <div className="ml-4 flex items-center gap-2 text-xs text-zinc-500">
                <Terminal className="h-3 w-3" />
                <span>hivemind@orchestrator:~</span>
              </div>
            </div>
            <div className="p-6 font-mono text-sm">
              <div className="text-green-400">$ hivemind create TechStartup</div>
              <div className="mt-2 text-zinc-400">→ Spawning CEO agent...</div>
              <div className="text-zinc-400">→ Spawning CTO agent...</div>
              <div className="text-zinc-400">→ Spawning CMO agent...</div>
              <div className="mt-2 text-amber-400">✓ Company created: TechStartup</div>
              <div className="mt-4 text-green-400">$ hivemind status</div>
              <div className="mt-2 text-zinc-400">
                <div>CEO: Planning product roadmap...</div>
                <div>CTO: Building authentication system...</div>
                <div>CMO: Crafting landing page copy...</div>
                <div className="mt-2 text-amber-400">⚡ 3 agents active | 12 tasks in progress</div>
              </div>
            </div>
          </div>
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

      {/* Demo Video */}
      <section id="demo-video" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-zinc-100 sm:text-4xl">See It In Action</h2>
          <p className="mt-4 text-lg text-zinc-400">
            90-second walkthrough: Create company → Agents work autonomously → Check dashboard
          </p>
        </div>
        <div className="mt-12">
          <div className="aspect-video overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            {/* Replace LOOM_VIDEO_ID with your actual Loom video ID */}
            {/* Example: https://www.loom.com/share/abc123 -> use "abc123" */}
            {import.meta.env.VITE_LOOM_VIDEO_ID ? (
              <iframe
                src={`https://www.loom.com/embed/${import.meta.env.VITE_LOOM_VIDEO_ID}`}
                title="Hivemind Engine Demo - 90 Second Walkthrough"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-950/50">
                  <Play className="h-10 w-10 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-zinc-100">Record Your Demo Video</h3>
                  <p className="mt-2 text-sm text-zinc-400">
                    Use OBS Studio to record:
                  </p>
                  <ol className="mt-4 space-y-2 text-left text-sm text-zinc-400">
                    <li>1. Create 'TechStartup' company with goal 'Build a SaaS landing page'</li>
                    <li>2. Show agents planning → coding → deploying</li>
                    <li>3. Navigate to dashboard and show real-time metrics</li>
                  </ol>
                </div>
                <p className="mt-4 text-xs text-zinc-500">
                  Upload to Loom, then add{' '}
                  <code className="rounded bg-zinc-800 px-2 py-0.5">VITE_LOOM_VIDEO_ID=your_video_id</code> to .env
                </p>
              </div>
            )}
          </div>
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
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {displayedTestimonials.slice(0, 6).map((testimonial: Testimonial) => (
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

      {/* Pricing Preview */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-zinc-100 sm:text-4xl">Simple, Transparent Pricing</h2>
          <p className="mt-4 text-lg text-zinc-400">
            Start free, scale as you grow
          </p>
        </div>
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {/* Free Tier */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
            <h3 className="text-xl font-bold text-zinc-100">Free</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-zinc-100">$0</span>
              <span className="text-zinc-400">/month</span>
            </div>
            <ul className="mt-8 space-y-4">
              {['1 AI company', '5 agents max', 'Basic monitoring', 'Community support'].map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                  <span className="text-sm text-zinc-300">{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-8 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-3 font-semibold text-zinc-200 transition hover:bg-zinc-700"
            >
              Start Free
            </button>
          </div>

          {/* Pro Tier */}
          <div className="relative rounded-2xl border-2 border-amber-600 bg-gradient-to-b from-amber-950/20 to-zinc-900/50 p-8">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-amber-600 px-4 py-1 text-sm font-semibold text-white">
              Most Popular
            </div>
            <h3 className="text-xl font-bold text-zinc-100">Pro</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-zinc-100">$49</span>
              <span className="text-zinc-400">/month</span>
            </div>
            <ul className="mt-8 space-y-4">
              {[
                '10 AI companies',
                'Unlimited agents',
                'Advanced analytics',
                'Priority support',
                'Custom integrations',
                'Team collaboration',
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                  <span className="text-sm text-zinc-300">{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-8 w-full rounded-lg bg-amber-600 px-6 py-3 font-semibold text-white transition hover:bg-amber-500"
            >
              Start Free Trial
            </button>
          </div>

          {/* Enterprise Tier */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
            <h3 className="text-xl font-bold text-zinc-100">Enterprise</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-zinc-100">Custom</span>
            </div>
            <ul className="mt-8 space-y-4">
              {[
                'Unlimited companies',
                'Dedicated infrastructure',
                'SLA guarantees',
                'White-label options',
                'Custom AI models',
                'Dedicated support',
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                  <span className="text-sm text-zinc-300">{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => (window.location.href = 'mailto:sales@hivemind.ai')}
              className="mt-8 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-3 font-semibold text-zinc-200 transition hover:bg-zinc-700"
            >
              Contact Sales
            </button>
          </div>
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
            onClick={() => navigate('/dashboard')}
            className="mt-10 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-amber-500"
          >
            Start Free
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </section>

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
