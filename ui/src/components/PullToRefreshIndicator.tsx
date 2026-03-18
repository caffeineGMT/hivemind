import { RefreshCw } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export default function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  threshold = 80,
}: PullToRefreshIndicatorProps) {
  const progress = Math.min(pullDistance / threshold, 1);
  const opacity = Math.min(progress * 2, 1);
  const scale = 0.5 + progress * 0.5;

  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div
      className="fixed left-1/2 z-50 -translate-x-1/2 transition-all duration-200"
      style={{
        top: `${Math.min(pullDistance, threshold * 1.2)}px`,
        opacity,
        transform: `translateX(-50%) scale(${scale})`,
      }}
    >
      <div className="rounded-full bg-zinc-800/95 p-3 shadow-lg backdrop-blur-sm">
        <RefreshCw
          className={`h-5 w-5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`}
          style={{
            transform: isRefreshing ? 'none' : `rotate(${progress * 360}deg)`,
          }}
        />
      </div>
    </div>
  );
}
