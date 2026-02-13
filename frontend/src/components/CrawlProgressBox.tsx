import { useEffect, useRef, useState, useCallback } from 'react'
import { X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { CrawlerOperationGroup } from './CrawlerOperationGroup'
import '../styles/crawler.css'

interface CrawlProgressBoxProps {
  countryCode: string
  countryName: string
  onComplete: () => void
  onDocCountUpdate?: (count: number) => void
}

interface ProgressMessage {
  type: string
  [key: string]: string | number | boolean | undefined
}

interface OperationState {
  operationId: string
  category: string
  query: string
  index: number
  total: number
  status: 'pending' | 'running' | 'done' | 'error'
  messages: ProgressMessage[]
}

interface SSEMessage {
  type: string
  [key: string]: string | number | boolean | undefined
}

export function CrawlProgressBox({
  countryCode,
  countryName,
  onComplete,
  onDocCountUpdate,
}: CrawlProgressBoxProps) {
  const [operations, setOperations] = useState<Map<string, OperationState>>(new Map())
  const [operationOrder, setOperationOrder] = useState<string[]>([])
  const [statusMessages, setStatusMessages] = useState<ProgressMessage[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [documentCount, setDocumentCount] = useState(0)
  const [progressSummary, setProgressSummary] = useState<{ completed: number; total: number }>({
    completed: 0,
    total: 0,
  })
  const scrollRef = useRef<HTMLDivElement>(null)
  const crawlStartedRef = useRef(false)

  // Track doc count changes separately to avoid setState during render
  useEffect(() => {
    if (documentCount > 0 && onDocCountUpdate) {
      onDocCountUpdate(documentCount)
    }
  }, [documentCount, onDocCountUpdate])

  // Auto-scroll to bottom when new operations added, not on every update
  useEffect(() => {
    if (scrollRef.current && operationOrder.length > 0) {
      // Only scroll if we added a new operation (check last one)
      const lastOpId = operationOrder[operationOrder.length - 1]
      const lastOp = operations.get(lastOpId)
      if (lastOp && lastOp.messages.length <= 1) {
        // Just added, scroll down
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
          }
        }, 0)
      }
    }
  }, [operationOrder, operations])

  // Process incoming SSE messages
  const processMessage = useCallback(
    (data: SSEMessage) => {
      console.log(`[SSE] ${data.type}`, data)
      setOperations((prevOps) => {
        const newOps = new Map(prevOps)

        if (data.type === 'search_started') {
          // Create new operation
          const opId = data.operation_id
          newOps.set(opId, {
            operationId: opId,
            category: data.category,
            query: data.query,
            index: data.index,
            total: data.total,
            status: 'running',
            messages: [],
          })
          // Add to order if not already there
          setOperationOrder((prev) => (prev.includes(opId) ? prev : [...prev, opId]))
        } else if (data.type === 'search_result') {
          // Add result message to operation
          const opId = data.operation_id
          if (newOps.has(opId)) {
            const op = newOps.get(opId)!
            op.messages.push({
              type: 'search_result',
              message: `✅ Found ${data.result_count} results`,
              result_count: data.result_count,
            })
            op.status = 'done'
          }
        } else if (data.type === 'thinking') {
          // Add thinking to current or most recent operation
          const opId = data.operation_id
          if (opId && newOps.has(opId)) {
            const op = newOps.get(opId)!
            // Check if last message is thinking - if so, append
            const lastMsg = op.messages[op.messages.length - 1]
            if (lastMsg && lastMsg.type === 'thinking') {
              lastMsg.text = (lastMsg.text || '') + data.text
            } else {
              op.messages.push({
                type: 'thinking',
                text: data.text,
                is_summary: data.is_summary || false,
              })
            }
          }
        }

        // Handle status messages and special cases (outside the if/else chain)
        if (
          data.type !== 'search_started' &&
          data.type !== 'search_result' &&
          data.type !== 'thinking'
        ) {
          setStatusMessages((prev) => [...prev, data])
        }

        // Update progress summary
        if (data.type === 'search_started') {
          setProgressSummary((prev) => ({
            completed: prev.completed,
            total: data.total,
          }))
        }

        // Handle completion
        if (data.type === 'complete') {
          setDocumentCount(data.document_count || 0)
          setIsComplete(true)
          setTimeout(() => onComplete(), 1200)
        } else if (data.type === 'batch_saved') {
          setDocumentCount(data.total_saved || 0)
        } else if (data.type === 'error') {
          setIsComplete(true)
          setTimeout(() => onComplete(), 1500)
        }

        return newOps
      })
    },
    [onComplete],
  )

  useEffect(() => {
    // Reset the ref for this component instance
    crawlStartedRef.current = false

    // Prevent double-firing in React Strict Mode
    if (crawlStartedRef.current) {
      console.warn(
        `[CrawlProgressBox] ⚠️ DUPLICATE: Crawl already started for ${countryCode}, skipping`,
      )
      return
    }
    crawlStartedRef.current = true

    const startCrawl = async () => {
      try {
        console.log(`[CrawlProgressBox] ✅ Starting crawl for ${countryCode}`)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minutes

        const response = await fetch(`/api/v1/admin/crawl/${countryCode}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          setStatusMessages((prev) => [
            ...prev,
            {
              type: 'error',
              message: `Error: ${response.statusText}`,
            },
          ])
          setIsComplete(true)
          setTimeout(() => onComplete(), 1200)
          return
        }

        const reader = response.body?.getReader()
        if (!reader) {
          setStatusMessages((prev) => [
            ...prev,
            {
              type: 'error',
              message: 'No response stream',
            },
          ])
          setIsComplete(true)
          setTimeout(() => onComplete(), 1200)
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines[lines.length - 1]

          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim()
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6)
                const data = JSON.parse(jsonStr) as SSEMessage
                console.log(`[SSE received] type=${data.type}`)
                processMessage(data)
              } catch (e) {
                console.error('Failed to parse SSE message:', e)
              }
            }
          }
        }
      } catch (error) {
        console.error('Crawl connection error:', error)
        setStatusMessages((prev) => [
          ...prev,
          {
            type: 'error',
            message: 'Connection error',
          },
        ])
        setIsComplete(true)
        setTimeout(() => onComplete(), 1500)
      }
    }

    startCrawl()
  }, [countryCode, processMessage, onComplete])

  return (
    <div className="flex w-[600px] flex-col rounded-lg border border-white/10 bg-gradient-to-br from-black/98 via-black/95 to-black/98 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-3.5">
        <div className="flex-1">
          <h3 className="text-sm font-semibold tracking-tight text-white">{countryName}</h3>
          <div className="mt-1 flex items-center gap-3">
            {documentCount > 0 && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-400/80">
                <span>📊</span>
                <span>{documentCount} documents</span>
              </p>
            )}
            {progressSummary.total > 0 && (
              <p className="text-xs text-white/50">
                {progressSummary.completed}/{progressSummary.total} searches
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onComplete}
          className="text-white/40 transition-colors hover:text-white/80"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Main scroll area */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3 text-xs">
          {operationOrder.length === 0 && statusMessages.length === 0 ? (
            <div className="flex items-center gap-2 text-white/50">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Connecting to crawler...</span>
            </div>
          ) : (
            <>
              {/* Status messages (phase, timing, etc.) - filter out empty messages */}
              {statusMessages
                .filter((msg) => msg.message && msg.message.trim())
                .map((msg, idx) => (
                  <div
                    key={`status-${idx}`}
                    className={`animate-fadeIn flex items-start gap-2 rounded px-2 py-1 ${
                      msg.type === 'error' ? 'text-red-400/70' : 'text-white/50'
                    }`}
                    style={{ animation: 'fadeIn 0.3s ease-in-out' }}
                  >
                    {msg.type === 'error' ? (
                      <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-400/60" />
                    )}
                    <p className="font-mono break-words">{msg.message}</p>
                  </div>
                ))}

              {/* Operation groups */}
              {operationOrder.map((opId) => {
                const op = operations.get(opId)
                if (!op) return null
                return (
                  <CrawlerOperationGroup
                    key={opId}
                    operationId={op.operationId}
                    category={op.category}
                    query={op.query}
                    index={op.index}
                    total={op.total}
                    messages={op.messages}
                    status={op.status}
                  />
                )
              })}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      {isComplete && (
        <div className="border-t border-white/10 bg-white/[0.02] px-4 py-3 text-center">
          <p className="text-xs font-medium text-emerald-400/80">✓ Crawl complete</p>
        </div>
      )}
    </div>
  )
}
