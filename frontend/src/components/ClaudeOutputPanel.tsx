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

  // Remove markdown code block markers if present (```json ... ```)
  const cleanText = outputText
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '')
    .trim()

  const isJSON = cleanText.startsWith('{') || cleanText.startsWith('[')

  // Format JSON for display - handle partial/incomplete JSON with smart indentation
  const formattedText = isJSON
    ? (() => {
        try {
          // Try to parse and re-stringify complete JSON
          const parsed = JSON.parse(cleanText)
          return JSON.stringify(parsed, null, 2)
        } catch {
          // If parsing fails, apply manual formatting with indentation
          let indent = 0
          let result = ''
          let inString = false
          let previousChar = ''

          for (let i = 0; i < cleanText.length; i++) {
            const char = cleanText[i]

            // Handle string detection
            if (char === '"' && previousChar !== '\\') {
              inString = !inString
              result += char
            } else if (!inString) {
              // Format only outside of strings
              if (char === '{' || char === '[') {
                result += char
                const nextChar = cleanText[i + 1]
                if (nextChar && nextChar !== '}' && nextChar !== ']') {
                  indent++
                  result += '\n' + '  '.repeat(indent)
                }
              } else if (char === '}' || char === ']') {
                if (!result.endsWith('\n')) {
                  indent = Math.max(0, indent - 1)
                  result += '\n' + '  '.repeat(indent)
                } else {
                  indent = Math.max(0, indent - 1)
                }
                result += char
              } else if (char === ',') {
                result += char + '\n' + '  '.repeat(indent)
              } else if (char === ':') {
                result += char + ' '
              } else if (char === ' ' || char === '\n' || char === '\t') {
                // Skip whitespace unless we just added a newline
                if (!result.endsWith('\n')) {
                  result += ' '
                }
              } else {
                result += char
              }
            } else {
              // Inside string, preserve everything
              result += char
            }

            previousChar = char
          }

          return result.trim()
        }
      })()
    : cleanText

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
            isJSON ? (
              <div className="rounded-lg border border-white/10 bg-black/40 p-4">
                <SyntaxHighlighter
                  language="json"
                  style={nightOwl}
                  customStyle={{
                    backgroundColor: '#1a1a2e',
                    padding: '12px',
                    fontSize: '11px',
                    lineHeight: '1.6',
                    margin: 0,
                    borderRadius: '6px',
                  }}
                  wrapLines={true}
                  wrapLongLines={true}
                >
                  {formattedText}
                </SyntaxHighlighter>
              </div>
            ) : (
              <div className="rounded-lg border border-white/10 bg-black/40 p-4">
                <pre className="font-mono text-xs break-words whitespace-pre-wrap text-green-200/80">
                  {formattedText}
                </pre>
              </div>
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
