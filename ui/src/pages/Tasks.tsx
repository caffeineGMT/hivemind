import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, Task } from '../api';
import { format, parseISO } from 'date-fns';
import { CheckSquare, Square, Trash2, Download, Upload, Network, List, Calendar, Filter, GitBranch } from 'lucide-react';
import TaskRow from '../components/TaskRow';
import TaskQueueGraph from '../components/TaskQueueGraph';
import TaskQueueVisualization from '../components/TaskQueueVisualization';
import ConfirmationModal from '../components/ConfirmationModal';

const STATUS_FILTERS = ['all', 'backlog', 'todo', 'in_progress', 'done', 'blocked'] as const;
const PRIORITY_FILTERS = ['all', 'urgent', 'high', 'medium', 'low'] as const;

interface Filters {
  priority: string;
  status: string;
  assignee: string;
  dateRange: { start: string | null; end: string | null };
}

type ViewMode = 'list' | 'graph' | 'timeline' | 'd3-advanced';

function formatLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Tasks({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Load filters from localStorage on mount
  const [filters, setFilters] = useState<Filters>(() => {
    const saved = localStorage.getItem('taskFilters');
    return saved
      ? JSON.parse(saved)
      : { priority: 'all', status: 'all', assignee: 'all', dateRange: { start: null, end: null } };
  });

  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem('taskFilters', JSON.stringify(filters));
  }, [filters]);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', companyId],
    queryFn: () => api.getTasks(companyId),
    refetchInterval: 3000,
  });

  const { data: agents } = useQuery({
    queryKey: ['agents', companyId],
    queryFn: () => api.getAgents(companyId),
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ taskIds, updates }: { taskIds: string[]; updates: any }) => {
      const res = await fetch('/api/tasks/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds, updates }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', companyId] });
      setSelectedTasks(new Set());
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', companyId] });
      setSelectedTasks(new Set());
    },
  });

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((t: Task) => {
      if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
      if (filters.status !== 'all' && t.status !== filters.status) return false;
      if (filters.assignee !== 'all' && t.assignee_id !== filters.assignee) return false;
      if (filters.dateRange.start && new Date(t.created_at) < new Date(filters.dateRange.start))
        return false;
      if (filters.dateRange.end && new Date(t.created_at) > new Date(filters.dateRange.end)) return false;
      return true;
    });
  }, [tasks, filters]);

  // Timeline data
  const timelineData = useMemo(() => {
    return filteredTasks.map((t) => ({
      task: t,
      startDate: new Date(t.created_at),
      duration: t.status === 'done' ? 2 : 5, // mock duration in days
    }));
  }, [filteredTasks]);

  // Bulk action handlers
  const handleBulkStatusChange = async (newStatus: string) => {
    const taskIds = Array.from(selectedTasks);
    await bulkUpdateMutation.mutateAsync({ taskIds, updates: { status: newStatus } });
  };

  const handleBulkDelete = async () => {
    setShowBulkDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    const taskIds = Array.from(selectedTasks);
    await Promise.all(taskIds.map((id) => deleteMutation.mutateAsync(id)));
    setShowBulkDeleteModal(false);
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map((t) => t.id)));
    }
  };

  const handleToggleTask = (taskId: string) => {
    const newSet = new Set(selectedTasks);
    if (newSet.has(taskId)) {
      newSet.delete(taskId);
    } else {
      newSet.add(taskId);
    }
    setSelectedTasks(newSet);
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`${taskId}`);
  };

  if (isLoading || !tasks) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
      </div>
    );
  }

  const counts: Record<string, number> = { all: tasks.length };
  for (const t of tasks) {
    counts[t.status] = (counts[t.status] || 0) + 1;
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Tasks</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {filteredTasks.length} of {tasks.length} tasks
            {selectedTasks.size > 0 && ` · ${selectedTasks.size} selected`}
          </p>
        </div>

        {/* View mode switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              showFilters
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`rounded-lg p-2 transition ${
              viewMode === 'list' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('graph')}
            className={`rounded-lg p-2 transition ${
              viewMode === 'graph'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Network className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`rounded-lg p-2 transition ${
              viewMode === 'timeline'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Timeline View"
          >
            <Calendar className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('d3-advanced')}
            className={`rounded-lg p-2 transition ${
              viewMode === 'd3-advanced'
                ? 'bg-amber-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
            title="Advanced D3 Visualization"
          >
            <GitBranch className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 md:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {formatLabel(s)} ({counts[s] || 0})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200"
            >
              {PRIORITY_FILTERS.map((p) => (
                <option key={p} value={p}>
                  {formatLabel(p)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Assignee</label>
            <select
              value={filters.assignee}
              onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200"
            >
              <option value="all">All Assignees</option>
              {agents?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Date Range</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={filters.dateRange.start || ''}
                onChange={(e) =>
                  setFilters({ ...filters, dateRange: { ...filters.dateRange, start: e.target.value } })
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200"
              />
              <input
                type="date"
                value={filters.dateRange.end || ''}
                onChange={(e) =>
                  setFilters({ ...filters, dateRange: { ...filters.dateRange, end: e.target.value } })
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* Bulk actions */}
      {selectedTasks.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <span className="text-sm font-medium text-amber-300">{selectedTasks.size} selected</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleBulkStatusChange('todo')}
              className="rounded-lg bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/30"
            >
              Mark Todo
            </button>
            <button
              onClick={() => handleBulkStatusChange('in_progress')}
              className="rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/30"
            >
              Mark In Progress
            </button>
            <button
              onClick={() => handleBulkStatusChange('done')}
              className="rounded-lg bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/30"
            >
              Mark Done
            </button>
            <button
              onClick={handleBulkDelete}
              className="rounded-lg bg-red-500/20 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/30"
            >
              <Trash2 className="inline h-3 w-3" /> Delete
            </button>
            <button
              onClick={() => setSelectedTasks(new Set())}
              className="rounded-lg bg-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-600"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {/* Select all checkbox */}
          <div className="flex items-center gap-2 px-2">
            <button
              onClick={handleSelectAll}
              className="text-zinc-500 hover:text-zinc-300"
              aria-label="Select all"
            >
              {selectedTasks.size === filteredTasks.length && filteredTasks.length > 0 ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </button>
            <span className="text-xs text-zinc-500">Select all</span>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-8 text-center text-sm text-zinc-500">
              No tasks match these filters
            </div>
          ) : (
            filteredTasks.map((task: Task) => (
              <div key={task.id} className="flex items-start gap-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleToggleTask(task.id);
                  }}
                  className="mt-3 text-zinc-500 hover:text-zinc-300"
                  aria-label="Select task"
                >
                  {selectedTasks.has(task.id) ? (
                    <CheckSquare className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
                <div className="flex-1">
                  <TaskRow task={task} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Graph View */}
      {viewMode === 'graph' && (
        <div className="h-[700px] rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
          {filteredTasks.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              No tasks to display
            </div>
          ) : (
            <TaskQueueGraph
              tasks={filteredTasks}
              agents={agents || []}
              onTaskClick={handleTaskClick}
            />
          )}
        </div>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="space-y-3">
          {timelineData.length === 0 ? (
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-8 text-center text-sm text-zinc-500">
              No tasks to display
            </div>
          ) : (
            timelineData.map(({ task, startDate, duration }) => {
              const endDate = new Date(startDate);
              endDate.setDate(endDate.getDate() + duration);
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
                >
                  <div className="min-w-[200px]">
                    <p className="text-sm font-medium text-zinc-200">{task.title}</p>
                    <p className="text-xs text-zinc-500">{task.status}</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span>{format(startDate, 'MMM d')}</span>
                      <div className="h-px flex-1 bg-zinc-700" />
                      <span>{format(endDate, 'MMM d')}</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-zinc-800">
                      <div
                        className={`h-full rounded-full ${
                          task.status === 'done'
                            ? 'bg-emerald-500'
                            : task.status === 'in_progress'
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                        }`}
                        style={{
                          width: task.status === 'done' ? '100%' : '60%',
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-xs font-medium text-zinc-400">{duration}d</div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* D3 Advanced Visualization View */}
      {viewMode === 'd3-advanced' && (
        <TaskQueueVisualization
          tasks={filteredTasks}
          onTaskClick={(task) => navigate(`tasks/${task.id}`)}
        />
      )}

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={confirmBulkDelete}
        onCancel={() => setShowBulkDeleteModal(false)}
        title="Delete Multiple Tasks?"
        message={`This will permanently delete ${selectedTasks.size} task${selectedTasks.size > 1 ? 's' : ''}. This action cannot be undone.`}
        confirmLabel="Delete Tasks"
        variant="danger"
        requireTyping={true}
        confirmText="DELETE"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
