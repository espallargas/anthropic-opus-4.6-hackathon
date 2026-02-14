import { cn } from '@/lib/utils';

type Status = 'pending' | 'running' | 'done' | 'error' | 'searching' | 'indexing';

const STATUS_STYLES: Record<Status, string> = {
  pending: 'bg-muted/30 text-muted-foreground border-border',
  running: 'bg-blue-500/10 text-blue-400 border-blue-400/30',
  searching: 'bg-blue-500/10 text-blue-400/70 border-blue-400/20',
  indexing: 'bg-purple-500/10 text-purple-400/70 border-purple-400/20',
  done: 'bg-green-500/10 text-green-400/70 border-green-400/20',
  error: 'bg-red-500/10 text-red-400 border-red-400/30',
};

interface StatusBadgeProps {
  status: Status;
  children: React.ReactNode;
  count?: number;
  className?: string;
}

export function StatusBadge({ status, children, count, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] whitespace-nowrap',
        STATUS_STYLES[status],
        className,
      )}
    >
      {children}
      {count != null && <span>{count}</span>}
    </span>
  );
}
