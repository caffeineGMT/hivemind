import { CircleDot, Circle, Clock, CheckCircle2, Ban } from 'lucide-react';
import { Link } from 'react-router-dom';
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
    <Link
      to={`/tasks/${task.id}`}
      className="flex items-start gap-3 rounded-lg border border-zinc-800/40 bg-zinc-900/30 px-3 py-3 transition hover:border-zinc-700/60 hover:bg-zinc-900/60 cursor-pointer active:bg-zinc-800/40 sm:items-center sm:px-4"
    >
      <div className="mt-0.5 shrink-0 sm:mt-0">{statusIcon[task.status] || statusIcon.backlog}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-200 sm:truncate">{task.title}</p>
        {task.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500 sm:truncate sm:line-clamp-1">{task.description}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:hidden">
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
        </div>
      </div>
      <div className="hidden shrink-0 items-center gap-2 sm:flex">
        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} />
        <span className="w-16 text-right font-mono text-[10px] text-zinc-600" title={task.id}>
          {task.id.slice(0, 8)}
        </span>
      </div>
    </Link>
  );
}
