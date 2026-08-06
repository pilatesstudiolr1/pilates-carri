'use client';

import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useEffect, useCallback, type ReactNode } from 'react';

interface ModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showClose?: boolean;
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export function Modal({
  open,
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showClose = true,
}: ModalProps) {
  const isModalOpen = open ?? isOpen ?? false;

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isModalOpen, handleEscape]);

  if (!isModalOpen) return null;


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Overlay Backdrop Blur */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={cn(
          'relative w-full rounded-2xl flex flex-col',
          'bg-[var(--bg-secondary)] border border-[var(--border-default)]',
          'shadow-2xl overflow-hidden',
          'animate-scale-in max-h-[85vh] sm:max-h-[90vh]',
          sizeStyles[size]
        )}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-start justify-between p-4 sm:p-5 border-b border-[var(--border-default)] bg-[var(--bg-tertiary)]/50 shrink-0">
            <div className="pr-4">
              {title && (
                <h2 className="text-base font-bold tracking-tight text-[var(--text-primary)] leading-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-0.5 text-xs text-[var(--text-muted)] leading-snug">
                  {description}
                </p>
              )}
            </div>
            {showClose && (
              <button
                onClick={onClose}
                className={cn(
                  'w-8 h-8 rounded-full shrink-0',
                  'flex items-center justify-center',
                  'bg-[var(--bg-tertiary)] border border-[var(--border-default)]',
                  'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]',
                  'transition-all duration-200 cursor-pointer shadow-xs'
                )}
                aria-label="Cerrar modal"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[calc(85vh-70px)] sm:max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
}

