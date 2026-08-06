import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    'bg-[var(--color-wood)]/15 text-[var(--color-wood)]',
  success:
    'bg-[var(--color-success-soft)] text-[var(--color-success)]',
  warning:
    'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
  danger:
    'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
  info:
    'bg-[var(--color-info-soft)] text-[var(--color-info)]',
  muted:
    'bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-[var(--color-wood)]',
  success: 'bg-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger)]',
  info: 'bg-[var(--color-info)]',
  muted: 'bg-[var(--text-muted)]',
};

export function Badge({
  children,
  variant = 'default',
  className,
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5',
        'text-xs font-medium rounded-[var(--radius-full)]',
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full', dotColors[variant])}
        />
      )}
      {children}
    </span>
  );
}
