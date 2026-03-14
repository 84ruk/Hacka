'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export type ToastItem = {
  id: string;
  variant: ToastVariant;
  message: string;
  title?: string;
  duration: number;
  createdAt: number;
};

type ToastContextValue = {
  toasts: ToastItem[];
  addToast: (options: {
    variant: ToastVariant;
    message: string;
    title?: string;
    duration?: number;
  }) => void;
  removeToast: (id: string) => void;
  success: (message: string, options?: { title?: string; duration?: number }) => void;
  error: (message: string, options?: { title?: string; duration?: number }) => void;
  warning: (message: string, options?: { title?: string; duration?: number }) => void;
  info: (message: string, options?: { title?: string; duration?: number }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 5_000;

function generateId() {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (options: {
      variant: ToastVariant;
      message: string;
      title?: string;
      duration?: number;
    }) => {
      const id = generateId();
      const duration = options.duration ?? DEFAULT_DURATION;
      const item: ToastItem = {
        id,
        variant: options.variant,
        message: options.message,
        title: options.title,
        duration,
        createdAt: Date.now(),
      };
      setToasts((prev) => [...prev, item]);
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast],
  );

  const success = useCallback(
    (message: string, opts?: { title?: string; duration?: number }) => {
      addToast({ variant: 'success', message, title: opts?.title, duration: opts?.duration });
    },
    [addToast],
  );
  const error = useCallback(
    (message: string, opts?: { title?: string; duration?: number }) => {
      addToast({ variant: 'error', message, title: opts?.title, duration: opts?.duration });
    },
    [addToast],
  );
  const warning = useCallback(
    (message: string, opts?: { title?: string; duration?: number }) => {
      addToast({ variant: 'warning', message, title: opts?.title, duration: opts?.duration });
    },
    [addToast],
  );
  const info = useCallback(
    (message: string, opts?: { title?: string; duration?: number }) => {
      addToast({ variant: 'info', message, title: opts?.title, duration: opts?.duration });
    },
    [addToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      addToast,
      removeToast,
      success,
      error,
      warning,
      info,
    }),
    [toasts, addToast, removeToast, success, error, warning, info],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const context = useContext(ToastContext);
  if (!context) return null;
  const { toasts, removeToast } = context;
  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notificaciones"
      className="fixed right-4 top-4 z-[100] flex max-h-[80vh] w-full max-w-sm flex-col gap-3 overflow-auto p-1 focus:outline-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const variantClasses: Record<ToastVariant, string> = {
    success: 'border-[var(--alert-success-border)] bg-[var(--alert-success-bg)] text-[var(--alert-success-text)]',
    error: 'border-[var(--alert-error-border)] bg-[var(--alert-error-bg)] text-[var(--alert-error-text)]',
    warning: 'border-[var(--alert-warning-border)] bg-[var(--alert-warning-bg)] text-[var(--alert-warning-text)]',
    info: 'border-[var(--alert-info-border)] bg-[var(--alert-info-bg)] text-[var(--alert-info-text)]',
  };

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-[var(--radius-sm)] border p-4 text-sm shadow-[var(--shadow-md)] ${variantClasses[toast.variant]}`}
    >
      <div className="min-w-0 flex-1">
        {toast.title && <p className="font-semibold">{toast.title}</p>}
        <p className={toast.title ? 'mt-0.5' : ''}>{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded p-1.5 opacity-80 hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        aria-label="Cerrar notificación"
      >
        <span aria-hidden className="text-lg leading-none">×</span>
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
