import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowLeft, Send, MessageSquare, User, Bot } from 'lucide-react';
import { api } from '../api';
import { StatusBadge } from '../components/StatusBadge';

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['taskDetail', taskId],
    queryFn: () => api.getTaskDetail(taskId!),
    refetchInterval: 3000,
    enabled: !!taskId,
  });

  const handleComment = async () => {
    if (!comment.trim() || !taskId) return;
    setSending(true);
    await api.addComment(taskId, comment);
    setComment('');
    setSending(false);
    queryClient.invalidateQueries({ queryKey: ['taskDetail', taskId] });
  };

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
      </div>
    );
  }

  const { task, comments } = data;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="../tasks"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/60 text-zinc-400 transition hover:bg-zinc-700/60 hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-zinc-100">{task.title}</h2>
          <div className="mt-1 flex items-center gap-3">
            <StatusBadge status={task.status} />
            <span className="text-xs text-zinc-500">Priority: {task.priority}</span>
            <span className="font-mono text-xs text-zinc-600">{task.id.slice(0, 8)}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-zinc-300">Description</h3>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
          {task.description || 'No description'}
        </p>
      </div>

      {/* Result */}
      {task.result && (
        <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/10 p-4">
          <h3 className="mb-2 text-sm font-semibold text-emerald-400">Result</h3>
          <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-400">
            {task.result}
          </p>
        </div>
      )}

      {/* Comments */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30">
        <div className="border-b border-zinc-800/40 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
            <MessageSquare className="h-4 w-4" />
            Comments
            <span className="text-xs font-normal text-zinc-600">({comments.length})</span>
          </h3>
          <p className="mt-0.5 text-xs text-zinc-600">
            Leave comments for agents to pick up on their next heartbeat
          </p>
        </div>

        <div className="max-h-[400px] divide-y divide-zinc-800/20 overflow-y-auto">
          {comments.length === 0 ? (
            <div className="p-6 text-center text-sm text-zinc-600">
              No comments yet
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3 px-4 py-3">
                <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                  c.author === 'user' ? 'bg-amber-950/40' : 'bg-blue-950/40'
                }`}>
                  {c.author === 'user' ? (
                    <User className="h-3.5 w-3.5 text-amber-400" />
                  ) : (
                    <Bot className="h-3.5 w-3.5 text-blue-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-300">
                      {c.author === 'user' ? 'You' : c.author}
                    </span>
                    <span className="text-[10px] text-zinc-600">{c.created_at}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-400">{c.message}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment input */}
        <div className="flex gap-2 border-t border-zinc-800/40 p-3">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleComment()}
            placeholder="Leave a comment for the agent..."
            className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition focus:border-amber-600/50"
          />
          <button
            onClick={handleComment}
            disabled={sending || !comment.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700 disabled:opacity-40"
          >
            <Send className="h-3 w-3" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
