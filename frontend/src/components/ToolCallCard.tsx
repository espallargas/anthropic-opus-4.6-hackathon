import { CheckCircle2, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { ToolCall } from '@/lib/chatStore';

export function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const { t } = useI18n();
  const label =
    t(`tool.${toolCall.name}`) !== `tool.${toolCall.name}`
      ? t(`tool.${toolCall.name}`)
      : toolCall.name;
  const isCalling = toolCall.status === 'calling';

  return (
    <div className="my-1 flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs">
      {isCalling ? (
        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      )}
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
