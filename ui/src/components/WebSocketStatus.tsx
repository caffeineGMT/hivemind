import { useEffect, useState } from 'react';
import { wsClient, ConnectionState } from '../websocket';
import { Wifi, WifiOff, Signal, SignalLow, SignalMedium, SignalHigh } from 'lucide-react';

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

  useEffect(() => {
    const handleStateChange = (newState: ConnectionState) => {
      setState(newState);
    };

    wsClient.addStateListener(handleStateChange);

    return () => {
      wsClient.removeStateListener(handleStateChange);
    };
  }, []);

  if (state.status === 'connected') {
    const { label, color, bgColor, borderColor, Icon } = getLatencyInfo(state.pingLatency);
    return (
      <div className={`flex items-center gap-2 rounded-lg ${bgColor} border ${borderColor} px-3 py-1.5 text-xs`}>
        <div className="relative">
          <Icon className={`h-3.5 w-3.5 ${color}`} />
          <div className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <span className={`${color} font-medium`}>{label}</span>
      </div>
    );
  }

  if (state.status === 'connecting') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-amber-950/30 border border-amber-900/50 px-3 py-1.5 text-xs">
        <div className="h-3.5 w-3.5 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
        <span className="text-amber-400 font-medium">
          Connecting{state.reconnectAttempt > 0 ? ` (${state.reconnectAttempt})` : '...'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-red-950/30 border border-red-900/50 px-3 py-1.5 text-xs">
      <WifiOff className="h-3.5 w-3.5 text-red-500" />
      <span className="text-red-400 font-medium">
        Offline{state.reconnectAttempt > 0 ? ` (${state.reconnectAttempt})` : ''}
      </span>
    </div>
  );
}
