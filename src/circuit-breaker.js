/**
 * Circuit Breaker for Claude API
 * Prevents cascade failures by pausing dispatching when too many consecutive failures occur
 */

const FAILURE_THRESHOLD = 5; // Trip circuit after 5 consecutive failures
const PAUSE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

class CircuitBreaker {
  constructor() {
    this.consecutiveFailures = 0;
    this.state = 'CLOSED'; // CLOSED = normal, OPEN = paused, HALF_OPEN = testing
    this.pausedUntil = null;
  }

  recordSuccess() {
    this.consecutiveFailures = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.pausedUntil = null;
      console.log('[CIRCUIT_BREAKER] Circuit restored to CLOSED - API calls resumed');
    }
  }

  recordFailure() {
    this.consecutiveFailures++;

    if (this.consecutiveFailures >= FAILURE_THRESHOLD && this.state === 'CLOSED') {
      this.state = 'OPEN';
      this.pausedUntil = Date.now() + PAUSE_DURATION_MS;
      console.error(`[CIRCUIT_BREAKER] Circuit OPEN - ${FAILURE_THRESHOLD} consecutive failures. Pausing for 5 minutes.`);
    }
  }

  canAttempt() {
    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      if (Date.now() >= this.pausedUntil) {
        this.state = 'HALF_OPEN';
        console.log('[CIRCUIT_BREAKER] Circuit HALF_OPEN - Testing recovery');
        return true;
      }
      return false;
    }

    // HALF_OPEN state - allow the attempt
    return true;
  }

  getStatus() {
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      pausedUntil: this.pausedUntil,
      canAttempt: this.canAttempt()
    };
  }

  reset() {
    this.consecutiveFailures = 0;
    this.state = 'CLOSED';
    this.pausedUntil = null;
  }
}

// Global circuit breaker instance
const circuitBreaker = new CircuitBreaker();

export { circuitBreaker };
