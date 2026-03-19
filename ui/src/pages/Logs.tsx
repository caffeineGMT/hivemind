import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Download, Copy, ChevronsDown, Filter, X, Calendar, AlertTriangle, ChevronDown, ChevronRight, BarChart3, FileJson, FileSpreadsheet, Archive } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, FailurePatternData, FailurePatternEntry } from '../api';

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

const SEVERITY_CONFIG = {
  critical: { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-700', label: 'CRITICAL' },
  high: { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-700', label: 'HIGH' },
  medium: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-700', label: 'MEDIUM' },
  low: { bg: 'bg-zinc-800/30', text: 'text-zinc-400', border: 'border-zinc-700', label: 'LOW' },
};

function FailurePatternsPanel() {
  const [data, setData] = useState<FailurePatternData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [expandedPatterns, setExpandedPatterns] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.getFailurePatterns()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const togglePattern = (id: string) => {
    const next = new Set(expandedPatterns);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedPatterns(next);
  };

  if (loading) {
    return (
      <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
          Analyzing failure patterns...
        </div>
      </div>
    );
  }

  if (!data || data.patterns.length === 0) return null;

  const { patterns, summary } = data;
  const topPatterns = patterns.slice(0, 10);

  return (
    <div className="border-b border-zinc-800 bg-zinc-900/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold text-zinc-200">
            Failure Patterns
          </span>
          <span className="text-xs text-zinc-500">
            {summary.unique_patterns} patterns from {summary.total_failures} failures
          </span>
          {summary.top_pattern && (
            <span className="text-xs px-2 py-0.5 bg-red-900/30 text-red-400 rounded border border-red-800">
              Top: {summary.top_pattern.count}x
            </span>
          )}
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
      </button>

      {expanded && (
        <div className="px-6 pb-4 space-y-3">
          {/* Summary stats row */}
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded">
              <span className="text-zinc-500">Total Failures:</span>
              <span className="text-zinc-200 font-semibold">{summary.total_failures}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded">
              <span className="text-zinc-500">Unique Patterns:</span>
              <span className="text-zinc-200 font-semibold">{summary.unique_patterns}</span>
            </div>
            {summary.peak_failure_hour && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded">
                <span className="text-zinc-500">Peak Hour:</span>
                <span className="text-zinc-200 font-semibold">
                  {String(summary.peak_failure_hour.hour).padStart(2, '0')}:00 ({summary.peak_failure_hour.count} failures)
                </span>
              </div>
            )}
            {Object.keys(summary.failure_rate_by_agent).length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded">
                <span className="text-zinc-500">Most Failing Agent:</span>
                <span className="text-zinc-200 font-semibold">
                  {Object.entries(summary.failure_rate_by_agent).sort((a, b) => b[1] - a[1])[0]?.[0]}
                </span>
              </div>
            )}
          </div>

          {/* Pattern list */}
          <div className="space-y-1">
            {topPatterns.map((pattern) => (
              <PatternRow
                key={pattern.pattern_id}
                pattern={pattern}
                isExpanded={expandedPatterns.has(pattern.pattern_id)}
                onToggle={() => togglePattern(pattern.pattern_id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PatternRow({ pattern, isExpanded, onToggle }: { pattern: FailurePatternEntry; isExpanded: boolean; onToggle: () => void }) {
  const sev = SEVERITY_CONFIG[pattern.severity];

  // Build a simple hour sparkline (24 bars)
  const hourBars = useMemo(() => {
    const maxCount = Math.max(1, ...Object.values(pattern.hour_distribution));
    return Array.from({ length: 24 }, (_, h) => {
      const count = pattern.hour_distribution[String(h)] || 0;
      return { hour: h, count, pct: (count / maxCount) * 100 };
    });
  }, [pattern.hour_distribution]);

  return (
    <div className={`rounded border ${sev.border} ${sev.bg}`}>
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-white/5 transition-colors"
      >
        {isExpanded ? <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" /> : <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0" />}
        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${sev.bg} ${sev.text} shrink-0`}>
          {sev.label}
        </span>
        <span className="text-xs text-zinc-300 flex-1 truncate font-mono">
          {pattern.representative_message}
        </span>
        <span className="text-xs text-zinc-500 shrink-0">{pattern.count}x</span>
        <span className="text-[10px] text-zinc-600 shrink-0">
          {new Date(pattern.last_seen).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
        </span>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-zinc-800/50">
          {/* Metadata row */}
          <div className="flex gap-4 text-[11px]">
            <div>
              <span className="text-zinc-600">First seen: </span>
              <span className="text-zinc-400">{new Date(pattern.first_seen).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-zinc-600">Agents: </span>
              <span className="text-zinc-400">{Object.entries(pattern.agent_types).map(([k, v]) => `${k} (${v})`).join(', ')}</span>
            </div>
            <div>
              <span className="text-zinc-600">Task types: </span>
              <span className="text-zinc-400">{Object.entries(pattern.task_types).map(([k, v]) => `${k} (${v})`).join(', ')}</span>
            </div>
          </div>

          {/* Hour distribution sparkline */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <BarChart3 className="w-3 h-3 text-zinc-600" />
              <span className="text-[10px] text-zinc-600">Failures by hour</span>
            </div>
            <div className="flex items-end gap-px h-6">
              {hourBars.map(bar => (
                <div
                  key={bar.hour}
                  className={`flex-1 rounded-t ${bar.count > 0 ? 'bg-amber-500/60' : 'bg-zinc-800/40'}`}
                  style={{ height: `${Math.max(bar.count > 0 ? 15 : 2, bar.pct)}%` }}
                  title={`${String(bar.hour).padStart(2, '0')}:00 - ${bar.count} failures`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[8px] text-zinc-700 mt-0.5">
              <span>00</span>
              <span>06</span>
              <span>12</span>
              <span>18</span>
              <span>23</span>
            </div>
          </div>

          {/* Sample entries */}
          {pattern.sample_entries.length > 0 && (
            <div>
              <span className="text-[10px] text-zinc-600">Recent occurrences:</span>
              <div className="mt-1 space-y-1">
                {pattern.sample_entries.map((entry, i) => (
                  <div key={i} className="text-[10px] font-mono px-2 py-1 bg-zinc-950/50 rounded flex items-start gap-2">
                    <span className="text-zinc-600 shrink-0">
                      {new Date(entry.created_at).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                    <span className="text-zinc-500 shrink-0">[{entry.agent_id || 'system'}]</span>
                    <span className="text-zinc-400 truncate">{entry.detail || entry.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (autoScroll && logs.length > 0 && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = useMemo(() => {
    let result = [...logs];

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

    if (selectedLevels.size > 0) {
      result = result.filter(log => selectedLevels.has(log.level.toLowerCase() as LogLevel));
    }

    return result;
  }, [logs, timeRange, selectedLevels]);

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

  const exportLogsServer = async (format: 'json' | 'csv') => {
    try {
      const level = selectedLevels.size === 1 ? Array.from(selectedLevels)[0] : undefined;
      const data = await api.exportLogs({ level, source: agentFilter || undefined, format });
      const blob = new Blob(
        [typeof data === 'string' ? data : JSON.stringify(data, null, 2)],
        { type: format === 'csv' ? 'text/csv' : 'application/json' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hivemind-logs-${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
    setShowExportMenu(false);
  };

  const handleArchive = async () => {
    setArchiving(true);
    try {
      const result = await api.triggerArchival(30);
      const total = (result.logs?.archived || 0) + (result.activity?.archived || 0);
      alert(`Archived ${total} entries (${result.logs?.archived || 0} logs, ${result.activity?.archived || 0} activity).`);
    } catch (err) {
      console.error('Archival failed:', err);
      alert('Archival failed. Check console for details.');
    } finally {
      setArchiving(false);
    }
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

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
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
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 py-1 min-w-[160px]">
                <button
                  onClick={downloadLogs}
                  className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download TXT
                </button>
                <button
                  onClick={() => exportLogsServer('json')}
                  className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  Export JSON
                </button>
                <button
                  onClick={() => exportLogsServer('csv')}
                  className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Export CSV
                </button>
                <div className="border-t border-zinc-700 my-1" />
                <button
                  onClick={handleArchive}
                  disabled={archiving}
                  className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <Archive className="w-3.5 h-3.5" />
                  {archiving ? 'Archiving...' : 'Archive Old Logs'}
                </button>
              </div>
            )}
          </div>
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

      {showFilters && (
        <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 space-y-3">
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

          <div className="flex items-center gap-3 flex-wrap">
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

      <FailurePatternsPanel />

      <div
        ref={scrollRef}
        className="flex-1 bg-zinc-950 overflow-y-auto overflow-x-hidden"
      >
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
          <div className="divide-y divide-zinc-800">
            {filteredLogs.map((log) => {
              const isExpanded = expandedIds.has(log.id);
              const colors = getLevelColor(log.level);

              return (
                <div
                  key={log.id}
                  className="border-b border-zinc-800 hover:bg-zinc-900/50 transition-colors cursor-pointer"
                  onClick={() => toggleExpanded(log.id)}
                >
                  <div className="px-4 py-3 font-mono text-xs">
                    <div className="flex items-start gap-3">
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

                      <span className={`${colors.bg} ${colors.text} ${colors.border} border px-2 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 w-16 text-center`}>
                        {log.level}
                      </span>

                      <span className="text-amber-400 font-semibold shrink-0 min-w-24">
                        {log.source || 'system'}
                      </span>

                      <span className="text-zinc-300 flex-1">
                        {highlightMatch(log.action, searchQuery)}
                      </span>

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

                    {isExpanded && (
                      <div className="mt-3 pl-40 space-y-2 text-zinc-400 text-[11px]">
                        {log.task_id && (
                          <div>
                            <span className="text-zinc-600">Task ID:</span> {log.task_id}
                          </div>
                        )}
                        {log.agent_id && (
                          <div>
                            <span className="text-zinc-600">Agent ID:</span>{' '}
                            {log.source ? (
                              <Link
                                to={`../logs/${log.source}`}
                                className="text-emerald-400 hover:text-emerald-300 transition-colors font-mono"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {log.agent_id}
                              </Link>
                            ) : (
                              <span className="font-mono">{log.agent_id}</span>
                            )}
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
            })}
          </div>
        )}
      </div>
    </div>
  );
}
