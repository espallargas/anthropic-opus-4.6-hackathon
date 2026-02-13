import { useState } from 'react'
import { ChevronDown, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import '../styles/crawler.css'

interface OperationMessage {
  type: string
  message?: string
  text?: string
  is_summary?: boolean
  result_count?: number
  status: 'pending' | 'in-progress' | 'done' | 'error'
}

interface CrawlerOperationGroupProps {
  operationId: string
  category: string
  query: string
  index: number
  total: number
  messages: OperationMessage[]
  status: 'pending' | 'running' | 'done' | 'error'
}

export function CrawlerOperationGroup({
  operationId,
  category,
  query,
  index,
  total,
  messages,
  status,
}: CrawlerOperationGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const thinkingBlocks = messages.filter((m) => m.type === 'thinking')
  const resultMessages = messages.filter((m) => m.type === 'search_result')

  const getStatusIcon = () => {
    switch (status) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-400/80" />
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-400/80" />
      case 'done':
        return <CheckCircle2 className="h-4 w-4 text-green-400/80" />
      default:
        return <div className="h-4 w-4 rounded-full border border-white/20" />
    }
  }


  const getStatusLabel = () => {
    switch (status) {
      case 'error':
        return 'Error'
      case 'running':
        return 'Searching'
      case 'done':
        return 'Complete'
      default:
        return 'Pending'
    }
  }

  return (
    <div className="operation-group space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between gap-2 text-left focus:outline-none"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0">{getStatusIcon()}</div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-semibold text-white truncate">{category}</p>
              <span
                className={`status-badge ${status === 'error' ? 'error' : status === 'running' ? 'running' : status === 'done' ? 'done' : 'pending'}`}
              >
                {getStatusLabel()}
              </span>
              <span className="text-xs text-white/50">
                {index}/{total}
              </span>
            </div>
            <p className="mt-1 text-xs text-white/60 truncate">Query: {query}</p>
          </div>
        </div>

        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-white/40 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="space-y-2 border-t border-white/10 pt-2 animate-fadeIn">
          {/* Thinking blocks */}
          {thinkingBlocks.length > 0 && (
            <div className="space-y-2">
              {thinkingBlocks.map((block, idx) => (
                <div key={`thinking-${operationId}-${idx}`} className="thinking-block">
                  <p className="text-xs font-semibold text-blue-300 mb-1.5">Claude is thinking...</p>
                  <p className="break-words whitespace-pre-wrap font-mono text-xs text-blue-200/80 leading-relaxed max-h-32 overflow-auto">
                    {block.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Result messages */}
          {resultMessages.length > 0 && (
            <div className="space-y-1">
              {resultMessages.map((msg, idx) => (
                <p key={`result-${operationId}-${idx}`} className="text-xs text-white/60 flex items-center gap-1.5">
                  <span>✓</span>
                  <span>{msg.message || `Found ${msg.result_count || 0} results`}</span>
                </p>
              ))}
            </div>
          )}

          {/* Empty state */}
          {thinkingBlocks.length === 0 && resultMessages.length === 0 && (
            <p className="text-xs text-white/40 italic">No details yet</p>
          )}
        </div>
      )}
    </div>
  )
}
