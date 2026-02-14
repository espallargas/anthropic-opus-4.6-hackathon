import { ChevronUp, ChevronDown } from 'lucide-react'
import { useState, useEffect, useRef, useMemo } from 'react'
import type { ReactNode } from 'react'

interface ClaudeOutputPanelProps {
  outputText: string
  isExpanded?: boolean
}

// Simple JSON syntax highlighter
function highlightJSON(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  let i = 0

  while (i < text.length) {
    // Match JSON key (quoted strings followed by colon)
    const keyMatch = text.slice(i).match(/^"([^"\\]|\\.)*"(?=\s*:)/)
    if (keyMatch) {
      parts.push(
        <span key={`${i}-key`} className="text-blue-300">
          {keyMatch[0]}
        </span>,
      )
      i += keyMatch[0].length
      continue
    }

    // Match JSON string value (quoted strings not followed by colon)
    const stringMatch = text.slice(i).match(/^"([^"\\]|\\.)*"/)
    if (stringMatch) {
      parts.push(
        <span key={`${i}-str`} className="text-green-300">
          {stringMatch[0]}
        </span>,
      )
      i += stringMatch[0].length
      continue
    }

    // Match JSON numbers
    const numberMatch = text.slice(i).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/)
    if (numberMatch) {
      parts.push(
        <span key={`${i}-num`} className="text-yellow-300">
          {numberMatch[0]}
        </span>,
      )
      i += numberMatch[0].length
      continue
    }

    // Match JSON booleans and null
    const boolMatch = text.slice(i).match(/^(true|false|null)/)
    if (boolMatch) {
      parts.push(
        <span key={`${i}-bool`} className="text-pink-300">
          {boolMatch[0]}
        </span>,
      )
      i += boolMatch[0].length
      continue
    }

    // Match punctuation (brackets, braces, colons, commas)
    const punctMatch = text.slice(i).match(/^[{}\[\]:,]/)
    if (punctMatch) {
      parts.push(
        <span key={`${i}-punct`} className="text-white/80">
          {punctMatch[0]}
        </span>,
      )
      i += 1
      continue
    }

    // Match whitespace
    const wsMatch = text.slice(i).match(/^\s+/)
    if (wsMatch) {
      parts.push(<span key={`${i}-ws`}>{wsMatch[0]}</span>)
      i += wsMatch[0].length
      continue
    }

    // Any other character
    parts.push(<span key={`${i}-char`}>{text[i]}</span>)
    i += 1
  }

  return parts
}

export function ClaudeOutputPanel({ outputText, isExpanded = true }: ClaudeOutputPanelProps) {
  const [collapsed, setCollapsed] = useState(!isExpanded)
  const contentRef = useRef<HTMLDivElement>(null)
  const highlightedContent = useMemo(() => {
    // Only highlight if it looks like JSON
    if (outputText.trim().startsWith('{') || outputText.trim().startsWith('[')) {
      return highlightJSON(outputText)
    }
    return [<span key="0">{outputText}</span>]
  }, [outputText])

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
            <div className="break-words whitespace-pre-wrap">{highlightedContent}</div>
          ) : (
            <span className="text-white/30 italic">Waiting for Claude output...</span>
          )}
        </div>
      )}
    </div>
  )
}
