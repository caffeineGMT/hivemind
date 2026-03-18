import { useQuery } from '@tanstack/react-query';
import { Users, Play, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../api';
import MetricCard from '../components/MetricCard';
import ProgressBar from '../components/ProgressBar';
import ProjectCard from '../components/ProjectCard';
import ActivityRow from '../components/ActivityRow';

export default function Dashboard({ companyId }: { companyId: string }) {
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
