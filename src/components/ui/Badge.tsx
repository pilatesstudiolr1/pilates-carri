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
    'bg-[var(--color-wood)]/15 text-[var(--color-wood)] border border-[var(--color-wood)]/30',
  success:
    'bg-[var(--color-success-soft)] text-[var(--color-success)] border border-[var(--color-success)]/30',
  warning:
    'bg-[var(--color-warning-soft)] text-[var(--color-warning)] border border-[var(--color-warning)]/30',
  danger:
    'bg-[var(--color-danger-soft)] text-[var(--color-danger)] border border-[var(--color-danger)]/30',
  info:
    'bg-[var(--color-info-soft)] text-[var(--color-info)] border border-[var(--color-info)]/30',
  muted:
    'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-default)]',
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
        'inline-flex items-center gap-1.5 px-3 py-0.5',
        'text-xs font-semibold rounded-full tracking-wide',
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

