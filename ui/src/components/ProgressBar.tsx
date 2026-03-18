interface ProgressBarProps {
  value: number;
  done: number;
  total: number;
}

export default function ProgressBar({ value, done, total }: ProgressBarProps) {
  const pct = Math.min(Math.max(value, 0), 100);

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500">Overall Progress</p>
          <p className="mt-0.5 text-3xl font-bold tabular-nums text-zinc-100">
            {pct.toFixed(0)}%
          </p>
        </div>
        <p className="text-sm tabular-nums text-zinc-500">
          {done} / {total} tasks completed
        </p>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="animate-progress h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
