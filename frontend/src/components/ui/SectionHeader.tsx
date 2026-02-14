import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionHeader({ children, className }: SectionHeaderProps) {
  return (
    <h3
      className={cn(
        'text-muted-foreground text-xs font-semibold tracking-wide uppercase',
        className,
      )}
    >
      {children}
    </h3>
  );
}
