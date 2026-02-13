import { ChevronUp, ChevronDown } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface ThinkingPanelProps {
  thinkingText: string
  isExpanded?: boolean
  inputTokens?: number
  outputTokens?: number
}

export function ThinkingPanel({
  thinkingText,
  isExpanded = true,
  inputTokens,
  outputTokens,
}: ThinkingPanelProps) {
  const [collapsed, setCollapsed] = useState(!isExpanded)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current && thinkingText) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [thinkingText])

  const totalTokens = (inputTokens || 0) + (outputTokens || 0)
  const maxTokens = 128000

  return (
    <div className="flex h-full flex-col border-r border-white/10 bg-blue-500/5">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between gap-2 border-b border-white/10 bg-white/[0.02] px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-blue-300">[≡]</span>
          <span className="text-xs font-semibold text-white">Thinking</span>
        </div>
        {collapsed ? (
          <ChevronDown className="h-3.5 w-3.5 text-white/40" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5 text-white/40" />
        )}
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Thinking text */}
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto px-3 py-2.5 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-blue-200/80"
          >
            {thinkingText || (
              <span className="text-white/30 italic">Waiting for Claude to think...</span>
            )}
          </div>

          {/* Token counter */}
          {totalTokens > 0 && (
            <div className="border-t border-white/10 bg-white/[0.02] px-3 py-2">
              <p className="text-xs text-blue-200/60">
                Tokens: {totalTokens.toLocaleString()} / {maxTokens.toLocaleString()}
              </p>
              {totalTokens > 0 && (
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-blue-500/70 transition-all duration-300"
                    style={{ width: `${Math.min((totalTokens / maxTokens) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
