import { useSwipeable } from 'react-swipeable';
import { useNavigate, useLocation, useParams } from 'react-router-dom';

export function useSwipeNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { companySlug } = useParams<{ companySlug: string }>();

  const routes = [
    `/${companySlug}`,
    `/${companySlug}/tasks`,
    `/${companySlug}/agents`,
    `/${companySlug}/activity`,
    `/${companySlug}/finance`,
    `/${companySlug}/analytics`,
    `/${companySlug}/costs`,
  ];

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
