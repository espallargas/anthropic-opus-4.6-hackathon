import { cn } from '@/lib/utils';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassPanel({ children, className }: GlassPanelProps) {
  return (
    <div
      className={cn(
        'border-glass-border bg-glass-bg border backdrop-blur-[var(--glass-blur)]',
        className,
      )}
    >
      {children}
    </div>
  );
}
