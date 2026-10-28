import React from 'react';

interface ProgressBarProps {
  value: number; // 0 to 100
  color?: 'indigo' | 'emerald' | 'amber' | 'sky' | 'orange';
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
    indigo: 'bg-brand-signal',
    emerald: 'bg-brand-success',
    amber: 'bg-brand-warning',
    orange: 'bg-brand-warning',
    sky: 'bg-brand-info'
  };

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3.5'
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-xs text-brand-muted dark:text-[#b4b4a9] mb-1.5 font-medium">
          <span>Progress</span>
          <span className="font-semibold text-brand-ink dark:text-[#f7f7f1]">{Math.round(clamped)}%</span>
        </div>
      )}
      <div className={`w-full bg-brand-border dark:bg-[#3d3d36] rounded-full overflow-hidden ${sizes[size]}`}>
        <div
          className={`${colors[color]} h-full transition-all duration-500 rounded-full`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
