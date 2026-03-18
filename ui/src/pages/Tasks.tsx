import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, Task } from '../api';
import TaskRow from '../components/TaskRow';

const STATUS_FILTERS = ['all', 'backlog', 'todo', 'in_progress', 'done', 'blocked'] as const;

function formatLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Tasks({ companyId }: { companyId: string }) {
  const [filter, setFilter] = useState<string>('all');

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', companyId],
    queryFn: () => api.getTasks(companyId),
  });

  if (isLoading || !tasks) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
      </div>
    );
  }

  const filtered = filter === 'all' ? tasks : tasks.filter((t: Task) => t.status === filter);

  const counts: Record<string, number> = { all: tasks.length };
  for (const t of tasks) {
    counts[t.status] = (counts[t.status] || 0) + 1;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100">Tasks</h2>
        <p className="mt-1 text-sm text-zinc-500">{tasks.length} total tasks</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              filter === s
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300'
            }`}
          >
            {formatLabel(s)}
            {counts[s] !== undefined && (
              <span className="ml-1.5 tabular-nums text-zinc-600">{counts[s]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-8 text-center text-sm text-zinc-500">
            No tasks match this filter
          </div>
        ) : (
          filtered.map((task: Task) => <TaskRow key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
}
