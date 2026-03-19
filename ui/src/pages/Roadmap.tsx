import { ArrowUpRight, ThumbsUp, Calendar, TrendingUp, CheckCircle2, Code } from 'lucide-react';
import { useState } from 'react';

interface Feature {
  id: string;
  title: string;
  description: string;
  category: 'in-progress' | 'next-up' | 'planned' | 'under-consideration' | 'completed';
  priority: 'high' | 'medium' | 'low';
  complexity: 'low' | 'medium' | 'high' | 'very-high';
  estimatedWeeks: string;
  votes: number;
  status?: string;
  eta?: string;
}

const roadmapData: Feature[] = [
  // In Progress
  {
    id: 'health-monitoring',
    title: 'Health Monitoring Improvements',
    description: 'Enhanced circuit breaker with exponential backoff, agent health scores, automatic rotation',
    category: 'in-progress',
    priority: 'high',
    complexity: 'medium',
    estimatedWeeks: '2-3',
    votes: 0,
    status: '70% complete',
    eta: 'End of March 2026',
  },
  {
    id: 'mobile-optimization',
    title: 'Dashboard Mobile Optimization',
    description: 'Responsive design, touch controls, PWA support',
    category: 'in-progress',
    priority: 'medium',
    complexity: 'low',
    estimatedWeeks: '1-2',
    votes: 0,
    status: '60% complete',
    eta: 'Early April 2026',
  },

  // Next Up
  {
    id: 'code-review',
    title: 'Code Review Workflow',
    description: 'Engineer agents submit code for review, reviewer agent checks for bugs/style, automatic revision loops',
    category: 'next-up',
    priority: 'high',
    complexity: 'high',
    estimatedWeeks: '3-4',
    votes: 0,
  },
  {
    id: 'pair-programming',
    title: 'Pair Programming Mode',
    description: 'Two agents work on same task simultaneously with synchronized editing',
    category: 'next-up',
    priority: 'high',
    complexity: 'very-high',
    estimatedWeeks: '4-6',
    votes: 0,
  },
  {
    id: 'test-generation',
    title: 'Test Generation',
    description: 'Agents automatically write unit, integration, and E2E tests for new code',
    category: 'next-up',
    priority: 'high',
    complexity: 'medium',
    estimatedWeeks: '2-3',
    votes: 0,
  },
  {
    id: 'test-execution',
    title: 'Test Execution & Monitoring',
    description: 'Agents run tests before deploy, block on failures, track coverage',
    category: 'next-up',
    priority: 'high',
    complexity: 'low',
    estimatedWeeks: '1-2',
    votes: 0,
  },
  {
    id: 'multi-model',
    title: 'Multi-Model Strategy',
    description: 'Use Haiku for simple tasks, Sonnet for complex, Opus for critical (50-75% cost savings)',
    category: 'next-up',
    priority: 'medium',
    complexity: 'medium',
    estimatedWeeks: '2',
    votes: 0,
  },

  // Planned
  {
    id: 'pr-creation',
    title: 'Automatic PR Creation',
    description: 'Agents create PRs instead of direct commits, human approval before merge',
    category: 'planned',
    priority: 'medium',
    complexity: 'medium',
    estimatedWeeks: '2',
    votes: 0,
  },
  {
    id: 'approval-gates',
    title: 'Human-in-the-Loop Approval Gates',
    description: 'Configurable checkpoints requiring human approval before major changes',
    category: 'planned',
    priority: 'medium',
    complexity: 'low',
    estimatedWeeks: '1',
    votes: 0,
  },
  {
    id: 'multi-cloud',
    title: 'Multi-Cloud Deployment',
    description: 'Deploy to Netlify, Railway, Render, Fly.io with automatic DNS management',
    category: 'planned',
    priority: 'medium',
    complexity: 'high',
    estimatedWeeks: '3-4',
    votes: 0,
  },

  // Under Consideration
  {
    id: 'real-time-logs',
    title: 'Real-Time Agent Logs',
    description: 'Stream agent logs to dashboard with filtering, search, and export',
    category: 'under-consideration',
    priority: 'low',
    complexity: 'low',
    estimatedWeeks: '1',
    votes: 0,
  },
  {
    id: 'custom-agents',
    title: 'Custom Agent Roles',
    description: 'Define DevOps, QA, Security agent types with custom prompts',
    category: 'under-consideration',
    priority: 'medium',
    complexity: 'high',
    estimatedWeeks: '4',
    votes: 0,
  },
  {
    id: 'multi-user',
    title: 'Multi-User Projects',
    description: 'Multiple humans collaborate with agents, role-based permissions',
    category: 'under-consideration',
    priority: 'medium',
    complexity: 'high',
    estimatedWeeks: '4',
    votes: 0,
  },

  // Completed
  {
    id: 'project-isolation',
    title: 'Project Isolation & Configuration',
    description: 'Per-project agent limits, budgets, configuration presets',
    category: 'completed',
    priority: 'high',
    complexity: 'high',
    estimatedWeeks: '2',
    votes: 0,
  },
  {
    id: 'health-dashboard',
    title: 'Health Monitoring Dashboard',
    description: 'Circuit breakers, incident logging, health status tracking',
    category: 'completed',
    priority: 'high',
    complexity: 'medium',
    estimatedWeeks: '2',
    votes: 0,
  },
];

const categoryLabels = {
  'in-progress': { label: 'In Progress', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  'next-up': { label: 'Next Up (Q2 2026)', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  'planned': { label: 'Planned (Q3 2026)', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  'under-consideration': { label: 'Under Consideration', color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/30' },
  'completed': { label: 'Completed', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
};

const priorityColors = {
  high: 'text-red-400',
  medium: 'text-amber-400',
  low: 'text-zinc-400',
};

const complexityLabels = {
  low: '1-2 weeks',
  medium: '2-3 weeks',
  high: '3-4 weeks',
  'very-high': '4-6 weeks',
};

export default function Roadmap() {
  const [votedFeatures, setVotedFeatures] = useState<Set<string>>(new Set());

  const handleVote = (featureId: string) => {
    setVotedFeatures(prev => {
      const next = new Set(prev);
      if (next.has(featureId)) {
        next.delete(featureId);
      } else {
        next.add(featureId);
      }
      return next;
    });
  };

  const groupedFeatures = roadmapData.reduce((acc, feature) => {
    if (!acc[feature.category]) acc[feature.category] = [];
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Product Roadmap</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Vote on features and track development progress
          </p>
        </div>
        <a
          href="https://github.com/caffeineGMT/hivemind/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-750"
        >
          <Code className="h-4 w-4" />
          GitHub Issues
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>

      {/* Info Card */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
        <div className="flex items-start gap-3">
          <TrendingUp className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-400" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-400">Community-Driven Development</h3>
            <p className="mt-1 text-sm text-blue-300/80">
              Vote on features you want to see! Most-voted features get prioritized. You can also{' '}
              <a
                href="https://github.com/caffeineGMT/hivemind/issues/new?labels=feature-request"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-200"
              >
                submit your own ideas
              </a>{' '}
              on GitHub.
            </p>
          </div>
        </div>
      </div>

      {/* Features by Category */}
      {Object.entries(categoryLabels).map(([category, { label, color, bg, border }]) => {
        const features = groupedFeatures[category] || [];
        if (features.length === 0) return null;

        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className={`text-lg font-semibold ${color}`}>{label}</h2>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(feature => (
                <div
                  key={feature.id}
                  className={`rounded-lg border ${border} ${bg} p-4 transition hover:border-opacity-60`}
                >
                  {/* Header */}
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-zinc-100">{feature.title}</h3>
                    {category !== 'completed' && (
                      <button
                        onClick={() => handleVote(feature.id)}
                        className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition ${
                          votedFeatures.has(feature.id)
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750 hover:text-zinc-300'
                        }`}
                      >
                        <ThumbsUp className="h-3 w-3" />
                        {feature.votes + (votedFeatures.has(feature.id) ? 1 : 0)}
                      </button>
                    )}
                  </div>

                  {/* Description */}
                  <p className="mb-3 text-sm text-zinc-400">{feature.description}</p>

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <div className={`rounded bg-zinc-800/50 px-2 py-1 ${priorityColors[feature.priority]}`}>
                      {feature.priority.toUpperCase()}
                    </div>
                    <div className="rounded bg-zinc-800/50 px-2 py-1 text-zinc-400">
                      {complexityLabels[feature.complexity]}
                    </div>
                    {feature.status && (
                      <div className="flex items-center gap-1 rounded bg-zinc-800/50 px-2 py-1 text-zinc-300">
                        <TrendingUp className="h-3 w-3" />
                        {feature.status}
                      </div>
                    )}
                    {feature.eta && (
                      <div className="flex items-center gap-1 rounded bg-zinc-800/50 px-2 py-1 text-zinc-300">
                        <Calendar className="h-3 w-3" />
                        {feature.eta}
                      </div>
                    )}
                    {category === 'completed' && (
                      <div className="flex items-center gap-1 rounded bg-green-500/20 px-2 py-1 text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Complete
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <h3 className="mb-3 font-semibold text-zinc-100">Want to Contribute?</h3>
        <p className="mb-4 text-sm text-zinc-400">
          Hivemind is open source and welcomes contributions. See{' '}
          <a
            href="https://github.com/caffeineGMT/hivemind/blob/main/CONTRIBUTING.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline hover:text-blue-300"
          >
            CONTRIBUTING.md
          </a>{' '}
          for guidelines.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://github.com/caffeineGMT/hivemind"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-750"
          >
            <Code className="h-4 w-4" />
            View on GitHub
            <ArrowUpRight className="h-4 w-4" />
          </a>
          <a
            href="https://github.com/caffeineGMT/hivemind/discussions"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800"
          >
            Join Discussions
          </a>
        </div>
      </div>
    </div>
  );
}
