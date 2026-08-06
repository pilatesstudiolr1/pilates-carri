import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeStyles = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center gap-3', className)}>
      <Loader2
        className={cn(
          'animate-spin text-[var(--color-wood)]',
          sizeStyles[size]
        )}
      />
      {label && (
        <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      )}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Spinner size="lg" label="Cargando..." />
    </div>
  );
}
