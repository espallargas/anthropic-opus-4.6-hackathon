import { memo, type ReactNode } from 'react';
import { Bot, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { ToolCall } from '@/lib/chatStore';

interface ToolCallCardProps {
  toolCall: ToolCall;
  compact?: boolean;
  waiting?: boolean;
  children?: ReactNode;
}

function getToolDetail(toolCall: ToolCall): string | null {
  const input = toolCall.input;
  if (toolCall.name === 'get_legislation' && input.country_code) {
    return String(input.country_code).toUpperCase();
  }
  if (input.destination_country) {
    return String(input.destination_country);
  }
  return null;
}

export const ToolCallCard = memo(function ToolCallCard({
  toolCall,
  compact,
  waiting,
  children,
}: ToolCallCardProps) {
  const { t } = useI18n();
  const label =
    t(`tool.${toolCall.name}`) !== `tool.${toolCall.name}`
      ? t(`tool.${toolCall.name}`)
      : toolCall.name;

  const detail = getToolDetail(toolCall);
  const iconSize = compact ? 'h-3 w-3' : 'h-4 w-4';

  const isWaiting = waiting && toolCall.status === 'calling';

  let StatusIcon;
  let iconClass;

  if (isWaiting) {
    StatusIcon = Bot;
    iconClass = `text-muted-foreground/40 ${iconSize}`;
  } else if (toolCall.status === 'calling') {
    StatusIcon = Loader2;
    iconClass = `text-muted-foreground animate-spin ${iconSize}`;
  } else if (toolCall.status === 'error') {
    StatusIcon = XCircle;
    iconClass = `text-red-400 ${iconSize}`;
  } else {
    StatusIcon = CheckCircle2;
    iconClass = `text-green-500 ${iconSize}`;
  }

  return (
    <div
      className={`rounded-md border border-dashed text-xs ${
        isWaiting ? 'opacity-50' : ''
      } ${compact ? 'px-2 py-1' : 'my-1 px-3 py-2'}`}
    >
      <div className="flex items-center gap-2">
        <StatusIcon className={iconClass} />
        <span className={`text-muted-foreground ${compact ? 'text-[10px]' : ''}`}>
          {label}
          {detail && <span className="ms-1 opacity-60">— {detail}</span>}
        </span>
      </div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
});
