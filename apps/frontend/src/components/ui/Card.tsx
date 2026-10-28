import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export function Card({ className = '', hoverEffect = false, children, ...props }: CardProps) {
  return (
    <div
      className={`bg-brand-paper dark:bg-brand-studySurface border border-brand-border dark:border-[#3d3d36] shadow-[0_1px_0_rgba(17,17,17,0.08)] text-brand-ink dark:text-[#f7f7f1] rounded-2xl p-6 transition-all duration-200 ${
        hoverEffect ? 'hover:border-brand-ink dark:hover:border-brand-signal hover:shadow-[4px_4px_0_rgba(17,17,17,0.14)] hover:-translate-y-0.5' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
