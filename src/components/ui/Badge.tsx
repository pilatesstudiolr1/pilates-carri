import { cn } from '@/lib/utils';

type BadgeVariant =
  | 'default'
  | 'meadow'
  | 'mint'
  | 'lime'
  | 'lavender'
  | 'buttercream'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  // Signature Lattice Meadow
  default:
    'bg-[var(--badge-meadow-bg)] text-[var(--badge-meadow-text)] border border-[var(--badge-meadow-border)]',
  meadow:
    'bg-[var(--badge-meadow-bg)] text-[var(--badge-meadow-text)] border border-[var(--badge-meadow-border)]',
  mint:
    'bg-[var(--color-mint-surface)] text-[var(--color-deep-teal)] border border-[var(--surface-mint-border)]',
  lime:
    'bg-[var(--color-lime-surface)] text-[var(--color-olive)] border border-[var(--surface-lime-border)]',
  lavender:
    'bg-[var(--color-lavender-surface)] text-[var(--color-iris)] border border-[var(--surface-lavender-border)]',
  buttercream:
    'bg-[var(--color-buttercream)] text-[var(--color-saffron)] border border-[var(--surface-buttercream-border)]',
  success:
    'bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 font-semibold border border-emerald-500/30',
  warning:
    'bg-amber-500/15 text-amber-900 dark:text-amber-200 font-semibold border border-amber-500/30',
  danger:
    'bg-rose-500/15 text-rose-900 dark:text-rose-200 font-semibold border border-rose-500/30',
  info:
    'bg-blue-500/15 text-blue-900 dark:text-blue-200 font-semibold border border-blue-500/30',
  muted:
    'bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-semibold border border-[var(--border-default)]',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-[var(--badge-meadow-text)]',
  meadow: 'bg-[var(--badge-meadow-text)]',
  mint: 'bg-[var(--color-deep-teal)]',
  lime: 'bg-[var(--color-olive)]',
  lavender: 'bg-[var(--color-iris)]',
  buttercream: 'bg-[var(--color-saffron)]',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-blue-500',
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
        'text-[11px] font-medium tracking-[0.06em] uppercase rounded-[22px]',
        'shadow-2xs select-none',
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColors[variant])}
        />
      )}
      {children}
    </span>
  );
}
