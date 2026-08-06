import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
};

export function Card({
  children,
  className,
  hover = false,
  padding = 'md',
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl',
        'bg-[var(--bg-secondary)] border border-[var(--border-default)] shadow-[0_2px_8px_rgba(0,0,0,0.03)]',
        'transition-all duration-300',
        hover &&
          'hover:-translate-y-0.5 hover:border-[var(--border-hover)] hover:shadow-md cursor-pointer',
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
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: CardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      <div>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
