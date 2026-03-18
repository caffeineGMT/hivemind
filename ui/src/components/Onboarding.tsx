import { useState } from 'react';
import { ArrowRight, ArrowLeft, Sparkles, Rocket, X, Loader2, PartyPopper } from 'lucide-react';
import confetti from 'canvas-confetti';

interface OnboardingProps {
  onComplete: (companyData: { name: string; goal: string }) => Promise<void>;
  onSkip: () => void;
}

const EXAMPLE_GOALS = [
  'Build a blog with markdown support and dark mode',
  'Create a REST API for todo management with authentication',
  'Design a SaaS landing page with pricing tiers and testimonials',
  'Build an invoice generator with PDF export',
  'Create a personal portfolio website with project showcase',
];

export default function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [companyGoal, setCompanyGoal] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleComplete = async () => {
    if (!companyName || !companyGoal) return;

    setIsCreating(true);
    setStep(3);

    try {
      // Call the API to create the company
      await onComplete({ name: companyName, goal: companyGoal });

      // Move to success step
      setStep(4);
      setIsCreating(false);

      // Trigger confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#f59e0b', '#d97706', '#b45309'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#f59e0b', '#d97706', '#b45309'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    } catch (error) {
      console.error('Failed to create company:', error);
      setIsCreating(false);
      setStep(2); // Go back to goal step if error
    }
  };

  const canProceed = step === 1 ? companyName.length > 0 : companyGoal.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/95 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        {/* Close/Skip button */}
        <button
          onClick={onSkip}
          className="absolute right-4 top-4 rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
          disabled={isCreating}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Progress bar */}
        <div className="flex gap-2 border-b border-zinc-800 px-8 py-6">
          {[1, 2, 3, 4].map((i) => (
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
          {/* Step indicator */}
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-950/50">
              {step === 1 && <Sparkles className="h-6 w-6 text-amber-500" />}
              {step === 2 && <Rocket className="h-6 w-6 text-amber-500" />}
              {step === 3 && <Loader2 className="h-6 w-6 animate-spin text-amber-500" />}
              {step === 4 && <PartyPopper className="h-6 w-6 text-amber-500" />}
            </div>
            <div>
              <p className="text-sm text-zinc-500">Step {step} of 4</p>
              <h1 className="text-xl font-bold text-zinc-100">
                {step === 1 && 'Name Your Company'}
                {step === 2 && 'Set Your Goal'}
                {step === 3 && 'Launching Your AI Team'}
                {step === 4 && 'All Set!'}
              </h1>
            </div>
          </div>

          {/* Step 1: Company Name */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <p className="mb-4 text-zinc-400">
                  Give your AI company a name. This is what you'll see in the dashboard.
                </p>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., My Blog Project, Invoice Generator, Portfolio Site..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && canProceed) {
                      setStep(2);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Step 2: Company Goal */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <p className="mb-4 text-zinc-400">
                  Describe what you want to build. Be specific! Your AI team will use this to plan and execute.
                </p>
                <textarea
                  value={companyGoal}
                  onChange={(e) => setCompanyGoal(e.target.value)}
                  placeholder="Describe your project in detail..."
                  rows={6}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
                  autoFocus
                />
              </div>

              {/* Example goals */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-zinc-300">Need inspiration? Try these examples:</h3>
                <div className="space-y-2">
                  {EXAMPLE_GOALS.map((goal, index) => (
                    <button
                      key={index}
                      onClick={() => setCompanyGoal(goal)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-left text-sm text-zinc-300 transition hover:border-amber-600 hover:bg-zinc-800"
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Creating Company */}
          {step === 3 && (
            <div className="space-y-6 py-12 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600">
                <Loader2 className="h-10 w-10 animate-spin text-white" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-100">Assembling Your AI Team...</h2>
              <p className="text-zinc-400">
                Creating workspace, initializing agents, and planning your first sprint.
              </p>
              <div className="mx-auto max-w-md space-y-3">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-left">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                    <span className="text-sm text-zinc-300">Spawning CEO agent...</span>
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-left">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500 animation-delay-200" />
                    <span className="text-sm text-zinc-300">Creating project workspace...</span>
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-left">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500 animation-delay-400" />
                    <span className="text-sm text-zinc-300">Analyzing your goal...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="space-y-6 py-8 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600">
                <PartyPopper className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-100">Your Team is Working!</h2>
              <p className="text-zinc-400">
                Your AI company <strong className="text-amber-500">{companyName}</strong> is now live.
              </p>

              <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-6">
                <h3 className="mb-3 font-semibold text-emerald-400">What happens next?</h3>
                <ul className="space-y-3 text-left text-sm text-zinc-300">
                  <li className="flex items-start gap-3">
                    <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                      1
                    </span>
                    <span>
                      <strong>CEO plans strategy:</strong> Breaks down your goal into projects and tasks
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                      2
                    </span>
                    <span>
                      <strong>Specialists refine:</strong> CTO adds technical details, Designer creates UI specs
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                      3
                    </span>
                    <span>
                      <strong>Engineers execute:</strong> Build features, write code, and deploy to production
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                      4
                    </span>
                    <span>
                      <strong>You monitor progress:</strong> Check back in 30 minutes to see updates!
                    </span>
                  </li>
                </ul>
              </div>

              <div className="text-center">
                <button
                  onClick={onSkip}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-8 py-3 font-semibold text-white transition hover:bg-amber-500"
                >
                  Explore Dashboard
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation (only show for steps 1 and 2) */}
        {step <= 2 && (
          <div className="flex items-center justify-between border-t border-zinc-800 px-8 py-6">
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-0"
            >
              <ArrowLeft className="h-5 w-5" />
              Back
            </button>

            <button
              onClick={onSkip}
              className="text-sm text-zinc-500 transition hover:text-zinc-300"
            >
              Skip onboarding
            </button>

            {step === 1 ? (
              <button
                onClick={() => setStep(2)}
                disabled={!canProceed}
                className="flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-2 font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ArrowRight className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={!canProceed || isCreating}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Rocket className="h-5 w-5" />
                    Launch Team
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
