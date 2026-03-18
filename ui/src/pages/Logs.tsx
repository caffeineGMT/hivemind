import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Download, Copy, ChevronsDown, Filter, X, Calendar } from 'lucide-react';
import { api } from '../api';

interface LogEntry {
  id: number;
  timestamp: string;
  level: string;
  source: string | null;
  company_id: string | null;
  agent_id: string | null;
  task_id: string | null;
  action: string;
  metadata: string | null;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevels, setSelectedLevels] = useState<Set<LogLevel>>(new Set());
  const [agentFilter, setAgentFilter] = useState('');
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d' | 'all'>('24h');
  const [loading, setLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [autoScroll, setAutoScroll] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const listRef = useRef<List>(null);
  const itemSizeCache = useRef<Map<number, number>>(new Map());

  // Fetch logs
  useEffect(() => {
    setLoading(true);
    api.searchLogs({
      keyword: searchQuery,
      level: selectedLevels.size === 1 ? Array.from(selectedLevels)[0] : '',
      source: agentFilter
    })
      .then(setLogs)
      .finally(() => setLoading(false));
  }, [searchQuery, selectedLevels, agentFilter]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logs.length > 0 && listRef.current) {
      listRef.current.scrollToItem(logs.length - 1, 'end');
    }
  }, [logs, autoScroll]);

  // Filter logs by time range and search
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // Time range filter
    if (timeRange !== 'all') {
      const now = Date.now();
      const ranges: Record<string, number> = {
        '1h': 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
      };
      const cutoff = now - ranges[timeRange];
      result = result.filter(log => new Date(log.timestamp).getTime() >= cutoff);
    }

    // Level filter
    if (selectedLevels.size > 0) {
      result = result.filter(log => selectedLevels.has(log.level.toLowerCase() as LogLevel));
    }

    // Search filter (case-insensitive)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(log =>
        log.action.toLowerCase().includes(query) ||
        log.source?.toLowerCase().includes(query) ||
        log.metadata?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [logs, timeRange, selectedLevels, searchQuery]);

  // Get unique agents for filter dropdown
  const uniqueAgents = useMemo(() => {
    const agents = new Set<string>();
    logs.forEach(log => {
      if (log.source) agents.add(log.source);
    });
    return Array.from(agents).sort();
  }, [logs]);

  const toggleLevel = (level: LogLevel) => {
    const newLevels = new Set(selectedLevels);
    if (newLevels.has(level)) {
      newLevels.delete(level);
    } else {
      newLevels.add(level);
    }
    setSelectedLevels(newLevels);
  };

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
    itemSizeCache.current.clear();
    listRef.current?.resetAfterIndex(0);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const copyAllLogs = () => {
    const text = filteredLogs.map(log =>
      `[${new Date(log.timestamp).toISOString()}] ${log.level.toUpperCase()} ${log.source || 'system'}: ${log.action}`
    ).join('\n');
    copyToClipboard(text);
  };

  const downloadLogs = () => {
    const text = filteredLogs.map(log => {
      let line = `[${new Date(log.timestamp).toISOString()}] ${log.level.toUpperCase()} ${log.source || 'system'}: ${log.action}`;
      if (log.metadata) {
        line += `\n  Metadata: ${log.metadata}`;
      }
      return line;
    }).join('\n\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hivemind-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return { bg: 'bg-red-900/20', text: 'text-red-400', border: 'border-red-800' };
      case 'warn':
        return { bg: 'bg-yellow-900/20', text: 'text-yellow-400', border: 'border-yellow-800' };
      case 'info':
        return { bg: 'bg-blue-900/20', text: 'text-blue-400', border: 'border-blue-800' };
      default:
        return { bg: 'bg-zinc-800/20', text: 'text-zinc-400', border: 'border-zinc-700' };
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="bg-yellow-500/30 text-yellow-200">{part}</mark>
        : part
    );
  };

  const getItemSize = (index: number) => {
    if (itemSizeCache.current.has(index)) {
      return itemSizeCache.current.get(index)!;
    }

    const log = filteredLogs[index];
    const isExpanded = expandedIds.has(log.id);
    const baseHeight = 56; // Base height for collapsed entry
    const expandedHeight = log.metadata ? 120 : 80; // Additional height when expanded

    const size = isExpanded ? baseHeight + expandedHeight : baseHeight;
    itemSizeCache.current.set(index, size);
    return size;
  };

  const LogRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const log = filteredLogs[index];
    const isExpanded = expandedIds.has(log.id);
    const colors = getLevelColor(log.level);

    return (
      <div
        style={style}
        className="border-b border-zinc-800 hover:bg-zinc-900/50 transition-colors cursor-pointer"
        onClick={() => toggleExpanded(log.id)}
      >
        <div className="px-4 py-3 font-mono text-xs">
          {/* Main log line */}
          <div className="flex items-start gap-3">
            {/* Timestamp */}
            <span className="text-zinc-500 text-[10px] whitespace-nowrap shrink-0 w-36">
              {new Date(log.timestamp).toLocaleString('en-US', {
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              })}
            </span>

            {/* Level badge */}
            <span className={`${colors.bg} ${colors.text} ${colors.border} border px-2 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 w-16 text-center`}>
              {log.level}
            </span>

            {/* Agent name */}
            <span className="text-amber-400 font-semibold shrink-0 min-w-24">
              {log.source || 'system'}
            </span>

            {/* Action message */}
            <span className="text-zinc-300 flex-1">
              {highlightMatch(log.action, searchQuery)}
            </span>

            {/* Copy button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(`[${log.timestamp}] ${log.level.toUpperCase()} ${log.source}: ${log.action}`);
              }}
              className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0"
              title="Copy log entry"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>

          {/* Expanded metadata */}
          {isExpanded && (
            <div className="mt-3 pl-40 space-y-2 text-zinc-400 text-[11px]">
              {log.task_id && (
                <div>
                  <span className="text-zinc-600">Task ID:</span> {log.task_id}
                </div>
              )}
              {log.agent_id && (
                <div>
                  <span className="text-zinc-600">Agent ID:</span> {log.agent_id}
                </div>
              )}
              {log.metadata && (
                <div>
                  <span className="text-zinc-600">Metadata:</span>
                  <pre className="mt-1 p-2 bg-zinc-950 rounded text-[10px] overflow-x-auto">
                    {log.metadata}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-zinc-100">System Logs</h1>
          <span className="text-sm text-zinc-500">
            {filteredLogs.length} / {logs.length} entries
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              showFilters ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={copyAllLogs}
            className="px-3 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-2"
            title="Copy all filtered logs"
          >
            <Copy className="w-4 h-4" />
            Copy All
          </button>
          <button
            onClick={downloadLogs}
            className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              autoScroll ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
            title="Auto-scroll to bottom"
          >
            <ChevronsDown className="w-4 h-4" />
            {autoScroll ? 'Auto' : 'Manual'}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search logs (message, agent, metadata)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Level filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Level:</span>
              {(['debug', 'info', 'warn', 'error'] as LogLevel[]).map((level) => {
                const colors = getLevelColor(level);
                const isSelected = selectedLevels.has(level);
                return (
                  <button
                    key={level}
                    onClick={() => toggleLevel(level)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold uppercase transition-all ${
                      isSelected
                        ? `${colors.bg} ${colors.text} ${colors.border} border`
                        : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>

            {/* Agent filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Agent:</span>
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="">All Agents</option>
                {uniqueAgents.map(agent => (
                  <option key={agent} value={agent}>{agent}</option>
                ))}
              </select>
            </div>

            {/* Time range filter */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-400" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
                className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="1h">Last Hour</option>
                <option value="6h">Last 6 Hours</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>

            {/* Clear filters */}
            {(selectedLevels.size > 0 || agentFilter || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedLevels(new Set());
                  setAgentFilter('');
                  setSearchQuery('');
                }}
                className="ml-auto px-3 py-1.5 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 rounded text-sm flex items-center gap-2"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Log list */}
      <div className="flex-1 bg-zinc-950 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-3 text-zinc-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
              Loading logs...
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-500">
            No logs found
          </div>
        ) : (
          <List
            ref={listRef}
            height={window.innerHeight - (showFilters ? 220 : 140)}
            itemCount={filteredLogs.length}
            itemSize={getItemSize}
            width="100%"
            className="scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
          >
            {LogRow}
          </List>
        )}
      </div>
    </div>
  );
}
