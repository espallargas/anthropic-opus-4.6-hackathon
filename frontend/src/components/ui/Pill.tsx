import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PillProps {
  icon?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
  size?: 'default' | 'sm';
  className?: string;
}

export function Pill({
  icon,
  selected = false,
  onClick,
  children,
  size = 'default',
  className,
}: PillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-full border transition-all',
        size === 'default' && 'px-4 py-2 text-sm',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        selected
          ? 'border-ring/30 bg-muted/50 text-foreground ring-ring/30 ring-1'
          : 'border-border/50 bg-muted/30 text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground',
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}
