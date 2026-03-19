import { useParams, Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Terminal } from 'lucide-react';

export default function AgentLog() {
  const { agentName } = useParams<{ agentName: string }>();
  const [log, setLog] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (!agentName) return;

    const evtSource = new EventSource(`/api/logs/${agentName}/stream`);
    evtSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setLog((prev) => prev + data.text);
      } catch {}
    };
    evtSource.onerror = () => {
      // Fallback to polling if SSE fails
      evtSource.close();
      const poll = setInterval(async () => {
        try {
          const res = await fetch(`/api/logs/${agentName}`);
          if (res.ok) {
            const data = await res.json();
            setLog(data.log || '');
          }
        } catch {}
      }, 2000);
      return () => clearInterval(poll);
    };

    return () => evtSource.close();
  }, [agentName]);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center gap-3">
        <Link
          to="../agents"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/60 text-zinc-400 transition hover:bg-zinc-700/60 hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-zinc-100">
            {agentName}
          </h2>
        </div>
        <span className="rounded-full bg-emerald-950/40 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
          Live
        </span>
      </div>

      <div className="rounded-xl border border-zinc-800/60 bg-zinc-950">
        <pre
          ref={containerRef}
          className="max-h-[calc(100vh-200px)] overflow-auto p-4 font-mono text-xs leading-relaxed text-zinc-300"
        >
          {log || (
            <span className="text-zinc-600">Waiting for agent output...</span>
          )}
          <div ref={bottomRef} />
        </pre>
      </div>
    </div>
  );
}
