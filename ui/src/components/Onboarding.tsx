import { useState } from 'react';
import { ArrowRight, ArrowLeft, Check, Sparkles, Users, Zap, TrendingUp, Play, X } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to Hivemind Engine',
      description: 'Your AI company management platform',
      icon: Sparkles,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100">Welcome to Hivemind!</h2>
            <p className="mt-3 text-zinc-400">
              You're about to launch your first autonomous AI company. Let's show you how it works.
            </p>
          </div>
          <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-950/50">
                <Users className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-200">AI Team</h3>
                <p className="text-sm text-zinc-400">
                  CEO, CTO, CMO, Designer, and Engineers work together 24/7
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-950/50">
                <Zap className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-200">Autonomous</h3>
                <p className="text-sm text-zinc-400">
                  Agents plan, build, and deploy products without constant oversight
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-950/50">
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-200">Revenue-Focused</h3>
                <p className="text-sm text-zinc-400">
                  Every agent targets $1M ARR with built-in monetization
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'How It Works',
      description: 'The AI company lifecycle',
      icon: Play,
      content: (
        <div className="space-y-6">
          <h2 className="text-center text-2xl font-bold text-zinc-100">The Hivemind Process</h2>
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 text-sm font-bold text-white">
                  1
                </div>
                <h3 className="font-semibold text-zinc-100">Set Your Goal</h3>
              </div>
              <p className="text-sm text-zinc-400">
                Tell the CLI what you want to build. Example: "Build a SaaS product for invoice management"
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 text-sm font-bold text-white">
                  2
                </div>
                <h3 className="font-semibold text-zinc-100">CEO Plans Strategy</h3>
              </div>
              <p className="text-sm text-zinc-400">
                The CEO agent analyzes your goal and creates a roadmap with projects and tasks
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 text-sm font-bold text-white">
                  3
                </div>
                <h3 className="font-semibold text-zinc-100">Specialists Refine</h3>
              </div>
              <p className="text-sm text-zinc-400">
                CTO adds technical details, Designer creates UI specs, CMO builds marketing strategy
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 text-sm font-bold text-white">
                  4
                </div>
                <h3 className="font-semibold text-zinc-100">Engineers Execute</h3>
              </div>
              <p className="text-sm text-zinc-400">
                Engineer agents build features, write code, run tests, and deploy to production
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 text-sm font-bold text-white">
                  5
                </div>
                <h3 className="font-semibold text-zinc-100">Monitor & Guide</h3>
              </div>
              <p className="text-sm text-zinc-400">
                Watch progress in real-time via dashboard, nudge agents, and provide feedback
              </p>
              </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Dashboard Tour',
      description: 'Navigate your AI company',
      icon: TrendingUp,
      content: (
        <div className="space-y-6">
          <h2 className="text-center text-2xl font-bold text-zinc-100">Dashboard Overview</h2>
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <h3 className="mb-2 font-semibold text-zinc-100">Dashboard</h3>
              <p className="text-sm text-zinc-400">
                High-level overview: progress, metrics, agent status, and recent activity
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <h3 className="mb-2 font-semibold text-zinc-100">Tasks</h3>
              <p className="text-sm text-zinc-400">
                See all tasks, their status, priority, and who's working on them. Create new tasks here.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <h3 className="mb-2 font-semibold text-zinc-100">Agents</h3>
              <p className="text-sm text-zinc-400">
                View your AI team, their roles, current status, and performance metrics
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <h3 className="mb-2 font-semibold text-zinc-100">Activity Log</h3>
              <p className="text-sm text-zinc-400">
                Real-time feed of everything happening: tasks started, completed, agent actions
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <h3 className="mb-2 font-semibold text-zinc-100">Costs & Analytics</h3>
              <p className="text-sm text-zinc-400">
                Track token usage, agent hours, API costs, and download detailed reports
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Create Your First Company',
      description: 'Get started now',
      icon: Sparkles,
      content: (
        <div className="space-y-6">
          <h2 className="text-center text-2xl font-bold text-zinc-100">Ready to Launch!</h2>
          <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-6">
            <h3 className="mb-3 font-semibold text-amber-400">Next Steps</h3>
            <ol className="space-y-3 text-sm text-zinc-300">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
                  1
                </span>
                <span>
                  <strong>Install CLI:</strong> <code className="rounded bg-zinc-900 px-2 py-1">npm install -g hivemind</code>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
                  2
                </span>
                <span>
                  <strong>Set API Key:</strong> Add your Anthropic API key to <code className="rounded bg-zinc-900 px-2 py-1">.env</code>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
                  3
                </span>
                <span>
                  <strong>Create Company:</strong> <code className="rounded bg-zinc-900 px-2 py-1">hivemind start "Your goal"</code>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
                  4
                </span>
                <span>
                  <strong>Watch Progress:</strong> Your company will appear in this dashboard automatically
                </span>
              </li>
            </ol>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="mb-3 font-semibold text-zinc-200">Need Help?</h3>
            <p className="text-sm text-zinc-400">
              Check out the <a href="/docs" className="text-amber-500 hover:text-amber-400">documentation</a> or join our{' '}
              <a href="#" className="text-amber-500 hover:text-amber-400">community Discord</a> for support.
            </p>
          </div>

          <div className="text-center">
            <button
              onClick={onComplete}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-8 py-3 font-semibold text-white transition hover:bg-amber-500"
            >
              <Check className="h-5 w-5" />
              Get Started
            </button>
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/95 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onSkip}
          className="absolute right-4 top-4 rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Progress bar */}
        <div className="flex gap-2 border-b border-zinc-800 px-8 py-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-amber-600' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-950/50">
              <Icon className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Step {step + 1} of {steps.length}</p>
              <h1 className="text-xl font-bold text-zinc-100">{currentStep.title}</h1>
            </div>
          </div>

          <div className="min-h-[400px]">{currentStep.content}</div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between border-t border-zinc-800 px-8 py-6">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-0"
          >
            <ArrowLeft className="h-5 w-5" />
            Previous
          </button>

          <button
            onClick={onSkip}
            className="text-sm text-zinc-500 transition hover:text-zinc-300"
          >
            Skip tutorial
          </button>

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-2 font-semibold text-white transition hover:bg-amber-500"
            >
              Next
              <ArrowRight className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={onComplete}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 font-semibold text-white transition hover:bg-emerald-500"
            >
              <Check className="h-5 w-5" />
              Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
