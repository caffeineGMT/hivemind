import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'app' | 'route' | 'component';
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    const { error, errorInfo, showDetails } = this.state;
    const level = this.props.level || 'route';

    if (level === 'component') {
      return (
        <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Failed to load this section</span>
          </div>
          <button
            onClick={this.handleRetry}
            className="mt-2 flex items-center gap-1.5 rounded bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Try Again
          </button>
        </div>
      );
    }

    return (
      <div className={`flex items-center justify-center ${level === 'app' ? 'h-screen' : 'min-h-[60vh]'} bg-zinc-950`}>
        <div className="mx-4 w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-950/50">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Something went wrong</h2>
              <p className="text-sm text-zinc-400">
                {level === 'app'
                  ? 'The application encountered an unexpected error.'
                  : 'This page encountered an error.'}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-zinc-950 p-3">
              <p className="font-mono text-sm text-red-400">{error.message}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
            <button
              onClick={this.handleGoHome}
              className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              <Home className="h-4 w-4" />
              Go Home
            </button>
          </div>

          {(error?.stack || errorInfo) && (
            <div className="mt-6 border-t border-zinc-800 pt-4">
              <button
                onClick={this.toggleDetails}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
              >
                {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {showDetails ? 'Hide' : 'Show'} error details
              </button>
              {showDetails && (
                <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-500">
                  {error?.stack}
                  {errorInfo?.componentStack && (
                    <>
                      {'\n\nComponent Stack:'}
                      {errorInfo.componentStack}
                    </>
                  )}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
