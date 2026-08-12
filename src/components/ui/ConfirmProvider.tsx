'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type DialogVariant = 'danger' | 'warning' | 'success' | 'info';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  hideCancel?: boolean;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  alert: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolver: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      const opts: ConfirmOptions = typeof options === 'string'
        ? { message: options, title: 'Confirmación', variant: 'warning' }
        : {
            title: options.title || 'Confirmación',
            confirmText: options.confirmText || 'Aceptar',
            cancelText: options.cancelText || 'Cancelar',
            variant: options.variant || 'warning',
            ...options,
          };

      setDialogState({
        isOpen: true,
        options: opts,
        resolver: resolve,
      });
    });
  }, []);

  const alert = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      const opts: ConfirmOptions = typeof options === 'string'
        ? { message: options, title: 'Aviso', variant: 'info', hideCancel: true }
        : {
            title: options.title || 'Aviso',
            confirmText: options.confirmText || 'Entendido',
            variant: options.variant || 'info',
            hideCancel: true,
            ...options,
          };

      setDialogState({
        isOpen: true,
        options: opts,
        resolver: resolve,
      });
    });
  }, []);

  const handleClose = (result: boolean) => {
    if (dialogState) {
      dialogState.resolver(result);
      setDialogState(null);
    }
  };

  const getVariantStyles = (variant: DialogVariant = 'warning') => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />,
          iconBg: 'bg-rose-100 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800',
          buttonClass: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs',
        };
      case 'warning':
        return {
          icon: <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />,
          iconBg: 'bg-amber-100 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
          buttonClass: 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
          iconBg: 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
          buttonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs',
        };
      case 'info':
      default:
        return {
          icon: <Info className="h-6 w-6 text-[var(--color-wood)]" />,
          iconBg: 'bg-[var(--color-wood)]/15 border-[var(--color-wood)]/30',
          buttonClass: 'bg-[#131927] hover:bg-[#1a2337] text-white shadow-xs',
        };
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}

      {dialogState?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg shadow-xl overflow-hidden animate-scale-in"
            role="dialog"
            aria-modal="true"
          >
            {/* Header / Banner */}
            <div className="p-5 flex items-start gap-4 border-b border-[var(--border-default)]">
              <div
                className={`w-11 h-11 rounded-lg border flex items-center justify-center shrink-0 ${
                  getVariantStyles(dialogState.options.variant).iconBg
                }`}
              >
                {getVariantStyles(dialogState.options.variant).icon}
              </div>

              <div className="flex-1 min-w-0 pr-2">
                <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                  {dialogState.options.title}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  {dialogState.options.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleClose(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Acciones */}
            <div className="p-4 bg-[var(--bg-tertiary)]/50 flex items-center justify-end gap-2.5">
              {!dialogState.options.hideCancel && (
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="px-4 py-2 rounded-md text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-default)] transition-all cursor-pointer"
                >
                  {dialogState.options.cancelText || 'Cancelar'}
                </button>
              )}

              <button
                type="button"
                onClick={() => handleClose(true)}
                className={`px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  getVariantStyles(dialogState.options.variant).buttonClass
                }`}
              >
                {dialogState.options.confirmText || 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm debe ser usado dentro de un ConfirmProvider');
  }
  return context;
}
