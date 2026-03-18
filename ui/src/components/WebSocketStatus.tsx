import { useEffect, useState } from 'react';
import { wsClient } from '../websocket';
import { Wifi, WifiOff } from 'lucide-react';

export default function WebSocketStatus() {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>(
    wsClient.getStatus()
  );

  useEffect(() => {
    const handleStatusChange = (newStatus: 'connecting' | 'connected' | 'disconnected') => {
      setStatus(newStatus);
    };

    wsClient.addStatusListener(handleStatusChange);

    return () => {
      wsClient.removeStatusListener(handleStatusChange);
    };
  }, []);

  if (status === 'connected') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-950/30 border border-emerald-900/50 px-3 py-1.5 text-xs">
        <div className="relative">
          <Wifi className="h-3.5 w-3.5 text-emerald-500" />
          <div className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <span className="text-emerald-400 font-medium">Live</span>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-amber-950/30 border border-amber-900/50 px-3 py-1.5 text-xs">
        <div className="h-3.5 w-3.5 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
        <span className="text-amber-400 font-medium">Connecting...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-red-950/30 border border-red-900/50 px-3 py-1.5 text-xs">
      <WifiOff className="h-3.5 w-3.5 text-red-500" />
      <span className="text-red-400 font-medium">Disconnected</span>
    </div>
  );
}
