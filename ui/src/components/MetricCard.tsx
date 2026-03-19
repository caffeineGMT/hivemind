import { type LucideIcon } from 'lucide-react';
import { useTouchRipple } from './TouchRipple';

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  onClick?: () => void;
}

export default function MetricCard({ label, value, icon: Icon, color = 'text-zinc-400', onClick }: MetricCardProps) {
  const { createRipple, rippleElements } = useTouchRipple();
  const isClickable = !!onClick;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 transition-all duration-200 active:scale-[0.98] hover:border-zinc-700/60 md:active:scale-100 ${isClickable ? 'cursor-pointer' : ''}`}
      onTouchStart={createRipple}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      aria-label={isClickable ? `${label}: ${value}` : undefined}
    >
      {rippleElements}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-100" aria-live="polite">{value}</p>
        </div>
        <div className={`rounded-lg bg-zinc-800/60 p-2.5 ${color}`} aria-hidden="true">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
