import { memo } from 'react';
import { CircleDot, Circle, Clock, CheckCircle2, Ban, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';
import { useState } from 'react';
import { StatusBadge, PriorityBadge } from './StatusBadge';
import { Task } from '../api';
import { sanitize } from '../hooks/useSanitize';

const statusIcon: Record<string, React.ReactNode> = {
  backlog: <Circle className="h-4 w-4 text-zinc-500" />,
  todo: <CircleDot className="h-4 w-4 text-blue-400" />,
  in_progress: <Clock className="h-4 w-4 text-amber-400" />,
  done: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  blocked: <Ban className="h-4 w-4 text-red-400" />,
};

export default function TaskRow({ task }: { task: Task }) {
  const navigate = useNavigate();
  const [swipeAction, setSwipeAction] = useState<'left' | 'right' | null>(null);

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      setSwipeAction('left');
      setTimeout(() => setSwipeAction(null), 1000);
    },
    onSwipedRight: () => {
      setSwipeAction('right');
      setTimeout(() => setSwipeAction(null), 1000);
    },
    trackMouse: false,
    preventScrollOnSwipe: true,
    delta: 50,
  });

  const handleClick = (e: React.MouseEvent) => {
    if (!swipeAction) {
      navigate(`${task.id}`);
    }
  };

  return (
    <article
      {...handlers}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Task: ${task.title}, ${task.status}, ${task.priority} priority${task.assignee_name ? `, assigned to ${task.assignee_name}` : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
      className={`flex items-start gap-3 rounded-lg border px-3 py-3 transition cursor-pointer active:bg-zinc-800/40 sm:items-center sm:px-4 ${
        swipeAction === 'left'
          ? 'border-emerald-600/60 bg-emerald-950/30'
          : swipeAction === 'right'
          ? 'border-blue-600/60 bg-blue-950/30'
          : 'border-zinc-800/40 bg-zinc-900/30 hover:border-zinc-700/60 hover:bg-zinc-900/60'
      }`}
    >
      <div className="mt-0.5 shrink-0 sm:mt-0" aria-hidden="true">{statusIcon[task.status] || statusIcon.backlog}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-200 sm:truncate">{sanitize(task.title)}</p>
        {task.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500 sm:truncate sm:line-clamp-1">{sanitize(task.description)}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:hidden">
          {task.assignee_name && task.assignee_id && (
            <Link
              to={`../agents/${task.assignee_id}`}
              onClick={(e) => e.stopPropagation()}
              aria-label={`View live output for agent ${task.assignee_name}`}
              title="Click to view agent's live output"
              className="flex items-center gap-1 rounded-md bg-blue-950/30 px-2 py-0.5 text-[11px] font-medium text-blue-400 transition hover:bg-blue-950/50 hover:text-blue-300"
            >
              <User className="h-3 w-3" aria-hidden="true" />
              {task.assignee_name}
              {task.assignee_id && (
                <span className="ml-1 font-mono text-[10px] text-blue-500/60">
                  ({task.assignee_id.slice(0, 8)})
                </span>
              )}
            </Link>
          )}
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
        </div>
      </div>
      <div className="hidden shrink-0 items-center gap-2 sm:flex">
        {task.assignee_name && task.assignee_id && (
          <Link
            to={`../agents/${task.assignee_id}`}
            onClick={(e) => e.stopPropagation()}
            aria-label={`View live output for agent ${task.assignee_name}`}
            title="Click to view agent's live output"
            className="flex items-center gap-1 rounded-md bg-blue-950/30 px-2 py-0.5 text-[11px] font-medium text-blue-400 transition hover:bg-blue-950/50 hover:text-blue-300"
          >
            <User className="h-3 w-3" aria-hidden="true" />
            {task.assignee_name}
            {task.assignee_id && (
              <span className="ml-1 font-mono text-[10px] text-blue-500/60">
                ({task.assignee_id.slice(0, 8)})
              </span>
            )}
          </Link>
        )}
        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} />
        <span className="w-16 text-right font-mono text-[10px] text-zinc-600" title={task.id}>
          {task.id.slice(0, 8)}
        </span>
      </div>
    </article>
  );
}
