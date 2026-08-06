'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastContainer, ToastMessage, ToastType } from '@/components/ui/Toast';

interface ToastContextType {
  showToast: (options: { type?: ToastType; title?: string; message: string; duration?: number }) => void;
  toastSuccess: (message: string, title?: string) => void;
  toastError: (message: string, title?: string) => void;
  toastInfo: (message: string, title?: string) => void;
  toastWarning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type = 'info', title, message, duration = 4000 }: { type?: ToastType; title?: string; message: string; duration?: number }) => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 4);
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);
    },
    []
  );

  const toastSuccess = useCallback((message: string, title: string = '¡Éxito!') => {
    showToast({ type: 'success', title, message });
  }, [showToast]);

  const toastError = useCallback((message: string, title: string = 'Error') => {
    showToast({ type: 'error', title, message });
  }, [showToast]);

  const toastInfo = useCallback((message: string, title?: string) => {
    showToast({ type: 'info', title, message });
  }, [showToast]);

  const toastWarning = useCallback((message: string, title: string = 'Atención') => {
    showToast({ type: 'warning', title, message });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, toastSuccess, toastError, toastInfo, toastWarning }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser utilizado dentro de un ToastProvider');
  }
  return context;
}
