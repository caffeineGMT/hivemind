import { type LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
}

export default function MetricCard({ label, value, icon: Icon, color = 'text-zinc-400' }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 transition hover:border-zinc-700/60">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-100">{value}</p>
        </div>
        <div className={`rounded-lg bg-zinc-800/60 p-2.5 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
