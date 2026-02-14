import { ChevronUp, ChevronDown } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import prettier from 'prettier/standalone'
import parserBabel from 'prettier/plugins/babel'

interface ClaudeOutputPanelProps {
  outputText: string
  isExpanded?: boolean
}

async function formatJSON(text: string): Promise<string> {
  try {
    return await prettier.format(text, {
      plugins: [parserBabel],
      parser: 'json',
      printWidth: 80,
      tabWidth: 2,
    })
  } catch {
    // If formatting fails, return as-is
    return text
  }
}

export function ClaudeOutputPanel({ outputText, isExpanded = true }: ClaudeOutputPanelProps) {
  const [collapsed, setCollapsed] = useState(!isExpanded)
  const [formattedText, setFormattedText] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current && outputText) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [outputText])

  // Remove markdown code block markers if present (```json ... ```)
  const cleanText = outputText
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '')
    .trim()

  const isJSON = cleanText.startsWith('{') || cleanText.startsWith('[')

  // Format JSON with Prettier
  useEffect(() => {
    if (isJSON && cleanText) {
      formatJSON(cleanText).then(setFormattedText)
    } else {
      setFormattedText(cleanText)
    }
  }, [cleanText, isJSON])

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
              <pre className="font-mono text-xs break-words whitespace-pre-wrap text-blue-200/90">
                {formattedText || cleanText}
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
