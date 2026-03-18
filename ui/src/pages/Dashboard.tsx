import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Play, CheckCircle2, Clock, Send, ExternalLink } from 'lucide-react';
import { api, wsClient } from '../api';
import MetricCard from '../components/MetricCard';
import ProgressBar from '../components/ProgressBar';
import ProjectCard from '../components/ProjectCard';
import ActivityRow from '../components/ActivityRow';

export default function Dashboard({ companyId }: { companyId: string }) {
  const navigate = useNavigate();
  const [nudgeMsg, setNudgeMsg] = useState('');
  const [nudgeSending, setNudgeSending] = useState(false);
  const [nudgeSent, setNudgeSent] = useState(false);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const handleNudge = async () => {
    if (!nudgeMsg.trim()) return;
    setNudgeSending(true);
    try {
      await api.nudge(companyId, nudgeMsg);
      setNudgeMsg('');
      setNudgeSent(true);
      setTimeout(() => setNudgeSent(false), 3000);
    } catch {}
    setNudgeSending(false);
  };

  // WebSocket status listener
  useEffect(() => {
    const statusListener = (status: 'connecting' | 'connected' | 'disconnected') => {
      setWsStatus(status);
    };

    wsClient.addStatusListener(statusListener);
    return () => wsClient.removeStatusListener(statusListener);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', companyId],
    queryFn: () => api.getDashboard(companyId),
  });

  const { data: activity } = useQuery({
    queryKey: ['activity', companyId],
    queryFn: () => api.getActivity(companyId),
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
      </div>
    );
  }

  const { company, metrics, projects } = data;
  const recentActivity = (activity || []).slice(0, 10);
  const deploymentUrl = (company as any).deployment_url;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Dashboard</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Company overview and progress
            {wsStatus === 'connected' && (
              <span className="ml-2 text-xs text-emerald-400">• Live</span>
            )}
          </p>
        </div>
        {deploymentUrl && (
          <a
            href={deploymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-800/40 bg-amber-950/30 px-3 py-1.5 text-xs font-medium text-amber-400 transition hover:border-amber-700/60 hover:bg-amber-950/50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Visit Live Site
          </a>
        )}
      </div>

      {/* Nudge input */}
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <input
            type="text"
            value={nudgeMsg}
            onChange={(e) => setNudgeMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNudge()}
            placeholder="Nudge the CEO — e.g. &quot;Focus on the dashboard first&quot;"
            className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/20 sm:px-4"
          />
          <button
            onClick={handleNudge}
            disabled={nudgeSending || !nudgeMsg.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-amber-600/80 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600/80 sm:gap-2 sm:px-4"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">{nudgeSending ? 'Sending...' : 'Nudge'}</span>
          </button>
        </div>
        {nudgeSent && (
          <p className="text-xs text-emerald-500 animate-fade-in">
            Sent — agent picking it up now
          </p>
        )}
      </div>

      {/* Progress bar */}
      <ProgressBar value={metrics.progressPct} done={metrics.doneTasks} total={metrics.totalTasks} />

      {/* Metric cards — clickable */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <div onClick={() => navigate('/agents')} className="cursor-pointer">
          <MetricCard label="Total Agents" value={metrics.totalAgents} icon={Users} color="text-blue-400" />
        </div>
        <div onClick={() => navigate('/agents')} className="cursor-pointer">
          <MetricCard label="Running Agents" value={metrics.runningAgents} icon={Play} color="text-emerald-400" />
        </div>
        <div onClick={() => navigate('/tasks')} className="cursor-pointer">
          <MetricCard label="Tasks Done" value={metrics.doneTasks} icon={CheckCircle2} color="text-emerald-400" />
        </div>
        <div onClick={() => navigate('/tasks')} className="cursor-pointer">
          <MetricCard label="In Progress" value={metrics.inProgressTasks} icon={Clock} color="text-amber-400" />
        </div>
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
