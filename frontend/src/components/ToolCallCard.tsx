import { CheckCircle2, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { ToolCall } from '@/lib/chatStore';

interface ToolCallCardProps {
  toolCall: ToolCall;
  compact?: boolean;
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

export function ToolCallCard({ toolCall, compact }: ToolCallCardProps) {
  const { t } = useI18n();
  const label =
    t(`tool.${toolCall.name}`) !== `tool.${toolCall.name}`
      ? t(`tool.${toolCall.name}`)
      : toolCall.name;
  const detail = getToolDetail(toolCall);
  const isCalling = toolCall.status === 'calling';

  return (
    <div
      className={`flex items-center gap-2 rounded-md border border-dashed text-xs ${
        compact ? 'px-2 py-1' : 'my-1 px-3 py-2'
      }`}
    >
      {isCalling ? (
        <Loader2
          className={`text-muted-foreground animate-spin ${compact ? 'h-3 w-3' : 'h-4 w-4'}`}
        />
      ) : (
        <CheckCircle2 className={`text-green-500 ${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
      )}
      <span className={`text-muted-foreground ${compact ? 'text-[10px]' : ''}`}>
        {label}
        {detail && <span className="ml-1 opacity-60">— {detail}</span>}
      </span>
    </div>
  );
}
