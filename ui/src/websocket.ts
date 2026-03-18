import ReconnectingWebSocket from 'reconnecting-websocket';

type WebSocketMessage = {
  event: string;
  data: unknown;
  timestamp: string;
};

type MessageHandler = (event: string, data: unknown) => void;

class WebSocketClient {
  private ws: ReconnectingWebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private connectionStatus: 'connecting' | 'connected' | 'disconnected' = 'connecting';
  private statusListeners: Set<(status: 'connecting' | 'connected' | 'disconnected') => void> = new Set();

  connect() {
    if (this.ws) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    this.ws = new ReconnectingWebSocket(wsUrl, [], {
      maxRetries: 10,
      reconnectionDelayGrowFactor: 1.3,
    });

    this.ws.addEventListener('open', () => {
      console.log('[ws] Connected');
      this.setStatus('connected');
    });

    this.ws.addEventListener('close', () => {
      console.log('[ws] Disconnected');
      this.setStatus('disconnected');
    });

    this.ws.addEventListener('error', (error) => {
      console.error('[ws] Error:', error);
      this.setStatus('disconnected');
    });

    this.ws.addEventListener('message', (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handlers.forEach(handler => handler(message.event, message.data));
      } catch (err) {
        console.error('[ws] Failed to parse message:', err);
      }
    });
  }

  addMessageHandler(handler: MessageHandler) {
    this.handlers.add(handler);
  }

  removeMessageHandler(handler: MessageHandler) {
    this.handlers.delete(handler);
  }

  addStatusListener(listener: (status: 'connecting' | 'connected' | 'disconnected') => void) {
    this.statusListeners.add(listener);
    listener(this.connectionStatus); // Immediately notify with current status
  }

  removeStatusListener(listener: (status: 'connecting' | 'connected' | 'disconnected') => void) {
    this.statusListeners.delete(listener);
  }

  getStatus() {
    return this.connectionStatus;
  }

  private setStatus(status: 'connecting' | 'connected' | 'disconnected') {
    this.connectionStatus = status;
    this.statusListeners.forEach(listener => listener(status));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsClient = new WebSocketClient();
