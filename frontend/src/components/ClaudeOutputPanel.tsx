import { ChevronUp, ChevronDown } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'

interface ClaudeOutputPanelProps {
  outputText: string
  isExpanded?: boolean
}

function formatJSON(text: string): string {
  try {
    // First try to complete the JSON if it's incomplete
    let testText = text
    const openBraces = (testText.match(/{/g) || []).length
    const closeBraces = (testText.match(/}/g) || []).length
    const openBrackets = (testText.match(/\[/g) || []).length
    const closeBrackets = (testText.match(/]/g) || []).length

    if (openBraces > closeBraces) {
      testText += '}'.repeat(openBraces - closeBraces)
    }
    if (openBrackets > closeBrackets) {
      testText += ']'.repeat(openBrackets - closeBrackets)
    }

    // Parse and format
    const parsed = JSON.parse(testText)
    return JSON.stringify(parsed, null, 2)
  } catch {
    // If parsing fails, return as-is
    return text
  }
}

export function ClaudeOutputPanel({ outputText, isExpanded = true }: ClaudeOutputPanelProps) {
  const [collapsed, setCollapsed] = useState(!isExpanded)
  const contentRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLPreElement>(null)

  // Remove markdown code block markers if present (```json ... ```)
  const cleanText = outputText
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '')
    .trim()

  const isJSON = cleanText.startsWith('{') || cleanText.startsWith('[')

  // Format JSON
  const formattedText = isJSON ? formatJSON(cleanText) : cleanText

  useEffect(() => {
    if (contentRef.current && outputText) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [outputText])

  // Highlight when content updates
  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.textContent = formattedText
      hljs.highlightElement(highlightRef.current)
    }
  }, [formattedText])

  return (
    <div className="flex h-full flex-col border border-white/5 bg-black/20">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between gap-2 border-b border-white/10 bg-white/[0.02] px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
      >
        <div className="flex items-center gap-2">
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
        <div ref={contentRef} className="flex-1 overflow-auto bg-black/20 p-4">
          {outputText ? (
            <div className="rounded-lg border border-white/10 bg-black/40 p-4">
              <pre
                ref={highlightRef}
                className="language-json font-mono text-xs break-words whitespace-pre-wrap"
              >
                {formattedText}
              </pre>
            </div>
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
