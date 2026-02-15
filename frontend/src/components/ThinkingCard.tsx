import { useState, useEffect, useRef } from 'react';
import { Brain, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { ThinkingBlock } from '@/lib/chatStore';

interface ThinkingCardProps {
  thinking: ThinkingBlock;
}

export function ThinkingCard({ thinking }: ThinkingCardProps) {
  const { t } = useI18n();
  const isThinking = thinking.status === 'thinking';
  const [expanded, setExpanded] = useState(true);
  const contentRef = useRef<HTMLParagraphElement>(null);
  const hasAutoCollapsed = useRef(false);

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

  return (
    <div
      className={`bg-muted/30 my-1 rounded-lg border backdrop-blur-sm ${
        isThinking ? 'animate-thinking-pulse border-purple-400/30' : 'border-green-400/15'
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs"
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
        {thinking.type && (
          <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-300/80">
            {thinking.type === 'high'
              ? t('admin.thinking.high_effort')
              : t('admin.thinking.adaptive')}
          </span>
        )}
        {expanded ? (
          <ChevronDown className="text-muted-foreground/50 h-3 w-3" />
        ) : (
          <ChevronRight className="text-muted-foreground/50 h-3 w-3" />
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
}
