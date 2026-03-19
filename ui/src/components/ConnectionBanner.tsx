import { useEffect, useState } from 'react';
import { wsClient, ConnectionState } from '../websocket';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';

const SHOW_BANNER_AFTER_MS = 10000; // Show banner after 10s of disconnection

function formatTimeSince(timestamp: number | null): string {
  if (!timestamp) return 'unknown';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function ConnectionBanner() {
  const [state, setState] = useState<ConnectionState>(wsClient.getState());
  const [showBanner, setShowBanner] = useState(false);
  const [lastUpdatedText, setLastUpdatedText] = useState('');

  useEffect(() => {
    const handleStateChange = (newState: ConnectionState) => {
      setState(newState);
    };
    wsClient.addStateListener(handleStateChange);
    return () => {
      wsClient.removeStateListener(handleStateChange);
    };
  }, []);

  // Show banner after being disconnected for >10s
  useEffect(() => {
    if (state.status === 'connected') {
      setShowBanner(false);
      return;
    }

    if (state.status === 'disconnected' || state.status === 'connecting') {
      const disconnectedAt = state.disconnectedAt;
      if (!disconnectedAt) return;

      const elapsed = Date.now() - disconnectedAt;
      if (elapsed >= SHOW_BANNER_AFTER_MS) {
        setShowBanner(true);
      } else {
        const timer = setTimeout(() => {
          setShowBanner(true);
        }, SHOW_BANNER_AFTER_MS - elapsed);
        return () => clearTimeout(timer);
      }
    }
  }, [state.status, state.disconnectedAt]);

  // Update "last updated" text every second
  useEffect(() => {
    if (!showBanner) return;

    const updateText = () => {
      setLastUpdatedText(formatTimeSince(state.lastConnectedAt));
    };
    updateText();
    const interval = setInterval(updateText, 1000);
    return () => clearInterval(interval);
  }, [showBanner, state.lastConnectedAt]);

  if (!showBanner) return null;

  const pendingCount = wsClient.getPendingMutationCount();
  const isReconnecting = state.status === 'connecting';

  return (
    <div className="border-b border-amber-900/50 bg-amber-950/40 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: Status message */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-900/40">
              {isReconnecting ? (
                <RefreshCw className="h-4 w-4 text-amber-400 animate-spin" />
              ) : (
                <WifiOff className="h-4 w-4 text-amber-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-200">
                {isReconnecting
                  ? `Reconnecting... (attempt ${state.reconnectAttempt})`
                  : 'Connection lost'}
              </p>
              <p className="text-xs text-amber-400/70">
                {state.nextReconnectIn !== null && !isReconnecting && (
                  <span>Reconnecting in {state.nextReconnectIn}s</span>
                )}
                {state.nextReconnectIn !== null && !isReconnecting && state.lastConnectedAt && (
                  <span> &middot; </span>
                )}
                {state.lastConnectedAt && (
                  <span>Last updated: {lastUpdatedText}</span>
                )}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-amber-400/70">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{pendingCount} pending {pendingCount === 1 ? 'change' : 'changes'}</span>
              </div>
            )}
            <button
              onClick={() => wsClient.reconnectNow()}
              disabled={isReconnecting}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-3 w-3 ${isReconnecting ? 'animate-spin' : ''}`} />
              {isReconnecting ? 'Reconnecting...' : 'Reconnect Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
