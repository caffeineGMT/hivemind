import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
  showSwipeHint?: boolean;
}

export default function ResponsiveTable({
  children,
  className = '',
  showSwipeHint = true,
}: ResponsiveTableProps) {
  return (
    <div className="relative">
      <div className={`responsive-table-wrapper ${className}`}>
        {children}
      </div>
      {showSwipeHint && (
        <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 pr-2 text-xs text-amber-500/60 md:hidden">
          <span className="animate-swipe-hint">Swipe</span>
          <ChevronRight className="h-3 w-3 animate-swipe-hint" />
        </div>
      )}
    </div>
  );
}
