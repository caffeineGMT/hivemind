import { useState } from 'react';
import {
  AlertCircle,
  XCircle,
  AlertTriangle,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { AppError, formatErrorForDisplay } from '../utils/errors';

const severityIcons = {
  critical: XCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

interface ErrorMessageProps {
  error: AppError;
  onDismiss?: () => void;
  className?: string;
}

export default function ErrorMessage({ error, onDismiss, className = '' }: ErrorMessageProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const { iconColor, bgColor, borderColor } = formatErrorForDisplay(error);
  const Icon = severityIcons[error.severity];

  const handleAction = async (actionFn: () => void | Promise<void>) => {
    setIsExecuting(true);
    try {
      await actionFn();
    } catch (err) {
      console.error('Recovery action failed:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`rounded-lg border ${borderColor} ${bgColor} p-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <Icon
          className={`h-5 w-5 shrink-0 ${iconColor} mt-0.5`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-zinc-200">{error.title}</h3>
          <p className="mt-1 text-sm text-zinc-400">{error.message}</p>

          {/* Recovery Actions */}
          {error.recoveryActions && error.recoveryActions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {error.recoveryActions.map((action, idx) => {
                const buttonStyle =
                  action.variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : action.variant === 'secondary'
                    ? 'bg-zinc-800/60 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60'
                    : 'bg-blue-600 hover:bg-blue-700 text-white';

                return (
                  <button
                    key={idx}
                    onClick={() => handleAction(action.action)}
                    disabled={isExecuting}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${buttonStyle}`}
                  >
                    {isExecuting && (
                      <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
                    )}
                    {action.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Retry countdown */}
          {error.retryAfter && (
            <p className="mt-2 text-xs text-zinc-500">
              Automatic retry in {error.retryAfter} seconds
            </p>
          )}

          {/* Technical Details (expandable) */}
          {error.technicalDetails && (
            <div className="mt-3">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition"
              >
                {showDetails ? (
                  <ChevronUp className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-3 w-3" aria-hidden="true" />
                )}
                {showDetails ? 'Hide' : 'Show'} technical details
              </button>
              {showDetails && (
                <pre className="mt-2 max-h-32 overflow-auto rounded bg-black/40 p-2 text-[10px] text-zinc-400 font-mono">
                  {error.technicalDetails}
                </pre>
              )}
            </div>
          )}

          {/* Context info */}
          {error.context && Object.keys(error.context).length > 0 && showDetails && (
            <div className="mt-2 rounded bg-black/40 p-2 text-[10px] text-zinc-500">
              <p className="font-semibold mb-1">Context:</p>
              {Object.entries(error.context).map(([key, value]) => (
                <p key={key}>
                  <span className="text-zinc-600">{key}:</span>{' '}
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="shrink-0 rounded p-1 text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300 transition"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Inline Error Variant ───────────────────────────────────────────

interface InlineErrorProps {
  title: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function InlineError({ title, message, onRetry, className = '' }: InlineErrorProps) {
  return (
    <div
      role="alert"
      className={`rounded-lg border border-red-900/50 bg-red-950/20 p-3 ${className}`}
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-red-400">{title}</p>
          <p className="mt-0.5 text-xs text-red-300/80">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-xs text-red-300 hover:text-red-200 underline underline-offset-2"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Empty State Variant ────────────────────────────────────────────

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, message, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      {icon && <div className="mb-3 text-zinc-600" aria-hidden="true">{icon}</div>}
      <h3 className="text-sm font-semibold text-zinc-400">{title}</h3>
      <p className="mt-1 text-xs text-zinc-500 max-w-sm">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 transition"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
