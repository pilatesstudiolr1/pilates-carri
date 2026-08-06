'use client';

import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-[var(--color-success)] shrink-0" />,
  error: <AlertCircle className="h-5 w-5 text-[var(--color-danger)] shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 text-[var(--color-warning)] shrink-0" />,
  info: <Info className="h-5 w-5 text-[var(--color-info)] shrink-0" />,
};

const borderStyles: Record<ToastType, string> = {
  success: 'border-l-4 border-l-[var(--color-success)]',
  error: 'border-l-4 border-l-[var(--color-danger)]',
  warning: 'border-l-4 border-l-[var(--color-warning)]',
  info: 'border-l-4 border-l-[var(--color-info)]',
};

export function ToastItem({ toast, onDismiss }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl shadow-lg border border-[var(--border-default)]',
        'bg-[var(--bg-secondary)] text-[var(--text-primary)] min-w-[280px] max-w-sm',
        'animate-fade-in-up transition-all duration-300',
        borderStyles[toast.type]
      )}
    >
      {icons[toast.type]}

      <div className="flex-1 pr-2">
        {toast.title && (
          <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight mb-0.5">
            {toast.title}
          </h4>
        )}
        <p className="text-xs text-[var(--text-secondary)] leading-snug">{toast.message}</p>
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
        aria-label="Cerrar notificación"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-auto">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
