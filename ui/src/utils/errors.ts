// ── Error Types & Classification ──────────────────────────────────

export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';
export type ErrorCategory =
  | 'network'
  | 'websocket'
  | 'api'
  | 'agent'
  | 'task'
  | 'auth'
  | 'rate_limit'
  | 'validation'
  | 'unknown';

export interface RecoveryAction {
  label: string;
  action: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface AppError {
  id: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  title: string;
  message: string;
  technicalDetails?: string;
  timestamp: number;
  recoveryActions?: RecoveryAction[];
  canRetry?: boolean;
  retryAfter?: number; // seconds
  context?: Record<string, unknown>;
}

// ── Error Classification ───────────────────────────────────────────

export function classifyError(error: unknown): AppError {
  const timestamp = Date.now();
  const id = `error-${timestamp}-${Math.random().toString(36).slice(2, 9)}`;

  // Handle rate limiting (429)
  if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 429) {
    const retryAfter = ('retryAfter' in error && typeof error.retryAfter === 'number')
      ? error.retryAfter
      : 60;

    return {
      id,
      severity: 'warning',
      category: 'rate_limit',
      title: 'Rate Limit Exceeded',
      message: `Too many requests. The server is temporarily limiting your activity to prevent overload.`,
      technicalDetails: error instanceof Error ? error.message : String(error),
      timestamp,
      canRetry: true,
      retryAfter,
      recoveryActions: [
        {
          label: `Wait ${retryAfter}s and retry`,
          action: () => new Promise(resolve => setTimeout(resolve, retryAfter * 1000)),
          variant: 'primary',
        },
      ],
    };
  }

  // Handle network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      id,
      severity: 'error',
      category: 'network',
      title: 'Connection Failed',
      message: 'Unable to reach the server. Check your internet connection or verify the server is running.',
      technicalDetails: error.message,
      timestamp,
      canRetry: true,
      recoveryActions: [
        {
          label: 'Retry connection',
          action: () => window.location.reload(),
          variant: 'primary',
        },
        {
          label: 'Check server status',
          action: () => window.open('/api/health', '_blank'),
          variant: 'secondary',
        },
      ],
    };
  }

  // Handle API errors
  if (error instanceof Error && error.message.startsWith('API error:')) {
    const statusMatch = error.message.match(/API error: (\d+)/);
    const statusCode = statusMatch ? parseInt(statusMatch[1]) : 500;

    if (statusCode === 404) {
      return {
        id,
        severity: 'warning',
        category: 'api',
        title: 'Resource Not Found',
        message: 'The requested resource could not be found. It may have been deleted or moved.',
        technicalDetails: error.message,
        timestamp,
        canRetry: false,
        recoveryActions: [
          {
            label: 'Go back',
            action: () => window.history.back(),
            variant: 'secondary',
          },
        ],
      };
    }

    if (statusCode === 403) {
      return {
        id,
        severity: 'error',
        category: 'auth',
        title: 'Access Denied',
        message: 'You do not have permission to perform this action.',
        technicalDetails: error.message,
        timestamp,
        canRetry: false,
      };
    }

    if (statusCode >= 500) {
      return {
        id,
        severity: 'critical',
        category: 'api',
        title: 'Server Error',
        message: 'The server encountered an error processing your request. This has been logged and will be investigated.',
        technicalDetails: error.message,
        timestamp,
        canRetry: true,
        recoveryActions: [
          {
            label: 'Retry request',
            action: () => window.location.reload(),
            variant: 'primary',
          },
        ],
      };
    }
  }

  // Handle WebSocket errors
  if (error instanceof Error && error.message.includes('WebSocket')) {
    return {
      id,
      severity: 'error',
      category: 'websocket',
      title: 'Real-time Connection Lost',
      message: 'The live update connection was interrupted. Attempting to reconnect automatically.',
      technicalDetails: error.message,
      timestamp,
      canRetry: true,
      recoveryActions: [
        {
          label: 'Force reconnect',
          action: () => window.location.reload(),
          variant: 'primary',
        },
      ],
    };
  }

  // Handle agent errors
  if (error instanceof Error && (
    error.message.includes('agent') ||
    error.message.includes('Agent')
  )) {
    return {
      id,
      severity: 'error',
      category: 'agent',
      title: 'Agent Operation Failed',
      message: 'The agent encountered an error and could not complete the operation.',
      technicalDetails: error.message,
      timestamp,
      canRetry: true,
      recoveryActions: [
        {
          label: 'Restart agent',
          action: () => {}, // Will be provided by component
          variant: 'primary',
        },
        {
          label: 'View agent logs',
          action: () => {}, // Will be provided by component
          variant: 'secondary',
        },
      ],
    };
  }

  // Handle task errors
  if (error instanceof Error && (
    error.message.includes('task') ||
    error.message.includes('Task')
  )) {
    return {
      id,
      severity: 'warning',
      category: 'task',
      title: 'Task Failed',
      message: 'The task could not be completed. Review the error details and try again.',
      technicalDetails: error.message,
      timestamp,
      canRetry: true,
      recoveryActions: [
        {
          label: 'Retry task',
          action: () => {}, // Will be provided by component
          variant: 'primary',
        },
        {
          label: 'View task details',
          action: () => {}, // Will be provided by component
          variant: 'secondary',
        },
      ],
    };
  }

  // Generic error fallback
  return {
    id,
    severity: 'error',
    category: 'unknown',
    title: 'Something Went Wrong',
    message: error instanceof Error ? error.message : 'An unexpected error occurred.',
    technicalDetails: error instanceof Error ? error.stack : String(error),
    timestamp,
    canRetry: true,
    recoveryActions: [
      {
        label: 'Refresh page',
        action: () => window.location.reload(),
        variant: 'primary',
      },
    ],
  };
}

// ── Error Formatting ───────────────────────────────────────────────

export function formatErrorForDisplay(error: AppError): {
  icon: string;
  iconColor: string;
  bgColor: string;
  borderColor: string;
} {
  switch (error.severity) {
    case 'critical':
      return {
        icon: '🚨',
        iconColor: 'text-red-400',
        bgColor: 'bg-red-950/20',
        borderColor: 'border-red-900/50',
      };
    case 'error':
      return {
        icon: '⚠️',
        iconColor: 'text-red-400',
        bgColor: 'bg-red-950/20',
        borderColor: 'border-red-900/50',
      };
    case 'warning':
      return {
        icon: '⚠️',
        iconColor: 'text-amber-400',
        bgColor: 'bg-amber-950/20',
        borderColor: 'border-amber-900/50',
      };
    case 'info':
      return {
        icon: 'ℹ️',
        iconColor: 'text-blue-400',
        bgColor: 'bg-blue-950/20',
        borderColor: 'border-blue-900/50',
      };
  }
}

// ── Agent-Specific Error Helpers ──────────────────────────────────

export function createAgentError(
  agentId: string,
  agentName: string,
  reason: string,
  onRestart?: () => void,
  onViewLogs?: () => void
): AppError {
  return {
    id: `agent-error-${agentId}-${Date.now()}`,
    severity: 'error',
    category: 'agent',
    title: `Agent "${agentName}" Failed`,
    message: reason || 'The agent encountered an unexpected error and stopped running.',
    technicalDetails: `Agent ID: ${agentId}`,
    timestamp: Date.now(),
    canRetry: true,
    context: { agentId, agentName },
    recoveryActions: [
      ...(onRestart ? [{
        label: 'Restart agent',
        action: onRestart,
        variant: 'primary' as const,
      }] : []),
      ...(onViewLogs ? [{
        label: 'View logs',
        action: onViewLogs,
        variant: 'secondary' as const,
      }] : []),
    ],
  };
}

// ── Task-Specific Error Helpers ───────────────────────────────────

export function createTaskError(
  taskId: string,
  taskTitle: string,
  reason: string,
  onRetry?: () => void,
  onViewDetails?: () => void
): AppError {
  return {
    id: `task-error-${taskId}-${Date.now()}`,
    severity: 'warning',
    category: 'task',
    title: `Task Failed: ${taskTitle}`,
    message: reason || 'The task could not be completed.',
    technicalDetails: `Task ID: ${taskId}`,
    timestamp: Date.now(),
    canRetry: true,
    context: { taskId, taskTitle },
    recoveryActions: [
      ...(onRetry ? [{
        label: 'Retry task',
        action: onRetry,
        variant: 'primary' as const,
      }] : []),
      ...(onViewDetails ? [{
        label: 'View details',
        action: onViewDetails,
        variant: 'secondary' as const,
      }] : []),
    ],
  };
}

// ── WebSocket-Specific Error Helpers ──────────────────────────────

export function createWebSocketError(
  reconnectAttempt: number,
  nextRetrySeconds: number | null,
  onForceReconnect?: () => void
): AppError {
  const isUnstable = reconnectAttempt >= 3;

  return {
    id: `websocket-error-${Date.now()}`,
    severity: isUnstable ? 'error' : 'warning',
    category: 'websocket',
    title: isUnstable ? 'Connection Unstable' : 'Connection Lost',
    message: isUnstable
      ? `Unable to maintain a stable connection after ${reconnectAttempt} attempts. Real-time updates may be delayed.`
      : 'The real-time connection was interrupted. Attempting automatic reconnection.',
    technicalDetails: nextRetrySeconds !== null
      ? `Next retry in ${nextRetrySeconds} seconds`
      : 'Reconnecting...',
    timestamp: Date.now(),
    canRetry: true,
    retryAfter: nextRetrySeconds || undefined,
    context: { reconnectAttempt, nextRetrySeconds },
    recoveryActions: [
      ...(onForceReconnect ? [{
        label: 'Force reconnect now',
        action: onForceReconnect,
        variant: 'primary' as const,
      }] : []),
      {
        label: 'Refresh page',
        action: () => window.location.reload(),
        variant: 'secondary' as const,
      },
    ],
  };
}
