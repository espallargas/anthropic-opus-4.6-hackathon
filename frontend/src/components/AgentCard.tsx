import { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Loader2, XCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { ToolCallCard } from '@/components/ToolCallCard';
import type { AgentExecution } from '@/lib/chatStore';

interface AgentCardProps {
  agent: AgentExecution;
}

export function AgentCard({ agent }: AgentCardProps) {
  const { t } = useI18n();
  const isRunning = agent.status === 'running';
  const isDone = agent.status === 'done';
  const [expanded, setExpanded] = useState(isRunning);

  const label =
    t(`agent.${agent.agentName}`) !== `agent.${agent.agentName}`
      ? t(`agent.${agent.agentName}`)
      : agent.agentLabel;

  const borderClass = isRunning
    ? 'animate-agent-active border-blue-400/30'
    : isDone
      ? 'animate-agent-complete border-green-400/15'
      : 'border-red-400/40';

  const StatusIcon = isRunning ? Loader2 : isDone ? CheckCircle2 : XCircle;

  const statusIconClass = isRunning
    ? 'h-4 w-4 animate-spin text-blue-400'
    : isDone
      ? 'h-4 w-4 text-green-400'
      : 'h-4 w-4 text-red-400';

  const timingBadge =
    isDone && agent.durationMs != null
      ? `${(agent.durationMs / 1000).toFixed(1)}s`
      : isRunning
        ? t('agent.analyzing')
        : null;

  const tokenBadge =
    isDone && agent.usage
      ? `${agent.usage.input_tokens + agent.usage.output_tokens} ${t('usage.tokens_short')}`
      : null;

  return (
    <div className={`rounded-lg border bg-white/5 backdrop-blur-sm ${borderClass}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs"
      >
        <StatusIcon className={statusIconClass} />
        <span className="flex-1 truncate font-medium text-white/80">{label}</span>
        {agent.task && (
          <span className="hidden max-w-[120px] truncate text-[10px] text-white/30 sm:inline">
            {agent.task}
          </span>
        )}
        {timingBadge && (
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/40">
            {timingBadge}
          </span>
        )}
        {tokenBadge && (
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/30">
            {tokenBadge}
          </span>
        )}
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-white/30" />
        ) : (
          <ChevronRight className="h-3 w-3 text-white/30" />
        )}
      </button>

      {expanded && (
        <div className="space-y-1 border-t border-white/5 px-3 py-2">
          {agent.toolCalls.length > 0 && (
            <div className="space-y-1">
              {agent.toolCalls.map((tc) => (
                <ToolCallCard key={tc.id} toolCall={tc} compact />
              ))}
            </div>
          )}
          {agent.tokens && (
            <p className="line-clamp-3 text-[10px] leading-relaxed text-white/40">{agent.tokens}</p>
          )}
          {isDone && agent.resultSummary && (
            <p className="text-[10px] leading-relaxed text-white/50">{agent.resultSummary}</p>
          )}
          {!agent.toolCalls.length && !agent.tokens && isRunning && (
            <p className="text-[10px] text-white/30">{t('agent.analyzing')}</p>
          )}
        </div>
      )}
    </div>
  );
}
