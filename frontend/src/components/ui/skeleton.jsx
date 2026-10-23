import React from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-foreground/[0.08] border border-border/40',
        className
      )}
      {...props}
    />
  );
}
