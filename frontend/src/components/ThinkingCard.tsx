import { useState } from 'react';
import { Brain, ChevronDown, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { ThinkingBlock } from '@/lib/chatStore';

interface ThinkingCardProps {
  thinking: ThinkingBlock;
}

export function ThinkingCard({ thinking }: ThinkingCardProps) {
  const { t } = useI18n();
  const isThinking = thinking.status === 'thinking';
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`my-1 rounded-lg border bg-white/5 backdrop-blur-sm ${
        isThinking ? 'animate-thinking-pulse border-purple-400/30' : 'border-purple-400/10'
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
        <span className="flex-1 font-medium text-white/60">
          {isThinking ? t('thinking.active') : t('thinking.done')}
        </span>
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-white/30" />
        ) : (
          <ChevronRight className="h-3 w-3 text-white/30" />
        )}
      </button>

      {expanded && thinking.content && (
        <div className="border-t border-white/5 px-3 py-2">
          <p className="max-h-40 overflow-y-auto text-[11px] leading-relaxed whitespace-pre-wrap text-white/30">
            {thinking.content}
          </p>
        </div>
      )}
    </div>
  );
}
