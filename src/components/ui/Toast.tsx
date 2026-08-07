'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export type ToastMessage = ToastItem;

interface ToastContextValue {
  toast: {
    success: (message: string, title?: string, duration?: number) => void;
    error: (message: string, title?: string, duration?: number) => void;
    info: (message: string, title?: string, duration?: number) => void;
    warning: (message: string, title?: string, duration?: number) => void;
    custom: (item: Omit<ToastItem, 'id'>) => void;
  };
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (item: Omit<ToastItem, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const duration = item.duration ?? 4000;

      const newToast: ToastItem = { ...item, id };
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toast = {
    success: (message: string, title?: string, duration?: number) =>
      addToast({ type: 'success', message, title: title || 'Operación exitosa', duration }),
    error: (message: string, title?: string, duration?: number) =>
      addToast({ type: 'error', message, title: title || 'Ocurrió un error', duration }),
    info: (message: string, title?: string, duration?: number) =>
      addToast({ type: 'info', message, title: title || 'Información', duration }),
    warning: (message: string, title?: string, duration?: number) =>
      addToast({ type: 'warning', message, title: title || 'Atención', duration }),
    custom: addToast,
  };

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="assertive"
      className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onClose={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser utilizado dentro de un ToastProvider');
  }
  return context.toast;
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-[var(--color-success)] shrink-0" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-[var(--color-danger)] shrink-0" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-[var(--color-warning)] shrink-0" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-[var(--color-wood)] shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-[var(--color-success)]/40 bg-[var(--bg-secondary)]/95';
      case 'error':
        return 'border-[var(--color-danger)]/40 bg-[var(--bg-secondary)]/95';
      case 'warning':
        return 'border-[var(--color-warning)]/40 bg-[var(--bg-secondary)]/95';
      case 'info':
      default:
        return 'border-[var(--color-wood)]/40 bg-[var(--bg-secondary)]/95';
    }
  };

  return (
    <div
      className={`pointer-events-auto p-4 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-slide-in flex items-start gap-3 text-[var(--text-primary)] ${getBorderColor()}`}
    >
      <div className="pt-0.5">{getIcon()}</div>

      <div className="flex-1 min-w-0">
        {toast.title && (
          <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight mb-0.5">
            {toast.title}
          </h4>
        )}
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{toast.message}</p>
      </div>

      <button
        onClick={onClose}
        className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer shrink-0"
        aria-label="Cerrar notificación"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
