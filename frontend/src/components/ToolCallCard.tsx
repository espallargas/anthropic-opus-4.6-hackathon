import { CheckCircle2, Loader2 } from 'lucide-react'
import type { ToolCall } from '@/hooks/useChat'

const TOOL_LABELS: Record<string, string> = {
  search_visa_requirements: 'Buscando requisitos de visto',
  check_processing_times: 'Consultando prazos de processamento',
}

export function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const label = TOOL_LABELS[toolCall.name] ?? toolCall.name
  const isCalling = toolCall.status === 'calling'

  return (
    <div className="my-1 flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs">
      {isCalling ? (
        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      )}
      <span className="text-muted-foreground">{label}</span>
    </div>
  )
}
