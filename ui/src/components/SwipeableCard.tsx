import { useState, useRef, ReactNode } from 'react';
import { useSwipeable } from 'react-swipeable';
import { Trash2 } from 'lucide-react';

interface SwipeableCardProps {
  children: ReactNode;
  onDelete?: () => void;
  deleteThreshold?: number;
  className?: string;
}

export default function SwipeableCard({
  children,
  onDelete,
  deleteThreshold = 120,
  className = '',
}: SwipeableCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const swipeStartX = useRef(0);

  const handlers = useSwipeable({
    onSwiping: (e) => {
      if (!onDelete) return;

      if (!isSwiping) {
        swipeStartX.current = e.absX;
        setIsSwiping(true);
      }

      const offset = e.absX - swipeStartX.current;
      if (offset < 0) {
        setSwipeOffset(Math.max(offset, -deleteThreshold * 1.5));
      }
    },
    onSwiped: () => {
      setIsSwiping(false);

      if (Math.abs(swipeOffset) >= deleteThreshold && onDelete) {
        onDelete();
        setSwipeOffset(0);
      } else {
        setSwipeOffset(0);
      }
    },
    trackMouse: false,
    trackTouch: true,
  });

  const deleteOpacity = Math.min(Math.abs(swipeOffset) / deleteThreshold, 1);
  const shouldDelete = Math.abs(swipeOffset) >= deleteThreshold;

  return (
    <div className="relative overflow-hidden">
      {onDelete && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-end px-6 transition-opacity"
          style={{
            opacity: deleteOpacity,
            background: shouldDelete
              ? 'linear-gradient(to left, rgb(239, 68, 68), rgb(220, 38, 38))'
              : 'linear-gradient(to left, rgb(82, 82, 91), rgb(63, 63, 70))',
          }}
        >
          <Trash2 className="h-5 w-5 text-white" />
        </div>
      )}
      <div
        {...handlers}
        className={`transition-transform ${className}`}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
