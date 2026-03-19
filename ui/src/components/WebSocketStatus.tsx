import { useEffect, useState } from 'react';
import { wsClient, ConnectionState } from '../websocket';
import { Wifi, WifiOff, Signal, SignalLow, SignalMedium, SignalHigh, AlertTriangle, RefreshCw } from 'lucide-react';
import ErrorMessage from './ErrorMessage';
import { createWebSocketError } from '../utils/errors';

function getLatencyInfo(latency: number | null): {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  Icon: typeof Signal;
} {
  if (latency === null) {
    return {
      label: 'Live',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-950/30',
      borderColor: 'border-emerald-900/50',
      Icon: SignalHigh,
    };
  }
  if (latency < 100) {
    return {
      label: `${latency}ms`,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-950/30',
      borderColor: 'border-emerald-900/50',
      Icon: SignalHigh,
    };
  }
  if (latency <= 300) {
    return {
      label: `${latency}ms`,
      color: 'text-amber-400',
      bgColor: 'bg-amber-950/30',
      borderColor: 'border-amber-900/50',
      Icon: SignalMedium,
    };
  }
  return {
    label: `${latency}ms`,
    color: 'text-red-400',
    bgColor: 'bg-red-950/30',
    borderColor: 'border-red-900/50',
    Icon: SignalLow,
  };
}

export default function WebSocketStatus() {
  const [state, setState] = useState<ConnectionState>(wsClient.getState());
  const [showDetailedError, setShowDetailedError] = useState(false);

  useEffect(() => {
    const handleStateChange = (newState: ConnectionState) => {
      setState(newState);

      // Auto-show detailed error if disconnected for 10+ seconds
      if (newState.status === 'disconnected' && newState.disconnectedAt) {
        const disconnectedDuration = Date.now() - newState.disconnectedAt;
        if (disconnectedDuration > 10000) {
          setShowDetailedError(true);
        }
      } else {
        setShowDetailedError(false);
      }
    };

    wsClient.addStateListener(handleStateChange);

    return () => {
      wsClient.removeStateListener(handleStateChange);
    };
  }, []);

  const handleForceReconnect = () => {
    wsClient.reconnectNow();
    setShowDetailedError(false);
  };

  // Connected state
  if (state.status === 'connected') {
    const { label, color, bgColor, borderColor, Icon } = getLatencyInfo(state.pingLatency);
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={`Connected, latency: ${label}`}
        className={`flex items-center gap-2 rounded-lg ${bgColor} border ${borderColor} px-3 py-1.5 text-xs`}
      >
        <div className="relative">
          <Icon className={`h-3.5 w-3.5 ${color}`} aria-hidden="true" />
          <div className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
        </div>
        <span className={`${color} font-medium`}>{label}</span>
      </div>
    );
  }

  // Connecting state
  if (state.status === 'connecting') {
    const isUnstable = state.reconnectAttempt >= 3;
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={`${isUnstable ? 'Unstable connection' : 'Connecting'}${state.reconnectAttempt > 0 ? `, attempt ${state.reconnectAttempt}` : ''}`}
        className={`flex items-center gap-2 rounded-lg ${isUnstable ? 'bg-amber-950/30 border border-amber-900/50' : 'bg-amber-950/30 border border-amber-900/50'} px-3 py-1.5 text-xs`}
      >
        {isUnstable ? (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 animate-pulse" aria-hidden="true" />
        ) : (
          <div className="h-3.5 w-3.5 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" aria-hidden="true" />
        )}
        <span className="text-amber-400 font-medium">
          {isUnstable ? 'Unstable' : 'Connecting'}{state.reconnectAttempt > 0 ? ` (${state.reconnectAttempt})` : '...'}
        </span>
      </div>
    );
  }

  // Disconnected state
  const isUnstable = state.reconnectAttempt >= 3;
  const disconnectedDuration = state.disconnectedAt ? Math.floor((Date.now() - state.disconnectedAt) / 1000) : 0;

  return (
    <div className="space-y-2">
      {/* Status badge */}
      <div
        role="status"
        aria-live="polite"
        aria-label={`${isUnstable ? 'Unstable connection' : 'Offline'}${state.reconnectAttempt > 0 ? `, attempt ${state.reconnectAttempt}` : ''}`}
        className="flex items-center gap-2 rounded-lg bg-red-950/30 border border-red-900/50 px-3 py-1.5 text-xs"
      >
        {isUnstable ? (
          <AlertTriangle className="h-3.5 w-3.5 text-red-400 animate-pulse" aria-hidden="true" />
        ) : (
          <WifiOff className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
        )}
        <span className="text-red-400 font-medium flex-1">
          {isUnstable ? 'Unstable' : 'Offline'}{state.reconnectAttempt > 0 ? ` (${state.reconnectAttempt})` : ''}
        </span>
        {state.nextReconnectIn !== null && (
          <span className="text-red-300/60 text-[10px]">
            {state.nextReconnectIn}s
          </span>
        )}
        <button
          onClick={handleForceReconnect}
          className="ml-2 p-1 rounded hover:bg-red-900/30 transition"
          aria-label="Force reconnect"
          title="Force reconnect now"
        >
          <RefreshCw className="h-3 w-3 text-red-300" />
        </button>
      </div>

      {/* Detailed error message for prolonged disconnection */}
      {(showDetailedError || isUnstable) && (
        <ErrorMessage
          error={createWebSocketError(
            state.reconnectAttempt,
            state.nextReconnectIn,
            handleForceReconnect
          )}
          onDismiss={() => setShowDetailedError(false)}
        />
      )}
    </div>
  );
}
