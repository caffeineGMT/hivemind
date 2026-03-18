// Client-side analytics tracking utility

let sessionId: string | null = null;

function getSessionId(): string {
  if (sessionId) return sessionId;
  sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return sessionId;
}

export async function trackEvent(
  eventType: string,
  eventData?: Record<string, unknown>,
  options?: {
    companyId?: string;
    userId?: string;
    revenueUsd?: number;
  }
) {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: options?.companyId || null,
        userId: options?.userId || null,
        sessionId: getSessionId(),
        eventType,
        eventData,
        revenueUsd: options?.revenueUsd || 0,
      }),
    });
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}

export function trackPageView(path: string, companyId?: string) {
  trackEvent('page_view', { path }, { companyId });
}

export function trackSignupStarted() {
  trackEvent('signup_started');
}

export function trackSignupCompleted(userId: string) {
  trackEvent('signup_completed', { userId }, { userId });
}

export function trackCheckoutStarted(plan: string) {
  trackEvent('checkout_started', { plan });
}

export function trackCheckoutCompleted(plan: string, revenueUsd: number, userId?: string) {
  trackEvent('checkout_completed', { plan }, { userId, revenueUsd });
}
