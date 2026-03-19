import ReconnectingWebSocket from 'reconnecting-websocket';
import { toast } from 'sonner';

type WebSocketMessage = {
  event: string;
  data: unknown;
  timestamp: string;
};

type MessageHandler = (event: string, data: unknown) => void;

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export type ConnectionState = {
  status: ConnectionStatus;
  reconnectAttempt: number;
  pingLatency: number | null;
  lastConnectedAt: number | null;
  disconnectedAt: number | null;
  nextReconnectIn: number | null; // seconds until next reconnect attempt
};

type StateChangeListener = (state: ConnectionState) => void;

type QueuedMutation = {
  event: string;
  data: unknown;
  resolve: () => void;
  reject: (err: Error) => void;
};

// Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
function getBackoffDelay(attempt: number): number {
  const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
  return delay;
}

class WebSocketClient {
  private ws: ReconnectingWebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private stateListeners: Set<StateChangeListener> = new Set();
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private mutationQueue: QueuedMutation[] = [];
  private wasConnected = false; // Track if we were previously connected

  // Legacy status listeners (for backward compatibility)
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();

  private _state: ConnectionState = {
    status: 'connecting',
    reconnectAttempt: 0,
    pingLatency: null,
    lastConnectedAt: null,
    disconnectedAt: null,
    nextReconnectIn: null,
  };

  connect() {
    if (this.ws) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    this.ws = new ReconnectingWebSocket(wsUrl, [], {
      maxRetries: Infinity,
      reconnectionDelayGrowFactor: 2,
      maxReconnectionDelay: 30000,
      minReconnectionDelay: 1000,
    });

    this.ws.addEventListener('open', () => {
      console.log('[ws] Connected');

      // Show success toast if we were previously disconnected
      if (this.wasConnected && this._state.reconnectAttempt > 0) {
        toast.success('Reconnected successfully!', {
          description: 'Real-time updates are now active',
          duration: 3000,
        });
      }

      this.updateState({
        status: 'connected',
        reconnectAttempt: 0,
        lastConnectedAt: Date.now(),
        disconnectedAt: null,
        nextReconnectIn: null,
      });
      this.wasConnected = true;
      this.startPingMonitor();
      this.flushMutationQueue();
      this.stopCountdown();
    });

    this.ws.addEventListener('close', () => {
      console.log('[ws] Disconnected');
      const attempt = this._state.reconnectAttempt + 1;
      const backoffMs = getBackoffDelay(attempt);

      // Show toast notification for unstable connection
      if (this.wasConnected) {
        if (attempt === 1) {
          toast.warning('Connection lost', {
            description: 'Attempting to reconnect...',
            duration: 4000,
          });
        } else if (attempt === 3) {
          toast.warning('Connection unstable', {
            description: 'Retrying in background...',
            duration: 5000,
          });
        }
      }

      this.updateState({
        status: 'disconnected',
        reconnectAttempt: attempt,
        pingLatency: null,
        disconnectedAt: this._state.disconnectedAt ?? Date.now(),
        nextReconnectIn: Math.ceil(backoffMs / 1000),
      });
      this.stopPingMonitor();
      this.startCountdown(Math.ceil(backoffMs / 1000));
    });

    this.ws.addEventListener('error', (error) => {
      console.error('[ws] Error:', error);
      // Only update if not already disconnected (close event handles transition)
      if (this._state.status !== 'disconnected') {
        this.updateState({
          status: 'disconnected',
          pingLatency: null,
          disconnectedAt: this._state.disconnectedAt ?? Date.now(),
        });
        this.stopPingMonitor();
      }
    });

    this.ws.addEventListener('message', (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        // Handle pong responses for latency measurement
        if (message.event === 'pong' && typeof message.data === 'object' && message.data !== null) {
          const pongData = message.data as { timestamp?: number };
          if (pongData.timestamp) {
            const latency = Date.now() - pongData.timestamp;
            this.updateState({ pingLatency: latency });
          }
          return;
        }

        this.handlers.forEach(handler => handler(message.event, message.data));
      } catch (err) {
        console.error('[ws] Failed to parse message:', err);
      }
    });
  }

  // --- Ping/Latency Monitoring ---

  private startPingMonitor() {
    this.stopPingMonitor();
    // Send initial ping after 2s, then every 30s
    setTimeout(() => {
      this.sendPing();
    }, 2000);
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, 30000);
  }

  private stopPingMonitor() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private sendPing() {
    if (this.ws && this._state.status === 'connected') {
      try {
        this.ws.send(JSON.stringify({
          event: 'ping',
          data: { timestamp: Date.now() },
        }));
      } catch {
        // Ignore send failures during disconnect
      }
    }
  }

  // --- Reconnect Countdown ---

  private startCountdown(seconds: number) {
    this.stopCountdown();
    let remaining = seconds;
    this.countdownInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        this.stopCountdown();
        this.updateState({ nextReconnectIn: null });
      } else {
        this.updateState({ nextReconnectIn: remaining });
      }
    }, 1000);
  }

  private stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  // --- Mutation Queue ---

  queueMutation(event: string, data: unknown): Promise<void> {
    if (this._state.status === 'connected' && this.ws) {
      try {
        this.ws.send(JSON.stringify({ event, data }));
        return Promise.resolve();
      } catch {
        // Fall through to queue
      }
    }

    return new Promise((resolve, reject) => {
      this.mutationQueue.push({ event, data, resolve, reject });
    });
  }

  private flushMutationQueue() {
    if (!this.ws || this._state.status !== 'connected') return;

    const queue = [...this.mutationQueue];
    this.mutationQueue = [];

    for (const mutation of queue) {
      try {
        this.ws.send(JSON.stringify({
          event: mutation.event,
          data: mutation.data,
        }));
        mutation.resolve();
      } catch (err) {
        mutation.reject(err instanceof Error ? err : new Error('Failed to send'));
      }
    }
  }

  getPendingMutationCount(): number {
    return this.mutationQueue.length;
  }

  // --- Force Reconnect ---

  reconnectNow() {
    if (this.ws) {
      this.stopCountdown();
      this.updateState({
        status: 'connecting',
        nextReconnectIn: null,
      });
      // Close and let ReconnectingWebSocket handle reconnection
      this.ws.reconnect();
    }
  }

  // --- State Management ---

  getState(): ConnectionState {
    return { ...this._state };
  }

  addStateListener(listener: StateChangeListener) {
    this.stateListeners.add(listener);
    listener({ ...this._state }); // Immediately notify with current state
  }

  removeStateListener(listener: StateChangeListener) {
    this.stateListeners.delete(listener);
  }

  private updateState(partial: Partial<ConnectionState>) {
    const prevStatus = this._state.status;
    this._state = { ...this._state, ...partial };
    this.stateListeners.forEach(listener => listener({ ...this._state }));

    // Also notify legacy status listeners if status changed
    if (partial.status && partial.status !== prevStatus) {
      this.statusListeners.forEach(listener => listener(partial.status!));
    }
  }

  // --- Legacy API (backward compatibility) ---

  addMessageHandler(handler: MessageHandler) {
    this.handlers.add(handler);
  }

  removeMessageHandler(handler: MessageHandler) {
    this.handlers.delete(handler);
  }

  addStatusListener(listener: (status: ConnectionStatus) => void) {
    this.statusListeners.add(listener);
    listener(this._state.status); // Immediately notify with current status
  }

  removeStatusListener(listener: (status: ConnectionStatus) => void) {
    this.statusListeners.delete(listener);
  }

  getStatus(): ConnectionStatus {
    return this._state.status;
  }

  disconnect() {
    this.stopPingMonitor();
    this.stopCountdown();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    // Reject any pending mutations
    for (const mutation of this.mutationQueue) {
      mutation.reject(new Error('WebSocket disconnected'));
    }
    this.mutationQueue = [];
  }
}

export const wsClient = new WebSocketClient();
