import clsx from 'clsx';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusStyles: Record<string, string> = {
  // Task statuses
  backlog: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  todo: 'bg-blue-950/40 text-blue-400 border-blue-900/50',
  in_progress: 'bg-amber-950/40 text-amber-400 border-amber-900/50',
  done: 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50',
  blocked: 'bg-red-950/40 text-red-400 border-red-900/50',
  // Agent statuses
  idle: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  running: 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50',
  error: 'bg-red-950/40 text-red-400 border-red-900/50',
};

const priorityStyles: Record<string, string> = {
  urgent: 'bg-rose-950/60 text-rose-300 border-rose-700/70 animate-pulse',
  high: 'bg-red-950/40 text-red-400 border-red-900/50',
  medium: 'bg-amber-950/40 text-amber-400 border-amber-900/50',
  low: 'bg-zinc-800 text-zinc-400 border-zinc-700',
};

function formatLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        statusStyles[status] || 'bg-zinc-800 text-zinc-400 border-zinc-700'
      )}
    >
      {formatLabel(status)}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium',
        priorityStyles[priority] || 'bg-zinc-800 text-zinc-400 border-zinc-700'
      )}
    >
      {formatLabel(priority)}
    </span>
  );
}
