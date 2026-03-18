import { Zap } from 'lucide-react';
import { ActivityEntry } from '../api';

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return dateStr;
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

interface ActivityRowProps {
  entry: ActivityEntry;
  showDate?: boolean;
}

export default function ActivityRow({ entry, showDate = false }: ActivityRowProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition hover:bg-zinc-900/40">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800/60">
        <Zap className="h-3 w-3 text-amber-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-300">
          <span className="font-medium text-zinc-100">{entry.action}</span>
          {entry.detail && (
            <span className="ml-1 text-zinc-400">— {entry.detail}</span>
          )}
        </p>
        <div className="mt-0.5 flex items-center gap-3 text-[11px] text-zinc-600">
          {entry.agent_id && (
            <span className="font-mono">agent:{entry.agent_id.slice(0, 8)}</span>
          )}
          {entry.task_id && (
            <span className="font-mono">task:{entry.task_id.slice(0, 8)}</span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono text-[11px] text-zinc-500">{formatTime(entry.created_at)}</p>
        {showDate && (
          <p className="font-mono text-[10px] text-zinc-600">{formatDate(entry.created_at)}</p>
        )}
      </div>
    </div>
  );
}
