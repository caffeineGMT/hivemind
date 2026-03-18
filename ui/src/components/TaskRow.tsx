import { CircleDot, Circle, Clock, CheckCircle2, Ban } from 'lucide-react';
import { StatusBadge, PriorityBadge } from './StatusBadge';
import { Task } from '../api';

const statusIcon: Record<string, React.ReactNode> = {
  backlog: <Circle className="h-4 w-4 text-zinc-500" />,
  todo: <CircleDot className="h-4 w-4 text-blue-400" />,
  in_progress: <Clock className="h-4 w-4 text-amber-400" />,
  done: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  blocked: <Ban className="h-4 w-4 text-red-400" />,
};

export default function TaskRow({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-800/40 bg-zinc-900/30 px-4 py-3 transition hover:border-zinc-700/60 hover:bg-zinc-900/60">
      <div className="shrink-0">{statusIcon[task.status] || statusIcon.backlog}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-200">{task.title}</p>
        {task.description && (
          <p className="mt-0.5 truncate text-xs text-zinc-500">{task.description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} />
        <span className="w-16 text-right font-mono text-[10px] text-zinc-600" title={task.id}>
          {task.id.slice(0, 8)}
        </span>
      </div>
    </div>
  );
}
