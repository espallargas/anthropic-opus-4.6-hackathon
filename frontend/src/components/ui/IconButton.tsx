import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface IconButtonProps {
  icon: LucideIcon;
  onClick?: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md';
  variant?: 'ghost' | 'subtle';
  className?: string;
  title?: string;
  disabled?: boolean;
}

export function IconButton({
  icon: Icon,
  onClick,
  size = 'md',
  variant = 'ghost',
  className,
  title,
  disabled,
}: IconButtonProps) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const padding = size === 'sm' ? 'p-0.5' : 'p-1';
  const colors =
    variant === 'ghost'
      ? 'text-muted-foreground/70 hover:text-foreground/80'
      : 'text-muted-foreground/50 hover:text-muted-foreground';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(padding, colors, 'transition-colors disabled:opacity-30', className)}
      title={title}
    >
      <Icon className={iconSize} />
    </button>
  );
}
