import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-xl border font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-signalStrong focus-visible:ring-offset-2 focus-visible:ring-offset-brand-canvas disabled:opacity-45 disabled:pointer-events-none active:scale-[0.98]';

    const variants = {
      primary: 'bg-brand-ink hover:bg-brand-hover active:bg-black text-brand-signal border-brand-ink shadow-[3px_3px_0_#D8FF19]',
      secondary: 'bg-brand-signal hover:bg-[#e5ff66] active:bg-[#c5eb00] text-brand-ink border-brand-ink shadow-[3px_3px_0_#111111]',
      outline: 'bg-brand-paper hover:bg-brand-surface dark:bg-brand-studySurface dark:hover:bg-[#2b2b27] text-brand-ink dark:text-white border-brand-border dark:border-[#3d3d36]',
      ghost: 'bg-transparent hover:bg-brand-surface dark:hover:bg-white/10 text-brand-muted hover:text-brand-ink dark:text-[#b4b4a9] dark:hover:text-white border-transparent',
      danger: 'bg-[#fff3f2] hover:bg-[#ffe4e1] dark:bg-[#3a1715] text-brand-error dark:text-[#fca5a5] border-[#f4b8b2] dark:border-[#74352f]'
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2.5 gap-2',
      lg: 'text-base px-6 py-3.5 gap-2.5'
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
