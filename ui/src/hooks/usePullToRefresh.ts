import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);

  useEffect(() => {
    const container = document.querySelector('main');
    if (!container) return;

    let touchId: number | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop === 0) {
        touchId = e.touches[0].identifier;
        startY.current = e.touches[0].clientY;
        currentY.current = startY.current;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchId === null) return;

      const touch = Array.from(e.touches).find(t => t.identifier === touchId);
      if (!touch) return;

      currentY.current = touch.clientY;
      const distance = currentY.current - startY.current;

      if (distance > 0 && container.scrollTop === 0) {
        setIsPulling(true);
        const adjustedDistance = distance / resistance;
        setPullDistance(Math.min(adjustedDistance, threshold * 1.2));

        if (distance > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (touchId === null) return;
      touchId = null;

      const distance = currentY.current - startY.current;
      const adjustedDistance = distance / resistance;

      if (adjustedDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh failed:', error);
        }
        setIsRefreshing(false);
      }

      setIsPulling(false);
      setPullDistance(0);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, threshold, resistance, isRefreshing]);

  return { isPulling, isRefreshing, pullDistance };
}
