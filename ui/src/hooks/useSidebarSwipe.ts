import { useSwipeable } from 'react-swipeable';

interface UseSidebarSwipeProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function useSidebarSwipe({ isOpen, onOpen, onClose }: UseSidebarSwipeProps) {
  const handlers = useSwipeable({
    onSwipedRight: (eventData) => {
      // Only open sidebar if swipe starts from left edge
      if (!isOpen && eventData.initial[0] < 50) {
        onOpen();
      }
    },
    onSwipedLeft: () => {
      // Close sidebar if it's open
      if (isOpen) {
        onClose();
      }
    },
    trackMouse: false,
    trackTouch: true,
    delta: 50,
    preventScrollOnSwipe: false,
    swipeDuration: 500,
  });

  return handlers;
}
