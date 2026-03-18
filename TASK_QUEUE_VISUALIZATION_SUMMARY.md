# Task Queue Visualization - Advanced Dependency Graph

## Overview
Built a production-ready task queue visualization system with interactive dependency graph (DAG), critical path analysis, agent velocity tracking, and estimated completion times.

## Components Created

### 1. TaskQueueGraph Component (`ui/src/components/TaskQueueGraph.tsx`)
Advanced React Flow-based visualization with:
- **DAG Layout Algorithm**: Uses Dagre for hierarchical graph layout
- **Critical Path Calculation**: Identifies longest dependency chain with visual indicators (⭐ badges)
- **Custom Task Nodes**: Color-coded by status with rich metadata display
- **Status Colors**:
  - ✅ Done: Green (#065f46)
  - ⚡ In Progress: Amber (#78350f) with animated edges
  - 🔵 Todo: Blue (#1e3a8a)
  - ⏸️  Backlog: Gray (#374151)
  - 🚫 Blocked: Red (#7f1d1d)
- **Priority Indicators**: Color-coded dots (urgent=red, high=orange, medium=blue, low=gray)
- **Estimated Completion**: Shows ~Xd for each task
- **Interactive Analytics Panel**:
  - Progress percentage with visual bar
  - Critical path length (longest chain)
  - Estimated completion time in days
  - Average agent velocity (tasks/day)
  - Color-coded legend
- **Interactive Features**:
  - Click nodes to view task details
  - Pan, zoom, and fit-to-view controls
  - MiniMap for navigation
  - Real-time updates via React Query

### 2. Backend API Endpoint (`src/server.js`)
New `/api/companies/:id/task-metrics` endpoint providing:
- **Agent Velocity**: Tasks completed per agent per day (7-day rolling window)
- **Status Distribution**: Count by status (done, in_progress, todo, backlog, blocked)
- **Priority Distribution**: Count by priority level
- **Max Dependency Depth**: Longest parent-child chain
- **Estimated Completion**: Days until all tasks complete based on velocity
- **Average Velocity**: Team-wide tasks per day metric

### 3. Integration with Tasks Page (`ui/src/pages/Tasks.tsx`)
Enhanced existing Tasks page:
- Added navigation hook for task click handling
- Replaced basic graph view with advanced TaskQueueGraph
- Maintains all existing features (filters, bulk actions, list/timeline views)
- 700px height container with proper overflow handling

## Technical Implementation

### Dependencies Added
- `dagre`: Graph layout library for DAG visualization
- `@types/dagre`: TypeScript definitions

### Key Algorithms

#### Critical Path Calculation
```
1. Build task dependency graph
2. DFS from root nodes (tasks with no parents)
3. Track longest distance to each node
4. Reconstruct path from deepest node back to root
5. Highlight all nodes/edges in critical path with amber color
```

#### Agent Velocity
```
- Filter tasks by assignee_id and status='done'
- Filter by updated_at within last 7 days
- Calculate tasksPerDay = completedTasks / 7
- Aggregate across all agents for team velocity
```

#### Estimated Completion
```
remainingTasks = tasks where status != 'done'
avgVelocity = sum(agent velocities) / agentCount
estimatedDays = ceil(remainingTasks / max(avgVelocity, 0.5))
```

### Layout Strategy
- **Dagre Configuration**:
  - Direction: Top-to-Bottom (TB)
  - Node separation: 80px
  - Rank separation: 120px
  - Node size: 250x120px
- **React Flow Features**:
  - Smooth step edges for dependencies
  - Animated edges for in-progress tasks
  - Arrow markers on edges
  - Background grid pattern
  - Mini-map for large graphs

## User Experience

### Visual Indicators
1. **Critical Path**: Gold star badges and thick amber edges
2. **Status Icons**:
   - CheckCircle2 for done
   - Zap for in_progress
   - Circle for todo
   - AlertCircle for blocked
   - Pause for backlog
3. **Priority Dots**: Small colored circles in top-right of nodes
4. **Completion Estimates**: Clock icon with "~Xd" label

### Analytics Panel
Collapsible panel showing:
- Overall progress bar with percentage
- Critical path info in amber box
- Estimated completion with calendar icon
- Average velocity with trending icon
- Interactive legend for status colors
- Toggle button to minimize/expand

### Performance
- Memoized calculations for critical path and layout
- React Flow optimized for 1000+ nodes
- Dagre layout cached until tasks change
- Real-time updates via WebSocket integration

## Data Flow

```
Tasks.tsx
  ↓ (fetches tasks & agents via React Query)
TaskQueueGraph
  ↓ (calculates metrics)
calculateTaskMetrics() → criticalPath, velocity, estimates
  ↓
getLayoutedElements() → Dagre layout with positions
  ↓
ReactFlow → Rendered interactive graph
```

## Backend API Response Example

```json
{
  "agentVelocity": {
    "agent-uuid-1": {
      "name": "Engineering Agent",
      "tasksPerDay": "2.14",
      "totalCompleted": 15
    }
  },
  "statusDistribution": {
    "done": 25,
    "in_progress": 8,
    "todo": 12,
    "backlog": 30,
    "blocked": 2
  },
  "priorityDistribution": {
    "urgent": 5,
    "high": 15,
    "medium": 35,
    "low": 22
  },
  "maxDependencyDepth": 7,
  "totalTasks": 77,
  "remainingTasks": 52,
  "avgVelocity": "1.83",
  "estimatedCompletionDays": 28
}
```

## Usage

### For Users
1. Navigate to Tasks page in Hivemind dashboard
2. Click the "Graph" view button (Network icon)
3. View interactive dependency graph with:
   - Nodes representing tasks (color-coded by status)
   - Edges showing parent-child dependencies
   - Critical path highlighted in gold
   - Analytics panel with key metrics
4. Click any task node to view details
5. Use controls to zoom, pan, and reset view
6. Use minimap for navigation in large graphs

### For Developers
```typescript
import TaskQueueGraph from '../components/TaskQueueGraph';

<TaskQueueGraph
  tasks={filteredTasks}
  agents={agents}
  onTaskClick={(taskId) => navigate(`tasks/${taskId}`)}
/>
```

## Future Enhancements
- Export graph as PNG/SVG
- Gantt chart integration for timeline view
- Resource allocation visualization
- Real-time agent assignment suggestions
- Predicted bottleneck detection
- Historical velocity trends
- Custom node templates per task type

## Files Modified
1. `ui/src/components/TaskQueueGraph.tsx` (NEW)
2. `ui/src/pages/Tasks.tsx` (UPDATED)
3. `src/server.js` (UPDATED - added task-metrics endpoint)
4. `ui/package.json` (UPDATED - added dagre dependency)

## Testing
- Tested with 0 tasks (empty state)
- Tested with simple linear chains
- Tested with complex branching dependencies
- Tested with circular reference prevention
- Tested critical path with multiple root nodes
- Verified real-time updates via WebSocket
- Confirmed responsive design at various screen sizes

## Production Readiness
✅ TypeScript type safety
✅ Error handling for edge cases
✅ Performance optimized with memoization
✅ Accessible UI with ARIA labels
✅ Responsive design
✅ Real-time updates
✅ Production-quality code (no TODOs or placeholders)

## Decision Log
1. **Dagre vs Force-Directed Layout**: Chose Dagre for deterministic, hierarchical layout better suited for task dependencies
2. **Critical Path Algorithm**: Used longest-path DFS instead of PERT/CPM for simplicity and performance
3. **Velocity Window**: 7-day rolling window balances recency with statistical significance
4. **Completion Estimate**: Conservative floor of 0.5 tasks/day prevents division by zero and unrealistic estimates
5. **Color Scheme**: Followed existing dashboard zinc/amber theme for consistency
6. **Node Size**: 250x120px provides enough space for title + metadata without overwhelming the view
7. **Edge Animation**: Applied only to in_progress tasks to draw attention to active work
