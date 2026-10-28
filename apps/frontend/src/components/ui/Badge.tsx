import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'purple' | 'orange' | 'red' | 'blue';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'sm', className = '' }: BadgeProps) {
  const variants = {
    default: 'bg-brand-surface dark:bg-white/10 text-brand-muted dark:text-[#d0d0c5] border-brand-border dark:border-[#3d3d36]',
    purple: 'bg-brand-signal text-brand-ink border-brand-ink font-bold',
    success: 'bg-[#edfaef] dark:bg-[#14351e] text-brand-success dark:text-[#86efac] border-[#a7dfb3] dark:border-[#2c6c3b] font-semibold',
    warning: 'bg-[#fff7e6] dark:bg-[#402a0c] text-brand-warning dark:text-[#fbbf24] border-[#edcc85] dark:border-[#79531b] font-semibold',
    orange: 'bg-[#fff7e6] dark:bg-[#402a0c] text-brand-warning dark:text-[#fbbf24] border-[#edcc85] dark:border-[#79531b] font-semibold',
    info: 'bg-[#edf4ff] dark:bg-[#142b4d] text-brand-info dark:text-[#93c5fd] border-[#b9d4ff] dark:border-[#2c5b9b] font-semibold',
    blue: 'bg-[#edf4ff] dark:bg-[#142b4d] text-brand-info dark:text-[#93c5fd] border-[#b9d4ff] dark:border-[#2c5b9b] font-semibold',
    red: 'bg-[#fff3f2] dark:bg-[#3a1715] text-brand-error dark:text-[#fca5a5] border-[#f4b8b2] dark:border-[#74352f] font-semibold'
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-sm px-3 py-1'
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}
