import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

type CardSurface = 'paper' | 'mint' | 'lime' | 'lavender' | 'buttercream' | 'blush' | 'parchment';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  surface?: CardSurface;
}

const surfaceStyles: Record<CardSurface, string> = {
  paper: 'bg-[var(--bg-secondary)] border border-[var(--border-default)] shadow-sm',
  mint: 'surface-mint shadow-sm',
  lime: 'surface-lime shadow-sm',
  lavender: 'surface-lavender shadow-sm',
  buttercream: 'surface-buttercream shadow-sm',
  blush: 'surface-blush shadow-sm',
  parchment: 'bg-[var(--bg-primary)] border border-[var(--border-default)]',
};

const paddingStyles = {
  none: '',
  sm: 'p-3.5',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export function Card({
  children,
  className,
  hover = false,
  padding = 'md',
  surface = 'paper',
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[14px]',
        'transition-all duration-200',
        surfaceStyles[surface],
        hover &&
          'hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--border-hover)] cursor-pointer',
        paddingStyles[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  tag?: string;
}

export function CardHeader({
  title,
  description,
  action,
  className,
  tag,
}: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-4', className)}>
      <div>
        {tag && (
          <span className="inline-block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)] mb-1">
            {tag}
          </span>
        )}
        <h3 className="text-base sm:text-lg font-medium text-[var(--text-primary)] tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
