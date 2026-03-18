import { CircleDot, Circle, Clock, CheckCircle2, Ban } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';
import { useState } from 'react';
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
  const navigate = useNavigate();
  const [swipeAction, setSwipeAction] = useState<'left' | 'right' | null>(null);

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      // Mark done - visual feedback only for now
      setSwipeAction('left');
      setTimeout(() => setSwipeAction(null), 1000);
    },
    onSwipedRight: () => {
      // Reassign - visual feedback only for now
      setSwipeAction('right');
      setTimeout(() => setSwipeAction(null), 1000);
    },
    trackMouse: false, // Disable on desktop
    preventScrollOnSwipe: true,
    delta: 50, // Minimum swipe distance
  });

  const handleClick = (e: React.MouseEvent) => {
    // Allow swipe gestures on mobile without navigating
    if (!swipeAction) {
      navigate(`tasks/${task.id}`);
    }
  };

  return (
    <div
      {...handlers}
      onClick={handleClick}
      className={`flex items-start gap-3 rounded-lg border px-3 py-3 transition cursor-pointer active:bg-zinc-800/40 sm:items-center sm:px-4 ${
        swipeAction === 'left'
          ? 'border-emerald-600/60 bg-emerald-950/30'
          : swipeAction === 'right'
          ? 'border-blue-600/60 bg-blue-950/30'
          : 'border-zinc-800/40 bg-zinc-900/30 hover:border-zinc-700/60 hover:bg-zinc-900/60'
      }`}
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
          {swipeAction === 'left' && (
            <span className="text-[10px] text-emerald-400">Swipe left to mark done</span>
          )}
          {swipeAction === 'right' && (
            <span className="text-[10px] text-blue-400">Swipe right to reassign</span>
          )}
        </div>
      </div>
      <div className="hidden shrink-0 items-center gap-2 sm:flex">
        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} />
        <span className="w-16 text-right font-mono text-[10px] text-zinc-600" title={task.id}>
          {task.id.slice(0, 8)}
        </span>
      </div>
    </div>
  );
}
