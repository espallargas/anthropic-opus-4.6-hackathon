import { cn } from '@/lib/utils';

type Status = 'active' | 'pending' | 'error' | 'running';

const STATUS_COLORS: Record<Status, string> = {
  active: 'bg-green-500',
  pending: 'bg-red-500',
  error: 'bg-red-500',
  running: 'bg-blue-400',
};

interface StatusDotProps {
  status: Status;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusDot({ status, size = 'sm', className }: StatusDotProps) {
  return (
    <span
      className={cn(
        'inline-block flex-shrink-0 rounded-full',
        size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5',
        STATUS_COLORS[status],
        className,
      )}
    />
  );
}
