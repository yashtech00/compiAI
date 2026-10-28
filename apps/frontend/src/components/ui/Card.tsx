import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export function Card({ className = '', hoverEffect = false, children, ...props }: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800/80 shadow-sm dark:shadow-none text-slate-900 dark:text-slate-100 rounded-xl p-6 backdrop-blur-sm ${
        hoverEffect ? 'hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all duration-200' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
