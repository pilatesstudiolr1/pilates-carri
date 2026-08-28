import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { type ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  // Primario: Alta legibilidad y contraste automático en Light y Dark
  primary:
    'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-hover)] active:bg-[var(--btn-primary-active)] shadow-xs font-semibold border border-transparent',
  // Secundario: Outlined refinado
  secondary:
    'bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] border-[1.5px] border-[var(--btn-secondary-border)] hover:bg-[var(--btn-secondary-hover)] font-medium',
  // Accent: Meadow pill
  accent:
    'bg-[var(--badge-meadow-bg)] text-[var(--badge-meadow-text)] border border-[var(--badge-meadow-border)] hover:brightness-105 font-medium',
  // Outline estándar
  outline:
    'border border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--text-primary)] bg-[var(--bg-secondary)] font-medium',
  // Danger
  danger:
    'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-600 hover:text-white font-medium',
  // Ghost
  ghost:
    'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] font-medium border border-transparent',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3.5 text-xs gap-1.5 rounded-[29px]',
  md: 'h-10 px-5 text-xs sm:text-sm gap-2 rounded-[29px]',
  lg: 'h-12 px-6 text-sm sm:text-base gap-2.5 rounded-[29px]',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      icon,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium',
          'transition-all duration-150 active:scale-[0.98]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]',
          'disabled:opacity-50 disabled:pointer-events-none',
          'cursor-pointer select-none tracking-tight',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, type ButtonProps };
