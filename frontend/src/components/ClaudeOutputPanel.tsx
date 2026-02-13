import { ChevronUp, ChevronDown } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface ClaudeOutputPanelProps {
  outputText: string
  isExpanded?: boolean
}

export function ClaudeOutputPanel({ outputText, isExpanded = true }: ClaudeOutputPanelProps) {
  const [collapsed, setCollapsed] = useState(!isExpanded)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current && outputText) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [outputText])

  return (
    <div className="flex h-full flex-col border-r border-white/10 bg-green-500/5">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between gap-2 border-b border-white/10 bg-white/[0.02] px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-green-300">[↻]</span>
          <span className="text-xs font-semibold text-white">Claude Output</span>
        </div>
        {collapsed ? (
          <ChevronDown className="h-3.5 w-3.5 text-white/40" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5 text-white/40" />
        )}
      </button>

      {/* Content */}
      {!collapsed && (
        <div
          ref={contentRef}
          className="flex-1 overflow-x-auto overflow-y-auto bg-black/20 px-3 py-2.5 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-green-200/80"
        >
          {outputText ? (
            outputText
          ) : (
            <span className="text-white/30 italic">Waiting for Claude output...</span>
          )}
        </div>
      )}
    </div>
  )
}
