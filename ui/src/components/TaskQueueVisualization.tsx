import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Task } from '../api';

interface TaskNode extends d3.SimulationNodeDatum {
  id: string;
  task: Task;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  depth: number;
  criticalPath: boolean;
  estimatedDuration: number;
}

interface TaskLink extends d3.SimulationLinkDatum<TaskNode> {
  source: TaskNode;
  target: TaskNode;
  criticalPath: boolean;
}

interface Props {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  height?: number;
}

const STATUS_COLORS = {
  backlog: '#3b82f6',
  todo: '#8b5cf6',
  in_progress: '#f59e0b',
  done: '#10b981',
  blocked: '#ef4444',
} as const;

const PRIORITY_COLORS = {
  urgent: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#84cc16',
} as const;

export default function TaskQueueVisualization({ tasks, onTaskClick, height = 700 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'dag' | 'force' | 'timeline'>('dag');

  // Calculate task metrics
  const { nodes, links, criticalPath, estimatedCompletion } = useMemo(() => {
    // Build dependency graph
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const nodeMap = new Map<string, TaskNode>();

    // Estimate duration for each task (based on priority and status)
    const estimateDuration = (task: Task): number => {
      const baseDuration = {
        urgent: 2,
        high: 4,
        medium: 8,
        low: 16,
      }[task.priority] || 8;

      if (task.status === 'done') return 0;
      if (task.status === 'in_progress') return baseDuration * 0.5;
      return baseDuration;
    };

    // Create nodes with depth calculation
    const calculateDepth = (taskId: string, visited = new Set<string>()): number => {
      if (visited.has(taskId)) return 0; // Cycle detection
      visited.add(taskId);

      const task = taskMap.get(taskId);
      if (!task || !task.parent_id) return 0;

      return 1 + calculateDepth(task.parent_id, visited);
    };

    tasks.forEach(task => {
      nodeMap.set(task.id, {
        id: task.id,
        task,
        depth: calculateDepth(task.id),
        criticalPath: false,
        estimatedDuration: estimateDuration(task),
      });
    });

    // Create links
    const linksList: TaskLink[] = tasks
      .filter(t => t.parent_id && nodeMap.has(t.parent_id))
      .map(t => ({
        source: nodeMap.get(t.parent_id!)!,
        target: nodeMap.get(t.id)!,
        criticalPath: false,
      }));

    // Calculate critical path using longest path algorithm
    const findCriticalPath = () => {
      const nodeArray = Array.from(nodeMap.values());
      const distances = new Map<string, number>();
      const parents = new Map<string, string>();

      // Initialize distances
      nodeArray.forEach(n => distances.set(n.id, n.estimatedDuration));

      // Topological sort with depth-first search
      const visited = new Set<string>();
      const stack: string[] = [];

      const dfs = (nodeId: string) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);

        const children = linksList.filter(l => l.source.id === nodeId);
        children.forEach(link => dfs(link.target.id));

        stack.push(nodeId);
      };

      nodeArray.forEach(n => dfs(n.id));

      // Calculate longest path
      while (stack.length > 0) {
        const nodeId = stack.pop()!;
        const node = nodeMap.get(nodeId)!;
        const incomingEdges = linksList.filter(l => l.target.id === nodeId);

        incomingEdges.forEach(edge => {
          const sourceId = edge.source.id;
          const newDist = distances.get(sourceId)! + node.estimatedDuration;
          if (newDist > distances.get(nodeId)!) {
            distances.set(nodeId, newDist);
            parents.set(nodeId, sourceId);
          }
        });
      }

      // Find the node with maximum distance
      let maxDist = 0;
      let endNode = '';
      distances.forEach((dist, nodeId) => {
        if (dist > maxDist) {
          maxDist = dist;
          endNode = nodeId;
        }
      });

      // Backtrack to find critical path
      const criticalNodes = new Set<string>();
      let current = endNode;
      while (current) {
        criticalNodes.add(current);
        current = parents.get(current) || '';
      }

      // Mark critical path nodes and links
      nodeArray.forEach(n => {
        n.criticalPath = criticalNodes.has(n.id);
      });

      linksList.forEach(l => {
        l.criticalPath = criticalNodes.has(l.source.id) && criticalNodes.has(l.target.id);
      });

      return maxDist;
    };

    const totalEstimatedHours = findCriticalPath();

    return {
      nodes: Array.from(nodeMap.values()),
      links: linksList,
      criticalPath: Array.from(nodeMap.values()).filter(n => n.criticalPath),
      estimatedCompletion: totalEstimatedHours,
    };
  }, [tasks]);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    if (selectedView === 'dag') {
      // DAG layout - hierarchical tree
      const maxDepth = d3.max(nodes, n => n.depth) || 0;
      const levelWidth = innerWidth / (maxDepth + 1);
      const nodesPerLevel = new Map<number, number>();

      nodes.forEach(n => {
        nodesPerLevel.set(n.depth, (nodesPerLevel.get(n.depth) || 0) + 1);
      });

      const levelCounters = new Map<number, number>();

      nodes.forEach(n => {
        const levelCount = nodesPerLevel.get(n.depth) || 1;
        const levelIndex = levelCounters.get(n.depth) || 0;
        levelCounters.set(n.depth, levelIndex + 1);

        n.x = n.depth * levelWidth + levelWidth / 2;
        n.y = (levelIndex + 1) * (innerHeight / (levelCount + 1));
      });

      // Draw links
      const link = g
        .append('g')
        .selectAll('path')
        .data(links)
        .join('path')
        .attr('d', (d: TaskLink) => {
          const source = d.source as TaskNode;
          const target = d.target as TaskNode;
          return `M${source.x},${source.y} L${target.x},${target.y}`;
        })
        .attr('stroke', (d: TaskLink) => (d.criticalPath ? '#dc2626' : '#52525b'))
        .attr('stroke-width', (d: TaskLink) => (d.criticalPath ? 3 : 1.5))
        .attr('fill', 'none')
        .attr('marker-end', (d: TaskLink) => (d.criticalPath ? 'url(#arrowhead-critical)' : 'url(#arrowhead)'));

      // Add arrowhead markers
      const defs = svg.append('defs');

      defs
        .append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .append('path')
        .attr('d', 'M 0,-5 L 10,0 L 0,5')
        .attr('fill', '#52525b');

      defs
        .append('marker')
        .attr('id', 'arrowhead-critical')
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .append('path')
        .attr('d', 'M 0,-5 L 10,0 L 0,5')
        .attr('fill', '#dc2626');

    } else if (selectedView === 'force') {
      // Force-directed layout
      const simulation = d3
        .forceSimulation<TaskNode>(nodes)
        .force(
          'link',
          d3.forceLink<TaskNode, TaskLink>(links).id(d => d.id).distance(100)
        )
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(innerWidth / 2, innerHeight / 2))
        .force('collision', d3.forceCollide().radius(40));

      const link = g
        .append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', (d: TaskLink) => (d.criticalPath ? '#dc2626' : '#52525b'))
        .attr('stroke-width', (d: TaskLink) => (d.criticalPath ? 3 : 1.5));

      const node = g
        .append('g')
        .selectAll('g')
        .data(nodes)
        .join('g')
        .call(d3.drag<any, TaskNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }));

      node
        .append('circle')
        .attr('r', 30)
        .attr('fill', (d: TaskNode) => STATUS_COLORS[d.task.status as keyof typeof STATUS_COLORS] || '#3b82f6')
        .attr('stroke', (d: TaskNode) => d.criticalPath ? '#dc2626' : '#71717a')
        .attr('stroke-width', (d: TaskNode) => d.criticalPath ? 4 : 2)
        .attr('opacity', 0.8)
        .on('mouseenter', (_, d) => setHoveredTask(d.id))
        .on('mouseleave', () => setHoveredTask(null))
        .on('click', (_, d) => onTaskClick?.(d.task));

      node
        .append('text')
        .text((d: TaskNode) => d.task.title.slice(0, 3))
        .attr('text-anchor', 'middle')
        .attr('dy', '.35em')
        .attr('fill', 'white')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .style('pointer-events', 'none');

      simulation.on('tick', () => {
        link
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);

        node.attr('transform', (d: TaskNode) => `translate(${d.x},${d.y})`);
      });

      return () => {
        simulation.stop();
      };
    } else {
      // Timeline view - horizontal gantt-style
      const startDate = new Date();
      let currentOffset = 0;

      nodes
        .sort((a, b) => a.depth - b.depth)
        .forEach((n, i) => {
          n.x = currentOffset * 80 + 50;
          n.y = i * 60 + 30;
          currentOffset += n.estimatedDuration;
        });
    }

    // Draw nodes (for DAG and timeline views)
    if (selectedView !== 'force' as any) {
      const node = g
        .append('g')
        .selectAll('g')
        .data(nodes)
        .join('g')
        .attr('transform', (d: TaskNode) => `translate(${d.x},${d.y})`);

      node
        .append('rect')
        .attr('x', -60)
        .attr('y', -25)
        .attr('width', 120)
        .attr('height', 50)
        .attr('rx', 8)
        .attr('fill', (d: TaskNode) => STATUS_COLORS[d.task.status as keyof typeof STATUS_COLORS] || '#3b82f6')
        .attr('stroke', (d: TaskNode) => {
          if (d.criticalPath) return '#dc2626';
          return PRIORITY_COLORS[d.task.priority as keyof typeof PRIORITY_COLORS] || '#71717a';
        })
        .attr('stroke-width', (d: TaskNode) => d.criticalPath ? 4 : 2)
        .attr('opacity', 0.9)
        .on('mouseenter', (_, d) => setHoveredTask(d.id))
        .on('mouseleave', () => setHoveredTask(null))
        .on('click', (_, d) => onTaskClick?.(d.task));

      node
        .append('text')
        .text((d: TaskNode) => d.task.title.slice(0, 15))
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.3em')
        .attr('fill', 'white')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .style('pointer-events', 'none');

      node
        .append('text')
        .text((d: TaskNode) => `${d.task.status} · ${d.estimatedDuration}h`)
        .attr('text-anchor', 'middle')
        .attr('dy', '1.2em')
        .attr('fill', 'white')
        .attr('font-size', '9px')
        .attr('opacity', 0.8)
        .style('pointer-events', 'none');

      // Critical path indicator
      if (selectedView === 'dag') {
        node
          .filter((d: TaskNode) => d.criticalPath)
          .append('text')
          .text('★')
          .attr('x', 50)
          .attr('y', -15)
          .attr('fill', '#dc2626')
          .attr('font-size', '16px')
          .style('pointer-events', 'none');
      }
    }

    // Add tooltip
    const tooltip = d3.select('body').selectAll('.d3-tooltip').data([null]);
    tooltip
      .enter()
      .append('div')
      .attr('class', 'd3-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'rgba(0, 0, 0, 0.9)')
      .style('color', 'white')
      .style('padding', '8px 12px')
      .style('border-radius', '6px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');

  }, [nodes, links, selectedView, height, onTaskClick]);

  return (
    <div className="space-y-4">
      {/* Stats header */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Total Tasks</p>
          <p className="mt-1 text-2xl font-bold text-zinc-100">{tasks.length}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Critical Path</p>
          <p className="mt-1 text-2xl font-bold text-red-400">{criticalPath.length}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Est. Completion</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">{estimatedCompletion.toFixed(1)}h</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Avg Velocity</p>
          <p className="mt-1 text-2xl font-bold text-blue-400">
            {tasks.length > 0 ? (estimatedCompletion / tasks.length).toFixed(1) : 0}h
          </p>
        </div>
      </div>

      {/* View selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSelectedView('dag')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            selectedView === 'dag'
              ? 'bg-amber-500 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          DAG View
        </button>
        <button
          onClick={() => setSelectedView('force')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            selectedView === 'force'
              ? 'bg-amber-500 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Force Graph
        </button>
        <button
          onClick={() => setSelectedView('timeline')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            selectedView === 'timeline'
              ? 'bg-amber-500 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Timeline
        </button>
      </div>

      {/* Legend */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
        <p className="mb-2 text-xs font-medium text-zinc-400">Legend</p>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-zinc-500">Backlog</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-purple-500" />
            <span className="text-zinc-500">Todo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-amber-500" />
            <span className="text-zinc-500">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="text-zinc-500">Done</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-6 rounded border-2 border-red-600" />
            <span className="text-zinc-500">Critical Path</span>
          </div>
        </div>
      </div>

      {/* SVG canvas */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950">
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          className="overflow-visible"
          style={{ cursor: 'grab' }}
        />
      </div>

      {/* Hovered task info */}
      {hoveredTask && (
        <div className="fixed bottom-4 right-4 max-w-xs rounded-lg border border-zinc-700 bg-zinc-900 p-4 shadow-xl">
          {nodes.find(n => n.id === hoveredTask) && (
            <>
              <p className="text-sm font-bold text-zinc-100">
                {nodes.find(n => n.id === hoveredTask)!.task.title}
              </p>
              <div className="mt-2 space-y-1 text-xs text-zinc-400">
                <p>Status: {nodes.find(n => n.id === hoveredTask)!.task.status}</p>
                <p>Priority: {nodes.find(n => n.id === hoveredTask)!.task.priority}</p>
                <p>Estimated: {nodes.find(n => n.id === hoveredTask)!.estimatedDuration}h</p>
                {nodes.find(n => n.id === hoveredTask)!.criticalPath && (
                  <p className="font-bold text-red-400">⚠️ Critical Path</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
