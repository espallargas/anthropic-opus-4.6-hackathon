import { useState, useEffect } from 'react';
import { Brain, ChevronDown, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { ThinkingBlock } from '@/lib/chatStore';

interface ThinkingCardProps {
  thinking: ThinkingBlock;
}

export function ThinkingCard({ thinking }: ThinkingCardProps) {
  const { t } = useI18n();
  const isThinking = thinking.status === 'thinking';
  const [expanded, setExpanded] = useState(true);

  // Auto-close when thinking completes
  useEffect(() => {
    if (!isThinking && expanded) {
      // Close after a short delay for visual feedback
      const timer = setTimeout(() => {
        setExpanded(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isThinking, expanded]);

  return (
    <div
      className={`my-1 rounded-lg border bg-white/5 backdrop-blur-sm ${
        isThinking ? 'animate-thinking-pulse border-purple-400/50' : 'border-purple-400/20'
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs"
      >
        <Brain
          className={`h-4 w-4 text-purple-400 ${isThinking ? 'animate-pulse' : 'opacity-50'}`}
        />
        <div className="flex-1">
          <span className="font-medium text-white/60">
            {isThinking ? t('thinking.active') : t('thinking.done')}
          </span>
        </div>
        {thinking.type && (
          <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-300/80">
            {thinking.type === 'high' ? t('admin.thinking.high_effort') : t('admin.thinking.adaptive')}
          </span>
        )}
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-white/30" />
        ) : (
          <ChevronRight className="h-3 w-3 text-white/30" />
        )}
      </button>

      {expanded && thinking.content && (
        <div className="border-t border-white/10 px-3 py-2">
          <p className="max-h-20 overflow-y-auto text-[11px] leading-relaxed whitespace-pre-wrap text-white/30">
            {thinking.content}
          </p>
        </div>
      )}
    </div>
  );
}
