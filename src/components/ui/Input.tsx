import { cn } from '@/lib/utils';
import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5 w-full min-w-0">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-[var(--text-primary)] tracking-tight"
          >
            {label}
          </label>
        )}
        <div className="relative w-full">
          {icon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-10 px-3.5 rounded-[12px] text-xs sm:text-sm font-sans',
              'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
              'border border-[var(--border-default)] shadow-2xs',
              'placeholder:text-[var(--text-muted)]',
              'transition-all duration-150',
              'hover:border-[var(--border-hover)]',
              'focus:outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--border-focus)]/15',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              icon && 'pl-10',
              error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/15',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>
        )}
        {hint && !error && (
          <p className="text-[11px] text-[var(--text-muted)]">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, type InputProps };
