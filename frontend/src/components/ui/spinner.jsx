import React from 'react';
import { cn } from '@/lib/utils';

export function Spinner({ size = 'md', className, label }) {
  const sizeClasses = {
    xs: 'h-3.5 w-3.5 border-2',
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-3',
    xl: 'h-12 w-12 border-3',
  };

  const spinner = (
    <div
      className={cn(
        'animate-spin rounded-full border-primary border-t-transparent',
        sizeClasses[size] || sizeClasses.md,
        className
      )}
      role="status"
      aria-label={label || 'Loading'}
    />
  );

  if (label) {
    return (
      <div className="flex flex-col items-center justify-center gap-2.5 py-6">
        {spinner}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
    );
  }

  return spinner;
}
