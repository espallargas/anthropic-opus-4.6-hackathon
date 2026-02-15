import { useState, useEffect, useRef, memo } from 'react';
import { Brain, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { ThinkingBlock } from '@/lib/chatStore';

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 1) return '<1s';
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

interface ThinkingCardProps {
  thinking: ThinkingBlock;
}

export const ThinkingCard = memo(function ThinkingCard({ thinking }: ThinkingCardProps) {
  const { t } = useI18n();
  const isThinking = thinking.status === 'thinking';
  const [expanded, setExpanded] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const contentRef = useRef<HTMLParagraphElement>(null);
  const hasAutoCollapsed = useRef(false);

  // Live timer while thinking
  const timerStart = useRef(0);
  useEffect(() => {
    if (!isThinking) return;
    timerStart.current = Date.now();
    const interval = setInterval(() => setElapsed(Date.now() - timerStart.current), 1000);
    return () => clearInterval(interval);
  }, [isThinking]);

  // Auto-scroll to bottom as content streams in
  useEffect(() => {
    if (isThinking && expanded && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [thinking.content, isThinking, expanded]);

  // Auto-collapse once when thinking completes
  useEffect(() => {
    if (!isThinking && !hasAutoCollapsed.current) {
      hasAutoCollapsed.current = true;
      const timer = setTimeout(() => setExpanded(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isThinking]);

  const durationBadge = isThinking
    ? elapsed > 0
      ? formatDuration(elapsed)
      : null
    : thinking.durationMs != null
      ? formatDuration(thinking.durationMs)
      : null;

  return (
    <div
      className={`bg-muted/30 my-1 min-w-64 rounded-lg border backdrop-blur-sm ${
        isThinking ? 'animate-thinking-pulse border-purple-400/30' : 'border-green-400/15'
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-start text-xs"
      >
        {isThinking ? (
          <Brain className="h-4 w-4 animate-pulse text-purple-400" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-green-400" />
        )}
        <div className="flex-1">
          <span className="text-muted-foreground font-medium">
            {isThinking ? t('thinking.active') : t('thinking.done')}
          </span>
        </div>
        {durationBadge && (
          <span className="bg-muted/40 text-muted-foreground/70 rounded px-1.5 py-0.5 text-[10px]">
            {durationBadge}
          </span>
        )}
        {expanded ? (
          <ChevronDown className="text-muted-foreground/50 h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="text-muted-foreground/50 h-3 w-3 shrink-0 rtl:-scale-x-100" />
        )}
      </button>

      {expanded && thinking.content && (
        <div className="border-border/50 border-t px-3 py-2">
          <p
            ref={contentRef}
            className="text-muted-foreground/50 h-20 overflow-y-auto text-[11px] leading-relaxed whitespace-pre-wrap"
          >
            {thinking.content}
          </p>
        </div>
      )}
    </div>
  );
});
