import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpandableSectionProps {
  title: ReactNode;
  defaultOpen?: boolean;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  onToggle?: (open: boolean) => void;
  open?: boolean;
}

export function ExpandableSection({
  title,
  defaultOpen = false,
  icon,
  badge,
  children,
  className,
  headerClassName,
  onToggle,
  open: controlledOpen,
}: ExpandableSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = controlledOpen ?? internalOpen;

  const toggle = () => {
    const next = !isOpen;
    setInternalOpen(next);
    onToggle?.(next);
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={toggle}
        className={cn('flex w-full items-center gap-2 text-left text-xs', headerClassName)}
      >
        {icon}
        <div className="flex-1">{title}</div>
        {badge}
        {isOpen ? (
          <ChevronDown className="text-muted-foreground/50 h-3 w-3" />
        ) : (
          <ChevronRight className="text-muted-foreground/50 h-3 w-3" />
        )}
      </button>
      {isOpen && children}
    </div>
  );
}
