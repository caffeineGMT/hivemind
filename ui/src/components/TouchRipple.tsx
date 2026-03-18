import { useState, useRef, useCallback } from 'react';

interface Ripple {
  x: number;
  y: number;
  size: number;
  id: number;
}

export function useTouchRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextRippleId = useRef(0);

  const createRipple = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;
    const id = nextRippleId.current++;

    setRipples(prev => [...prev, { x, y, size, id }]);

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 600);
  }, []);

  const rippleElements = ripples.map(ripple => (
    <span
      key={ripple.id}
      className="pointer-events-none absolute animate-ripple rounded-full bg-white/10"
      style={{
        left: ripple.x - ripple.size / 2,
        top: ripple.y - ripple.size / 2,
        width: ripple.size,
        height: ripple.size,
      }}
    />
  ));

  return { createRipple, rippleElements };
}
