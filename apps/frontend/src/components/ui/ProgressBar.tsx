import React from 'react';

interface ProgressBarProps {
  value: number; // 0 to 100
  color?: 'indigo' | 'emerald' | 'amber' | 'sky';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  color = 'indigo',
  size = 'md',
  showLabel = false,
  className = ''
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  const colors = {
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    sky: 'bg-sky-500'
  };

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>Progress</span>
          <span className="font-semibold text-slate-200">{Math.round(clamped)}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden ${sizes[size]}`}>
        <div
          className={`${colors[color]} h-full transition-all duration-500 rounded-full`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
