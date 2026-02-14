import { ChevronUp, ChevronDown } from 'lucide-react'
import { useState, useEffect, useRef, type ReactNode } from 'react'

interface ClaudeOutputPanelProps {
  outputText: string
  isExpanded?: boolean
}

function formatJSON(text: string): string {
  try {
    // Try to parse as complete JSON first
    const parsed = JSON.parse(text)
    return JSON.stringify(parsed, null, 2)
  } catch {
    // If parsing fails, try to complete incomplete JSON
    try {
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

      const parsed = JSON.parse(testText)
      return JSON.stringify(parsed, null, 2)
    } catch {
      // If still failing, do manual pretty-print without parsing
      return prettyPrintJSON(text)
    }
  }
}

function prettyPrintJSON(text: string): string {
  let result = ''
  let indent = 0
  let inString = false
  let prevChar = ''

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    // Handle string detection
    if (char === '"' && prevChar !== '\\') {
      inString = !inString
      result += char
    } else if (!inString) {
      if (char === '{' || char === '[') {
        result += char
        indent++
        if (nextChar && nextChar !== '}' && nextChar !== ']') {
          result += '\n' + '  '.repeat(indent)
        }
      } else if (char === '}' || char === ']') {
        indent = Math.max(0, indent - 1)
        if (result.trimEnd().endsWith('\n' + '  '.repeat(indent + 1))) {
          result = result.trimEnd() + '\n' + '  '.repeat(indent) + char
        } else {
          result += '\n' + '  '.repeat(indent) + char
        }
      } else if (char === ':') {
        result += ': '
        if (nextChar === ' ') i++ // Skip next space if it exists
      } else if (char === ',') {
        result += ',\n' + '  '.repeat(indent)
      } else if (char !== ' ' && char !== '\n' && char !== '\t') {
        result += char
      }
    } else {
      result += char
    }

    prevChar = char
  }

  return result.trim()
}

function syntaxHighlightJSON(text: string): ReactNode[] {
  const lines = text.split('\n')
  const result: ReactNode[] = []

  lines.forEach((line, lineIdx) => {
    const elements: ReactNode[] = []
    let i = 0

    while (i < line.length) {
      // Handle whitespace
      if (line[i] === ' ') {
        elements.push(<span key={`${lineIdx}-ws-${i}`}> </span>)
        i++
      }
      // Handle string (quoted text)
      else if (line[i] === '"') {
        let str = '"'
        i++
        while (i < line.length && !(line[i] === '"' && line[i - 1] !== '\\')) {
          str += line[i]
          i++
        }
        if (i < line.length) str += '"'
        i++

        // Check if it's a key or value
        const afterStr = line.slice(i).trimStart()
        if (afterStr.startsWith(':')) {
          // It's a key
          elements.push(
            <span key={`${lineIdx}-key-${i}`} className="text-red-300">
              {str}
            </span>,
          )
        } else {
          // It's a string value
          elements.push(
            <span key={`${lineIdx}-str-${i}`} className="text-green-300">
              {str}
            </span>,
          )
        }
      }
      // Handle numbers
      else if (/\d/.test(line[i]) || (line[i] === '-' && /\d/.test(line[i + 1]))) {
        let num = ''
        while (i < line.length && /[\d.]/.test(line[i])) {
          num += line[i]
          i++
        }
        elements.push(
          <span key={`${lineIdx}-num-${i}`} className="text-orange-300">
            {num}
          </span>,
        )
      }
      // Handle booleans and null
      else if (line.slice(i, i + 4) === 'true') {
        elements.push(
          <span key={`${lineIdx}-bool-${i}`} className="text-blue-300">
            true
          </span>,
        )
        i += 4
      } else if (line.slice(i, i + 5) === 'false') {
        elements.push(
          <span key={`${lineIdx}-bool-${i}`} className="text-blue-300">
            false
          </span>,
        )
        i += 5
      } else if (line.slice(i, i + 4) === 'null') {
        elements.push(
          <span key={`${lineIdx}-null-${i}`} className="text-gray-400">
            null
          </span>,
        )
        i += 4
      }
      // Handle punctuation
      else if (/[{}[\]:,]/.test(line[i])) {
        elements.push(
          <span key={`${lineIdx}-punct-${i}`} className="text-white">
            {line[i]}
          </span>,
        )
        i++
      }
      // Handle other characters
      else {
        elements.push(<span key={`${lineIdx}-other-${i}`}>{line[i]}</span>)
        i++
      }
    }

    result.push(
      <div key={`line-${lineIdx}`}>
        {elements}
        {lineIdx < lines.length - 1 && '\n'}
      </div>,
    )
  })

  return result
}

export function ClaudeOutputPanel({ outputText, isExpanded = true }: ClaudeOutputPanelProps) {
  const [collapsed, setCollapsed] = useState(!isExpanded)
  const contentRef = useRef<HTMLDivElement>(null)

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
              <pre className="font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
                {isJSON ? syntaxHighlightJSON(formattedText) : formattedText}
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
