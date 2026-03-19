import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Activity, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../api';

interface Span {
  id: number;
  trace_id: string;
  span_id: string;
  parent_span_id: string | null;
  operation: string;
  timestamp: string;
  duration_ms: number | null;
  status: string | null;
  metadata: any;
  company_id: string | null;
  agent_id: string | null;
  task_id: string | null;
  startTime: number;
  endTime: number;
  duration: number;
}

interface TraceData {
  traceId: string;
  spans: Span[];
  tree: any[];
  summary: {
    totalSpans: number;
    startTime: string;
    endTime: string;
    totalDuration: number;
  };
}

export default function TraceView() {
  const { traceId } = useParams<{ traceId: string }>();
  const navigate = useNavigate();
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set());
  const [hoveredSpan, setHoveredSpan] = useState<string | null>(null);

  useEffect(() => {
    if (!traceId) return;

    setLoading(true);
    api
      .getHealth()
      .then(() => fetch(`/api/traces/${traceId}`))
      .then((res) => {
        if (!res.ok) throw new Error('Trace not found');
        return res.json();
      })
      .then(setTraceData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [traceId]);

  const toggleExpanded = (spanId: string) => {
    const newExpanded = new Set(expandedSpans);
    if (newExpanded.has(spanId)) {
      newExpanded.delete(spanId);
    } else {
      newExpanded.add(spanId);
    }
    setExpandedSpans(newExpanded);
  };

  const { timelineData, minTime, maxTime, totalDuration } = useMemo(() => {
    if (!traceData) return { timelineData: [], minTime: 0, maxTime: 0, totalDuration: 0 };

    const spans = traceData.spans;
    const minTime = Math.min(...spans.map((s) => s.startTime));
    const maxTime = Math.max(...spans.map((s) => s.endTime));
    const totalDuration = maxTime - minTime;

    return { timelineData: spans, minTime, maxTime, totalDuration };
  }, [traceData]);

  const getOperationColor = (operation: string, status: string | null) => {
    if (status === 'error' || operation.includes('error')) {
      return { bg: 'bg-red-600', border: 'border-red-500', text: 'text-red-400' };
    }
    if (status === 'success' || operation.includes('complete')) {
      return { bg: 'bg-green-600', border: 'border-green-500', text: 'text-green-400' };
    }
    if (operation.includes('api') || operation.includes('call')) {
      return { bg: 'bg-blue-600', border: 'border-blue-500', text: 'text-blue-400' };
    }
    if (operation.includes('agent') || operation.includes('execute')) {
      return { bg: 'bg-purple-600', border: 'border-purple-500', text: 'text-purple-400' };
    }
    if (operation.includes('task')) {
      return { bg: 'bg-amber-600', border: 'border-amber-500', text: 'text-amber-400' };
    }
    return { bg: 'bg-zinc-600', border: 'border-zinc-500', text: 'text-zinc-400' };
  };

  const getPositionAndWidth = (span: Span) => {
    const left = ((span.startTime - minTime) / totalDuration) * 100;
    const width = (span.duration / totalDuration) * 100;
    return { left: `${left}%`, width: `${Math.max(width, 0.5)}%` };
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      hour12: false,
    });
  };

  const getStatusIcon = (status: string | null, operation: string) => {
    if (status === 'error' || operation.includes('error')) {
      return <XCircle className="w-4 h-4 text-red-400" />;
    }
    if (status === 'success' || operation.includes('complete')) {
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    }
    if (operation.includes('warning')) {
      return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    }
    return <Activity className="w-4 h-4 text-zinc-400" />;
  };

  const buildTree = (spans: Span[]) => {
    const spanMap = new Map<string, Span & { children: Span[] }>();
    const rootSpans: (Span & { children: Span[] })[] = [];

    spans.forEach((span) => {
      spanMap.set(span.span_id, { ...span, children: [] });
    });

    spans.forEach((span) => {
      const node = spanMap.get(span.span_id)!;
      if (span.parent_span_id) {
        const parent = spanMap.get(span.parent_span_id);
        if (parent) {
          parent.children.push(node);
        } else {
          rootSpans.push(node);
        }
      } else {
        rootSpans.push(node);
      }
    });

    return rootSpans;
  };

  const renderTreeNode = (node: Span & { children: Span[] }, depth: number = 0) => {
    const isExpanded = expandedSpans.has(node.span_id);
    const hasChildren = node.children.length > 0;
    const colors = getOperationColor(node.operation, node.status);
    const isHovered = hoveredSpan === node.span_id;

    return (
      <div key={node.span_id}>
        <div
          className={`flex items-center gap-3 py-2 px-3 hover:bg-zinc-800/50 transition-colors cursor-pointer border-l-2 ${
            isHovered ? 'bg-zinc-800/70 ' + colors.border : 'border-transparent'
          }`}
          style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
          onMouseEnter={() => setHoveredSpan(node.span_id)}
          onMouseLeave={() => setHoveredSpan(null)}
          onClick={() => hasChildren && toggleExpanded(node.span_id)}
        >
          {hasChildren ? (
            <button className="text-zinc-500 hover:text-zinc-300">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-4" />
          )}

          {getStatusIcon(node.status, node.operation)}

          <span className="text-sm text-zinc-300 font-mono flex-1">{node.operation}</span>

          <span className="text-xs text-zinc-500 font-mono">{formatTime(node.timestamp)}</span>

          <span className={`text-xs font-semibold ${colors.text}`}>{formatDuration(node.duration)}</span>
        </div>

        {isExpanded && hasChildren && (
          <div>{node.children.map((child) => renderTreeNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
          Loading trace...
        </div>
      </div>
    );
  }

  if (error || !traceData) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-zinc-100 mb-2">Trace Not Found</h2>
          <p className="text-zinc-400 mb-4">{error || 'The requested trace could not be found.'}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const treeData = buildTree(traceData.spans);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Trace Timeline</h1>
                <p className="text-sm text-zinc-500 font-mono mt-1">ID: {traceData.traceId}</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-xs text-zinc-500">Total Spans</div>
                <div className="text-lg font-semibold text-zinc-100">{traceData.summary.totalSpans}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-500">Duration</div>
                <div className="text-lg font-semibold text-amber-400">{formatDuration(traceData.summary.totalDuration)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-500">Start Time</div>
                <div className="text-lg font-semibold text-zinc-100">{formatTime(traceData.summary.startTime)}</div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <span className="text-zinc-500">Legend:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-purple-600 rounded" />
              <span className="text-zinc-400">Agent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-blue-600 rounded" />
              <span className="text-zinc-400">API Call</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-amber-600 rounded" />
              <span className="text-zinc-400">Task</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-green-600 rounded" />
              <span className="text-zinc-400">Success</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-red-600 rounded" />
              <span className="text-zinc-400">Error</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Gantt Chart Timeline */}
        <div className="lg:col-span-2 bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Timeline Visualization
            </h2>
          </div>

          <div className="p-6">
            {/* Time axis */}
            <div className="mb-4 relative">
              <div className="flex justify-between text-xs text-zinc-500 font-mono mb-2">
                <span>{formatTime(traceData.summary.startTime)}</span>
                <span>{formatDuration(totalDuration / 2)}</span>
                <span>{formatTime(traceData.summary.endTime)}</span>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 via-amber-500/20 to-amber-600/20 rounded-full" />
              </div>
            </div>

            {/* Gantt bars */}
            <div className="space-y-2">
              {timelineData.map((span, idx) => {
                const colors = getOperationColor(span.operation, span.status);
                const pos = getPositionAndWidth(span);
                const isHovered = hoveredSpan === span.span_id;

                return (
                  <div key={span.span_id} className="relative">
                    <div className="flex items-center gap-3 h-12">
                      <div className="w-48 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(span.status, span.operation)}
                          <span className={`text-xs font-mono truncate ${colors.text}`}>
                            {span.operation}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-600 mt-0.5">
                          {span.agent_id ? `Agent: ${span.agent_id.slice(0, 8)}` : ''}
                        </div>
                      </div>

                      <div className="flex-1 relative h-8">
                        <div
                          className={`absolute h-full ${colors.bg} ${
                            isHovered ? 'opacity-100 ring-2 ring-amber-500' : 'opacity-80'
                          } rounded transition-all cursor-pointer`}
                          style={pos}
                          onMouseEnter={() => setHoveredSpan(span.span_id)}
                          onMouseLeave={() => setHoveredSpan(null)}
                          title={`${span.operation}\nDuration: ${formatDuration(span.duration)}\nStart: ${formatTime(span.timestamp)}`}
                        >
                          {span.duration / totalDuration > 0.05 && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[10px] font-semibold text-white/90 px-2 truncate">
                                {formatDuration(span.duration)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="w-20 text-right text-xs font-mono text-zinc-500">
                        {formatDuration(span.duration)}
                      </div>
                    </div>

                    {/* Dependency lines */}
                    {span.parent_span_id && idx > 0 && (
                      <div className="absolute left-48 top-0 w-1 h-full -ml-4">
                        <div className="w-px h-full bg-zinc-700/50" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {timelineData.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No spans in this trace</p>
              </div>
            )}
          </div>
        </div>

        {/* Tree View */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden max-h-[calc(100vh-12rem)] flex flex-col">
          <div className="px-6 py-4 border-b border-zinc-800 flex-shrink-0">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Execution Tree
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {treeData.length > 0 ? (
              <div className="divide-y divide-zinc-800/50">
                {treeData.map((node) => renderTreeNode(node))}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-500">
                <p>No trace tree available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
