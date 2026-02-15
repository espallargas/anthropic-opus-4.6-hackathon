import { memo, useState, useEffect, useRef } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Loader2, XCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { ToolCallCard } from '@/components/ToolCallCard';
import type { AgentExecution } from '@/lib/chatStore';

function formatTokenCount(count: number): string {
  if (count < 1000) return String(count);
  return `${(count / 1000).toFixed(1)}k`;
}

interface AgentCardProps {
  agent: AgentExecution;
}

export const AgentCard = memo(function AgentCard({ agent }: AgentCardProps) {
  const { t } = useI18n();
  const isRunning = agent.status === 'running';
  const isDone = agent.status === 'done';
  const [expanded, setExpanded] = useState(isRunning);
  const [elapsedMs, setElapsedMs] = useState(0);
  const tokensRef = useRef<HTMLParagraphElement>(null);
  const hasAutoCollapsed = useRef(false);
  const startTimeRef = useRef<number | null>(null);

  // Track elapsed time while running
  useEffect(() => {
    if (isRunning && !startTimeRef.current) {
      startTimeRef.current = Date.now();
    }
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning) {
      startTimeRef.current = null;
      return;
    }

    const interval = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedMs(Date.now() - startTimeRef.current);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning]);

  // Auto-scroll to bottom as tokens stream in
  useEffect(() => {
    if (isRunning && expanded && tokensRef.current) {
      tokensRef.current.scrollTop = tokensRef.current.scrollHeight;
    }
  }, [agent.tokens, isRunning, expanded]);

  // Auto-collapse once when agent completes
  useEffect(() => {
    if (isDone && !hasAutoCollapsed.current) {
      hasAutoCollapsed.current = true;
      const timer = setTimeout(() => setExpanded(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isDone]);

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

  const isError = agent.status === 'error';

  const timingBadge =
    isRunning
      ? `${Math.round(elapsedMs / 1000)}s`
      : isDone && agent.durationMs != null
        ? `${Math.round(agent.durationMs / 1000)}s`
        : isError
          ? t('agent.cancelled')
          : null;

  const tokenBadge =
    isDone && agent.usage
      ? `${formatTokenCount(agent.usage.input_tokens + agent.usage.output_tokens)} ${t('usage.tokens_short')}`
      : null;

  return (
    <div className={`bg-muted/30 rounded-lg border backdrop-blur-sm ${borderClass}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-start text-xs"
      >
        <StatusIcon className={statusIconClass} />
        <span className="text-foreground/80 flex-1 truncate font-medium">{label}</span>
        {timingBadge && (
          <span className="bg-muted/40 text-muted-foreground/70 rounded px-1.5 py-0.5 text-[10px]">
            {timingBadge}
          </span>
        )}
        {tokenBadge && (
          <span className="bg-muted/40 text-muted-foreground/50 rounded px-1.5 py-0.5 text-[10px]">
            {tokenBadge}
          </span>
        )}
        {expanded ? (
          <ChevronDown className="text-muted-foreground/50 h-3 w-3" />
        ) : (
          <ChevronRight className="text-muted-foreground/50 h-3 w-3 rtl:-scale-x-100" />
        )}
      </button>

      {expanded && (
        <div className="border-border/50 space-y-1 border-t px-3 py-2">
          {agent.toolCalls.length > 0 && (
            <div className="space-y-1">
              {agent.toolCalls.map((tc) => (
                <ToolCallCard key={tc.id} toolCall={tc} compact />
              ))}
            </div>
          )}
          {agent.tokens && (
            <p
              ref={tokensRef}
              className="text-muted-foreground/70 h-32 overflow-y-auto text-[10px] leading-relaxed whitespace-pre-wrap"
            >
              {agent.tokens}
            </p>
          )}
          {isDone && agent.resultSummary && (
            <p className="text-muted-foreground line-clamp-4 text-[10px] leading-relaxed">
              {agent.resultSummary}
            </p>
          )}
          {isRunning && (
            <p className="text-muted-foreground/50 text-[10px]">{t('agent.analyzing')}</p>
          )}
        </div>
      )}
    </div>
  );
});
