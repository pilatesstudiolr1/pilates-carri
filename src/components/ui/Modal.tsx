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
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showClose?: boolean;
}

const sizeStyles = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-5xl',
  '2xl': 'max-w-6xl',
};

export function Modal({
  open,
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'lg',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6">
      {/* Overlay Backdrop Blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={cn(
          'relative w-full rounded-xl flex flex-col',
          'bg-[var(--bg-secondary)] border border-[var(--border-default)]',
          'shadow-2xl overflow-hidden',
          'animate-scale-in max-h-[92vh] sm:max-h-[90vh]',
          sizeStyles[size]
        )}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-start justify-between p-4 sm:p-5 md:p-6 border-b border-[var(--border-default)] bg-[var(--bg-tertiary)]/50 shrink-0">
            <div className="pr-3 sm:pr-4">
              {title && (
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)] leading-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-xs sm:text-sm text-[var(--text-muted)] leading-snug">
                  {description}
                </p>
              )}
            </div>
            {showClose && (
              <button
                onClick={onClose}
                className={cn(
                  'w-8 h-8 sm:w-9 sm:h-9 rounded-full shrink-0',
                  'flex items-center justify-center',
                  'bg-[var(--bg-tertiary)] border border-[var(--border-default)]',
                  'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]',
                  'transition-all duration-200 cursor-pointer shadow-xs'
                )}
                aria-label="Cerrar modal"
              >
                <X className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 md:p-6 overflow-y-auto max-h-[calc(92vh-75px)] sm:max-h-[calc(90vh-90px)] space-y-4 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}
