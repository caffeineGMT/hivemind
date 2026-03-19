import { TaskMetrics } from '../api';
import { CheckCircle2, Clock, AlertCircle, Pause, Circle } from 'lucide-react';

interface TaskProgressBarProps {
  metrics: TaskMetrics;
  showDetails?: boolean;
}

export default function TaskProgressBar({ metrics, showDetails = true }: TaskProgressBarProps) {
  const { total, done, inProgress, backlog, todo, blocked, progressPct } = metrics;

  // Calculate percentages for the segmented progress bar
  const doneWidth = total > 0 ? (done / total) * 100 : 0;
  const inProgressWidth = total > 0 ? (inProgress / total) * 100 : 0;
  const todoWidth = total > 0 ? (todo / total) * 100 : 0;
  const blockedWidth = total > 0 ? (blocked / total) * 100 : 0;
  const backlogWidth = total > 0 ? (backlog / total) * 100 : 0;

  if (total === 0) {
    return (
      <div className="text-xs text-zinc-600">
        <Circle className="inline h-3 w-3 mr-1" />
        No tasks yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="relative h-2 overflow-hidden rounded-full bg-zinc-800">
        <div className="flex h-full">
          {/* Done segment */}
          {done > 0 && (
            <div
              className="bg-emerald-500 transition-all"
              style={{ width: `${doneWidth}%` }}
            />
          )}
          {/* In Progress segment */}
          {inProgress > 0 && (
            <div
              className="bg-amber-500 transition-all"
              style={{ width: `${inProgressWidth}%` }}
            />
          )}
          {/* Todo segment */}
          {todo > 0 && (
            <div
              className="bg-blue-500 transition-all"
              style={{ width: `${todoWidth}%` }}
            />
          )}
          {/* Blocked segment */}
          {blocked > 0 && (
            <div
              className="bg-red-500 transition-all"
              style={{ width: `${blockedWidth}%` }}
            />
          )}
          {/* Backlog segment */}
          {backlog > 0 && (
            <div
              className="bg-zinc-600 transition-all"
              style={{ width: `${backlogWidth}%` }}
            />
          )}
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1 text-zinc-400">
            <span className="font-semibold text-zinc-300">{progressPct}%</span>
            <span>complete</span>
          </div>
          <div className="flex items-center gap-1 text-zinc-600">·</div>
          {done > 0 && (
            <div className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              <span>{done} done</span>
            </div>
          )}
          {inProgress > 0 && (
            <div className="flex items-center gap-1 text-amber-400">
              <Clock className="h-3 w-3" />
              <span>{inProgress} active</span>
            </div>
          )}
          {blocked > 0 && (
            <div className="flex items-center gap-1 text-red-400">
              <AlertCircle className="h-3 w-3" />
              <span>{blocked} blocked</span>
            </div>
          )}
          {(todo > 0 || backlog > 0) && (
            <div className="flex items-center gap-1 text-zinc-500">
              <Pause className="h-3 w-3" />
              <span>{todo + backlog} pending</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
