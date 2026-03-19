import { useSwipeable } from 'react-swipeable';
import { useNavigate, useLocation } from 'react-router-dom';

const routes = [
  '/',
  '/tasks',
  '/agents',
  '/activity',
  '/finance',
  '/analytics',
  '/costs',
];

export function useSwipeNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentIndex = routes.indexOf(location.pathname);

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (currentIndex < routes.length - 1) {
        navigate(routes[currentIndex + 1]);
      }
    },
    onSwipedRight: () => {
      if (currentIndex > 0) {
        navigate(routes[currentIndex - 1]);
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
