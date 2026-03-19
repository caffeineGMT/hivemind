import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { AppError, classifyError } from '../utils/errors';

export function useErrorHandler() {
  const [error, setError] = useState<AppError | null>(null);

  const handleError = useCallback((err: unknown, options?: {
    showToast?: boolean;
    toastDuration?: number;
  }) => {
    const appError = classifyError(err);
    setError(appError);

    // Optionally show toast notification
    if (options?.showToast !== false) {
      const toastOptions = {
        duration: options?.toastDuration || 5000,
        description: appError.message,
      };

      switch (appError.severity) {
        case 'critical':
        case 'error':
          toast.error(appError.title, toastOptions);
          break;
        case 'warning':
          toast.warning(appError.title, toastOptions);
          break;
        case 'info':
          toast.info(appError.title, toastOptions);
          break;
      }
    }

    return appError;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
  };
}

// Hook for handling API errors with React Query
export function useApiErrorHandler() {
  const { handleError } = useErrorHandler();

  return useCallback((error: unknown) => {
    return handleError(error, { showToast: true });
  }, [handleError]);
}
