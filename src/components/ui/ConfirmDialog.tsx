'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, Info, CheckCircle2, HelpCircle } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'warning',
  loading = false,
}: ConfirmDialogProps) {
  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <AlertTriangle className="h-6 w-6 text-[var(--color-danger)] shrink-0" />;
      case 'info':
        return <Info className="h-6 w-6 text-[var(--color-wood)] shrink-0" />;
      case 'warning':
      default:
        return <HelpCircle className="h-6 w-6 text-[var(--color-warning)] shrink-0" />;
    }
  };

  const getButtonVariant = () => {
    switch (variant) {
      case 'danger':
        return 'danger';
      case 'info':
      case 'warning':
      default:
        return 'primary';
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex flex-col gap-4 text-[var(--text-primary)]">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
            {getIcon()}
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">{title}</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-default)] mt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={getButtonVariant() as any}
            loading={loading}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            icon={<CheckCircle2 className="h-4 w-4" />}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
