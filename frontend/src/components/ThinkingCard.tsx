import { useState, useEffect, useRef, memo } from 'react';
import { Brain, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { ThinkingBlock } from '@/lib/chatStore';

interface ThinkingCardProps {
  thinking: ThinkingBlock;
}

export const ThinkingCard = memo(function ThinkingCard({ thinking }: ThinkingCardProps) {
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
        {thinking.effort &&
          (() => {
            const levels: Record<
              string,
              { bg: string; text: string; border: string; bars: number }
            > = {
              low: {
                bg: 'bg-blue-500/10',
                text: 'text-blue-300',
                border: 'border-blue-400/30',
                bars: 1,
              },
              medium: {
                bg: 'bg-cyan-500/10',
                text: 'text-cyan-300',
                border: 'border-cyan-400/30',
                bars: 2,
              },
              high: {
                bg: 'bg-violet-500/10',
                text: 'text-violet-300',
                border: 'border-violet-400/30',
                bars: 3,
              },
              max: {
                bg: 'bg-purple-500/10',
                text: 'text-purple-300',
                border: 'border-purple-400/30',
                bars: 4,
              },
            };
            const level = levels[thinking.effort!];
            if (!level) return null;
            return (
              <div className="flex items-center gap-1.5">
                <span
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${level.bg} ${level.text} ${level.border}`}
                >
                  {thinking.effort}
                </span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 w-1 rounded-full ${level.bars >= i ? level.text : 'bg-white/10'}`}
                      style={{ backgroundColor: level.bars >= i ? 'currentColor' : undefined }}
                    />
                  ))}
                </div>
              </div>
            );
          })()}
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
