import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  details?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  requireTyping?: boolean;
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantStyles = {
  danger: {
    icon: 'text-red-400',
    iconBg: 'bg-red-500/10',
    button: 'bg-red-600 hover:bg-red-500 focus:ring-red-500/50',
  },
  warning: {
    icon: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    button: 'bg-amber-600 hover:bg-amber-500 focus:ring-amber-500/50',
  },
  info: {
    icon: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    button: 'bg-blue-600 hover:bg-blue-500 focus:ring-blue-500/50',
  },
};

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  details,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
  isLoading = false,
  requireTyping = false,
  confirmText = '',
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [inputValue, setInputValue] = useState('');

  // Reset input when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      cancelRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onCancel();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const styles = variantStyles[variant];
  const canConfirm = !requireTyping || inputValue === confirmText;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isLoading ? undefined : onCancel}
        aria-hidden="true"
      />
      <div className="relative mx-4 w-full max-w-md animate-fade-in rounded-xl border border-zinc-700/60 bg-zinc-900 p-6 shadow-2xl">
        <button
          onClick={onCancel}
          disabled={isLoading}
          aria-label="Close dialog"
          className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${styles.iconBg}`}>
            <AlertTriangle className={`h-5 w-5 ${styles.icon}`} />
          </div>
          <div className="flex-1">
            <h3 id="modal-title" className="text-base font-semibold text-zinc-100">{title}</h3>
            <p className="mt-1.5 text-sm text-zinc-400">{message}</p>
            {details && details.length > 0 && (
              <div className="mt-3 max-h-32 overflow-y-auto rounded-lg bg-zinc-800/60 p-3">
                <ul className="space-y-1">
                  {details.map((detail, i) => (
                    <li key={i} className="text-xs text-zinc-400">
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {requireTyping && confirmText && (
              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Type <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-amber-400">{confirmText}</code> to confirm
                </label>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={confirmText}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/20"
                  autoFocus
                  disabled={isLoading}
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700 disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading || !canConfirm}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition focus:outline-none focus:ring-2 disabled:opacity-60 ${styles.button}`}
          >
            {isLoading && (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
