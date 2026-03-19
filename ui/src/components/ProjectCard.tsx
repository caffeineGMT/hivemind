import { FolderKanban, CheckCircle2, Clock, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from './StatusBadge';
import { Project } from '../api';
import { useTouchRipple } from './TouchRipple';

export default function ProjectCard({ project }: { project: Project }) {
  const { createRipple, rippleElements } = useTouchRipple();
  const children = project.childTasks || [];
  const done = children.filter((t) => t.status === 'done').length;
  const total = children.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 transition-all duration-200 active:scale-[0.98] hover:border-zinc-700/60 md:active:scale-100"
      onTouchStart={createRipple}
    >
      {rippleElements}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <FolderKanban className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-zinc-200">{project.title}</h3>
        </div>
        <StatusBadge status={project.status} />
      </div>

      {project.description && (
        <p className="mt-2 line-clamp-2 text-xs text-zinc-500">{project.description as string}</p>
      )}

      {/* Mini progress */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-[11px]">
          <span className="text-zinc-500">{done}/{total} tasks</span>
          <span className="tabular-nums text-zinc-400">{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Child tasks — clickable */}
      {children.length > 0 && (
        <div className="mt-3 space-y-0.5 border-t border-zinc-800/40 pt-3">
          {children.slice(0, 6).map((task) => (
            <Link
              key={task.id}
              to={`../tasks/${task.id}`}
              className="flex min-h-[44px] items-center gap-2 rounded-md px-1.5 py-2 text-xs transition hover:bg-zinc-800/40 md:min-h-0 md:py-1"
            >
              {task.status === 'done' ? (
                <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
              ) : task.status === 'in_progress' ? (
                <Clock className="h-3 w-3 shrink-0 text-amber-400" />
              ) : (
                <Circle className="h-3 w-3 shrink-0 text-zinc-600" />
              )}
              <span className={`truncate ${task.status === 'done' ? 'text-zinc-500 line-through' : 'text-zinc-400'}`}>
                {task.title}
              </span>
            </Link>
          ))}
          {children.length > 6 && (
            <p className="px-1.5 text-[11px] text-zinc-600">+{children.length - 6} more</p>
          )}
        </div>
      )}
    </div>
  );
}
