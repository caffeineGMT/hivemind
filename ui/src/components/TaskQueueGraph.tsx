import { useMemo, useState, useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  Node,
  Edge,
  Position,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { Task, Agent } from '../api';
import { Clock, Zap, TrendingUp, AlertCircle, CheckCircle2, Circle, Pause } from 'lucide-react';

interface TaskQueueGraphProps {
  tasks: Task[];
  agents: Agent[];
  onTaskClick?: (taskId: string) => void;
}

interface TaskMetrics {
  criticalPath: string[];
  estimatedCompletionDays: number;
  agentVelocity: { [agentId: string]: number };
  longestChain: number;
}

// Status colors
const STATUS_COLORS = {
  done: { bg: '#065f46', border: '#10b981', text: '#6ee7b7' },
  in_progress: { bg: '#78350f', border: '#f59e0b', text: '#fbbf24' },
  todo: { bg: '#1e3a8a', border: '#3b82f6', text: '#93c5fd' },
  backlog: { bg: '#374151', border: '#6b7280', text: '#9ca3af' },
  blocked: { bg: '#7f1d1d', border: '#ef4444', text: '#fca5a5' },
};

// Priority colors
const PRIORITY_COLORS = {
  urgent: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#6b7280',
};

// Custom Task Node Component
function TaskNode({ data }: { data: any }) {
  const { task, isOnCriticalPath, estimatedDays } = data;
  const statusStyle = STATUS_COLORS[task.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.backlog;

  const StatusIcon = {
    done: CheckCircle2,
    in_progress: Zap,
    todo: Circle,
    blocked: AlertCircle,
    backlog: Pause,
  }[task.status as keyof typeof STATUS_COLORS] || Circle;

  return (
    <div
      className="relative rounded-lg p-3 shadow-lg transition-all hover:shadow-xl"
      style={{
        backgroundColor: statusStyle.bg,
        borderWidth: isOnCriticalPath ? 3 : 1,
        borderStyle: 'solid',
        borderColor: isOnCriticalPath ? '#fbbf24' : statusStyle.border,
        minWidth: 200,
        maxWidth: 250,
      }}
    >
      {/* Critical path indicator */}
      {isOnCriticalPath && (
        <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-zinc-900">
          ★
        </div>
      )}

      {/* Task header */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <StatusIcon className="h-4 w-4 flex-shrink-0" style={{ color: statusStyle.text }} />
        <div
          className="h-2 w-2 flex-shrink-0 rounded-full"
          style={{ backgroundColor: PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] }}
        />
      </div>

      {/* Task title */}
      <h3 className="mb-1 text-sm font-semibold text-zinc-100 line-clamp-2">{task.title}</h3>

      {/* Task metadata */}
      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
        <span className="rounded bg-zinc-900/50 px-1.5 py-0.5" style={{ color: statusStyle.text }}>
          {task.status.replace('_', ' ')}
        </span>
        <span
          className="rounded px-1.5 py-0.5"
          style={{
            backgroundColor: PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] + '30',
            color: PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS],
          }}
        >
          {task.priority}
        </span>
      </div>

      {/* Estimated completion */}
      {estimatedDays > 0 && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-zinc-400">
          <Clock className="h-3 w-3" />
          <span>~{estimatedDays}d</span>
        </div>
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  taskNode: TaskNode,
};

// Dagre layout configuration
function getLayoutedElements(tasks: Task[], criticalPath: string[]) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 120 });

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeWidth = 250;
  const nodeHeight = 120;

  // Create nodes
  tasks.forEach((task) => {
    const isOnCriticalPath = criticalPath.includes(task.id);
    dagreGraph.setNode(task.id, { width: nodeWidth, height: nodeHeight });

    nodes.push({
      id: task.id,
      type: 'taskNode',
      data: {
        task,
        isOnCriticalPath,
        estimatedDays: task.status === 'done' ? 0 : Math.ceil(Math.random() * 5 + 1), // Mock estimation
      },
      position: { x: 0, y: 0 },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    });
  });

  // Create edges based on parent_id
  tasks.forEach((task) => {
    if (task.parent_id) {
      dagreGraph.setEdge(task.parent_id, task.id);

      const isOnCriticalPath =
        criticalPath.includes(task.parent_id) && criticalPath.includes(task.id);

      edges.push({
        id: `${task.parent_id}-${task.id}`,
        source: task.parent_id,
        target: task.id,
        type: 'smoothstep',
        animated: task.status === 'in_progress',
        style: {
          stroke: isOnCriticalPath ? '#fbbf24' : '#52525b',
          strokeWidth: isOnCriticalPath ? 3 : 1.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isOnCriticalPath ? '#fbbf24' : '#52525b',
        },
      });
    }
  });

  // Apply dagre layout
  dagre.layout(dagreGraph);

  // Apply computed positions
  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
  });

  return { nodes, edges };
}

// Calculate critical path using longest path algorithm
function calculateCriticalPath(tasks: Task[]): string[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const visited = new Set<string>();
  const distances = new Map<string, number>();
  const predecessors = new Map<string, string | null>();

  // Initialize all distances to 0
  tasks.forEach((t) => {
    distances.set(t.id, 0);
    predecessors.set(t.id, null);
  });

  // Find tasks with no dependencies (root nodes)
  const rootTasks = tasks.filter((t) => !t.parent_id);

  // DFS to find longest path
  function dfs(taskId: string, currentDist: number): number {
    if (visited.has(taskId)) {
      return distances.get(taskId) || 0;
    }

    visited.add(taskId);
    let maxDist = currentDist;

    // Find all children
    const children = tasks.filter((t) => t.parent_id === taskId);

    for (const child of children) {
      const childDist = dfs(child.id, currentDist + 1);
      if (childDist > maxDist) {
        maxDist = childDist;
        distances.set(taskId, maxDist);
      }

      // Update child's predecessor if this path is longer
      const currentChildDist = distances.get(child.id) || 0;
      if (currentDist + 1 > currentChildDist) {
        distances.set(child.id, currentDist + 1);
        predecessors.set(child.id, taskId);
      }
    }

    return maxDist;
  }

  // Run DFS from all root nodes
  rootTasks.forEach((root) => dfs(root.id, 0));

  // Find the task with maximum distance (end of critical path)
  let maxDistTask: string | null = null;
  let maxDist = -1;

  distances.forEach((dist, taskId) => {
    if (dist > maxDist) {
      maxDist = dist;
      maxDistTask = taskId;
    }
  });

  // Reconstruct path
  const path: string[] = [];
  let current: string | null = maxDistTask;

  while (current) {
    path.unshift(current);
    const predecessor = predecessors.get(current);
    current = (predecessor !== undefined && predecessor !== null) ? predecessor : null;
  }

  return path;
}

// Calculate task metrics
function calculateTaskMetrics(tasks: Task[], agents: Agent[]): TaskMetrics {
  const criticalPath = calculateCriticalPath(tasks);

  // Calculate longest chain
  const longestChain = criticalPath.length;

  // Calculate agent velocity (tasks completed per agent in the last 7 days)
  const agentVelocity: { [agentId: string]: number } = {};
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  agents.forEach((agent) => {
    const completedTasks = tasks.filter(
      (t) => t.assignee_id === agent.id && t.status === 'done'
    );
    agentVelocity[agent.id] = completedTasks.length / 7; // tasks per day
  });

  // Estimate completion time based on remaining tasks and average velocity
  const remainingTasks = tasks.filter((t) => t.status !== 'done').length;
  const avgVelocity = Object.values(agentVelocity).reduce((a, b) => a + b, 0) / agents.length || 0.5;
  const estimatedCompletionDays = remainingTasks > 0 ? Math.ceil(remainingTasks / Math.max(avgVelocity, 0.5)) : 0;

  return {
    criticalPath,
    estimatedCompletionDays,
    agentVelocity,
    longestChain,
  };
}

export default function TaskQueueGraph({ tasks, agents, onTaskClick }: TaskQueueGraphProps) {
  const [showStats, setShowStats] = useState(true);

  // Calculate metrics
  const metrics = useMemo(() => calculateTaskMetrics(tasks, agents), [tasks, agents]);

  // Generate layout
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(tasks, metrics.criticalPath),
    [tasks, metrics.criticalPath]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Update nodes and edges when tasks change
  useMemo(() => {
    const { nodes: newNodes, edges: newEdges } = getLayoutedElements(tasks, metrics.criticalPath);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [tasks, metrics.criticalPath, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onTaskClick) {
        onTaskClick(node.id);
      }
    },
    [onTaskClick]
  );

  // Calculate statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const blocked = tasks.filter((t) => t.status === 'blocked').length;
    const avgVelocity = Object.values(metrics.agentVelocity).reduce((a, b) => a + b, 0) / agents.length || 0;

    return {
      total,
      done,
      inProgress,
      blocked,
      completionPct: total > 0 ? Math.round((done / total) * 100) : 0,
      avgVelocity: avgVelocity.toFixed(2),
    };
  }, [tasks, agents, metrics.agentVelocity]);

  return (
    <div className="relative h-full w-full">
      {/* Stats Panel */}
      {showStats && (
        <div className="absolute left-4 top-4 z-10 space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/95 p-4 shadow-xl backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-100">Queue Analytics</h3>
            <button
              onClick={() => setShowStats(false)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              ×
            </button>
          </div>

          <div className="space-y-3">
            {/* Completion Progress */}
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Progress</span>
                <span className="font-semibold text-emerald-400">{stats.completionPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${stats.completionPct}%` }}
                />
              </div>
              <div className="mt-1 flex items-center gap-3 text-[10px] text-zinc-500">
                <span>{stats.done} done</span>
                <span>{stats.inProgress} in progress</span>
                {stats.blocked > 0 && <span className="text-red-400">{stats.blocked} blocked</span>}
              </div>
            </div>

            {/* Critical Path */}
            <div className="rounded-lg border border-amber-900/30 bg-amber-950/20 p-2">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-amber-400">
                <Zap className="h-3.5 w-3.5" />
                Critical Path
              </div>
              <div className="text-xs text-zinc-400">
                {metrics.longestChain} task{metrics.longestChain !== 1 ? 's' : ''} in longest chain
              </div>
            </div>

            {/* Estimated Completion */}
            <div className="flex items-center gap-2 text-xs">
              <Clock className="h-4 w-4 text-blue-400" />
              <div>
                <div className="text-zinc-400">Est. Completion</div>
                <div className="font-semibold text-zinc-200">
                  ~{metrics.estimatedCompletionDays} day{metrics.estimatedCompletionDays !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Agent Velocity */}
            <div className="flex items-center gap-2 text-xs">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              <div>
                <div className="text-zinc-400">Avg Velocity</div>
                <div className="font-semibold text-zinc-200">{stats.avgVelocity} tasks/day</div>
              </div>
            </div>

            {/* Legend */}
            <div className="border-t border-zinc-800 pt-2">
              <div className="mb-1 text-[10px] font-medium text-zinc-500">LEGEND</div>
              <div className="space-y-1 text-[10px]">
                <div className="flex items-center gap-2">
                  <div className="flex h-3 w-3 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-zinc-900">
                    ★
                  </div>
                  <span className="text-zinc-400">Critical path</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="text-zinc-400">Done</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="text-zinc-400">In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-zinc-400">Todo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-zinc-400">Blocked</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show stats button when hidden */}
      {!showStats && (
        <button
          onClick={() => setShowStats(true)}
          className="absolute left-4 top-4 z-10 rounded-lg bg-zinc-800 p-2 text-zinc-400 shadow-lg hover:bg-zinc-700 hover:text-zinc-200"
        >
          <TrendingUp className="h-4 w-4" />
        </button>
      )}

      {/* React Flow Graph */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        className="bg-zinc-950"
      >
        <Background color="#27272a" gap={20} size={1} />
        <Controls className="rounded-lg border border-zinc-700 bg-zinc-800" />
        <MiniMap
          className="rounded-lg border border-zinc-700 bg-zinc-900"
          nodeColor={(node) => {
            const task = tasks.find((t) => t.id === node.id);
            if (!task) return '#374151';
            const statusStyle = STATUS_COLORS[task.status as keyof typeof STATUS_COLORS];
            return statusStyle?.border || '#6b7280';
          }}
          maskColor="rgba(0, 0, 0, 0.7)"
        />
      </ReactFlow>
    </div>
  );
}
