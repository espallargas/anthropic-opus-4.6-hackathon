import { ChevronUp, ChevronDown } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { nightOwl } from 'react-syntax-highlighter/dist/esm/styles/hljs'

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

  const isJSON = outputText.trim().startsWith('{') || outputText.trim().startsWith('[')

  // Format JSON for display with proper indentation
  const formattedText = isJSON
    ? (() => {
        try {
          // Parse and re-stringify to ensure proper formatting
          const parsed = JSON.parse(outputText)
          return JSON.stringify(parsed, null, 2)
        } catch {
          // If parsing fails, return as-is
          return outputText
        }
      })()
    : outputText

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
        <div ref={contentRef} className="flex-1 overflow-auto bg-black/20">
          {outputText ? (
            isJSON ? (
              <SyntaxHighlighter
                language="json"
                style={nightOwl}
                customStyle={{
                  backgroundColor: 'transparent',
                  padding: '12px',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  margin: 0,
                }}
                wrapLines={true}
                wrapLongLines={true}
              >
                {formattedText}
              </SyntaxHighlighter>
            ) : (
              <pre className="px-3 py-2.5 font-mono text-xs break-words whitespace-pre-wrap text-green-200/80">
                {formattedText}
              </pre>
            )
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-xs text-white/30 italic">Waiting for Claude output...</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
