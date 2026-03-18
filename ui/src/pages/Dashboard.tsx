import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Users, Play, CheckCircle2, Clock, Send } from 'lucide-react';
import { api } from '../api';
import MetricCard from '../components/MetricCard';
import ProgressBar from '../components/ProgressBar';
import ProjectCard from '../components/ProjectCard';
import ActivityRow from '../components/ActivityRow';

export default function Dashboard({ companyId }: { companyId: string }) {
  const [nudgeMsg, setNudgeMsg] = useState('');
  const [nudgeSending, setNudgeSending] = useState(false);

  const handleNudge = async () => {
    if (!nudgeMsg.trim()) return;
    setNudgeSending(true);
    try {
      await api.nudge(companyId, nudgeMsg);
      setNudgeMsg('');
    } catch {}
    setNudgeSending(false);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', companyId],
    queryFn: () => api.getDashboard(companyId),
    refetchInterval: 3000,
  });

  const { data: activity } = useQuery({
    queryKey: ['activity', companyId],
    queryFn: () => api.getActivity(companyId),
    refetchInterval: 3000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
      </div>
    );
  }

  const { metrics, projects } = data;
  const recentActivity = (activity || []).slice(0, 10);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100">Dashboard</h2>
        <p className="mt-1 text-sm text-zinc-500">Company overview and progress</p>
      </div>

      {/* Nudge input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={nudgeMsg}
          onChange={(e) => setNudgeMsg(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleNudge()}
          placeholder="Nudge the CEO — e.g. &quot;Focus on the dashboard first&quot;"
          className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/20"
        />
        <button
          onClick={handleNudge}
          disabled={nudgeSending || !nudgeMsg.trim()}
          className="flex items-center gap-2 rounded-lg bg-amber-600/80 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600/80"
        >
          <Send className="h-4 w-4" />
          {nudgeSending ? 'Sending...' : 'Nudge'}
        </button>
      </div>

      {/* Progress bar */}
      <ProgressBar value={metrics.progressPct} done={metrics.doneTasks} total={metrics.totalTasks} />

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Total Agents" value={metrics.totalAgents} icon={Users} color="text-blue-400" />
        <MetricCard label="Running Agents" value={metrics.runningAgents} icon={Play} color="text-emerald-400" />
        <MetricCard label="Tasks Done" value={metrics.doneTasks} icon={CheckCircle2} color="text-emerald-400" />
        <MetricCard label="In Progress" value={metrics.inProgressTasks} icon={Clock} color="text-amber-400" />
      </div>

      {/* Projects + Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Projects */}
        <div className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-zinc-300">
            Projects
            <span className="ml-2 text-xs font-normal text-zinc-600">({projects.length})</span>
          </h3>
          {projects.length === 0 ? (
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-8 text-center text-sm text-zinc-500">
              No projects yet
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-zinc-300">Recent Activity</h3>
          {recentActivity.length === 0 ? (
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-8 text-center text-sm text-zinc-500">
              No activity yet
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30">
              <div className="max-h-[480px] overflow-y-auto">
                {recentActivity.map((entry) => (
                  <ActivityRow key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
