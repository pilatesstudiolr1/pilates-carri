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
        'rounded-lg',
        'bg-[var(--surface)] border border-[var(--border)] shadow-[0_4px_12px_-2px_rgba(0,0,0,0.03)]',
        'transition-all duration-300',
        hover &&
          'hover:-translate-y-0.5 hover:border-[#D4D4D4] hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.06)] cursor-pointer',
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
