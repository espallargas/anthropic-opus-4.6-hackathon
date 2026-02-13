import { useEffect, useRef, useState, useCallback } from 'react'
import { X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface CrawlProgressBoxProps {
  countryCode: string
  countryName: string
  onComplete: () => void
  onDocCountUpdate?: (count: number) => void
}

interface ProgressItem {
  type: 'phase' | 'search' | 'search_result' | 'thinking' | 'complete' | 'error' | 'timing' | 'batch_saved'
  message?: string
  text?: string
  category?: string
  query?: string
  is_summary?: boolean
  count?: number
  total?: number
  result_count?: number
  document_count?: number
  total_saved?: number
  elapsed_ms?: number
  status: 'pending' | 'in-progress' | 'done' | 'error'
}

interface SSEMessage {
  type: string
  [key: string]: any
}

export function CrawlProgressBox({
  countryCode,
  countryName,
  onComplete,
  onDocCountUpdate,
}: CrawlProgressBoxProps) {
  const [currentStatus, setCurrentStatus] = useState<ProgressItem | null>(null)
  const [completedItems, setCompletedItems] = useState<ProgressItem[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [documentCount, setDocumentCount] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const crawlStartedRef = useRef(false)

  const memoizedOnDocCountUpdate = useCallback(
    (count: number) => {
      if (onDocCountUpdate) {
        onDocCountUpdate(count)
      }
    },
    [onDocCountUpdate]
  )

  // Auto-scroll to bottom when new items appear
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [currentStatus, completedItems])

  // Message handler registry - clean, extensible pattern
  const messageHandlers: Record<string, (data: any) => ProgressItem | null> = {
    phase: (data) => ({
      type: 'phase',
      message: data.message,
      status: 'done'
    }),

    search: (data) => ({
      type: 'search',
      message: `🔍 Search ${data.count}/${data.total}: ${data.category}\n   Query: "${data.query}"`,
      status: 'in-progress'
    }),

    search_result: (data) => ({
      type: 'search_result',
      message: `✅ Found ${data.result_count} results`,
      status: 'done'
    }),

    thinking: (data) => ({
      type: 'thinking',
      text: data.text,
      is_summary: data.is_summary || false,
      message: `🧠 Claude is thinking${data.is_summary ? ' (summarized)' : ''}...`,
      status: 'in-progress'
    }),

    claude_text: (data) => ({
      type: 'search',
      message: `💭 Claude: ${data.text}`,
      status: 'in-progress'
    }),

    timing: (data) => ({
      type: 'timing',
      message: `✓ ${data.message} (${data.elapsed_ms}ms)`,
      status: 'done'
    }),

    warning: (data) => ({
      type: 'phase',
      message: `⚠ ${data.message}`,
      status: 'done'
    }),

    batch_saved: (data) => ({
      type: 'batch_saved',
      message: `📊 ${data.total_saved} documents stored`,
      total_saved: data.total_saved,
      status: 'done'
    }),

    error: (data) => ({
      type: 'error',
      message: `Error: ${data.message}`,
      status: 'error'
    }),

    complete: (data) => ({
      type: 'complete',
      message: `✅ Crawl complete: ${data.document_count} documents stored`,
      document_count: data.document_count,
      status: 'done'
    }),

    // Skip these message types (no UI representation)
    debug: () => null,
    tool_use: () => null,
  }

  useEffect(() => {
    // Prevent double-firing in React Strict Mode
    if (crawlStartedRef.current) {
      console.log(`[CrawlProgressBox] Crawl already started, skipping duplicate`)
      return
    }
    crawlStartedRef.current = true

    const startCrawl = async () => {
      try {
        console.log(`[CrawlProgressBox] Starting crawl for ${countryCode}`)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minutes - crawling can take time with Claude

        const response = await fetch(`/api/v1/admin/crawl/${countryCode}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          setCurrentStatus({
            type: 'error',
            message: `Error: ${response.statusText}`,
            status: 'error'
          })
          setIsComplete(true)
          setTimeout(() => onComplete(), 1200)
          return
        }

        const reader = response.body?.getReader()
        if (!reader) {
          setCurrentStatus({
            type: 'error',
            message: 'No response stream',
            status: 'error'
          })
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

                const handler = messageHandlers[data.type]
                if (!handler) {
                  console.warn(`Unknown message type: ${data.type}`)
                  continue
                }

                const progressItem = handler(data)
                if (!progressItem) {
                  // Skip messages with no UI representation
                  continue
                }

                // Log the message for debugging
                if (data.type === 'thinking') {
                  console.log(`[SSE THINKING] text length: ${progressItem.text?.length} chars`)
                }

                // Update UI with smooth transitions
                setTimeout(() => {
                  // Special handling for thinking blocks: accumulate text in a single thinking item
                  if (data.type === 'thinking') {
                    // Check if last item is thinking - if so, append text to it
                    setCompletedItems((prev) => {
                      const lastItem = prev[prev.length - 1]
                      if (lastItem && lastItem.type === 'thinking') {
                        // Append to existing thinking block
                        return [
                          ...prev.slice(0, -1),
                          {
                            ...lastItem,
                            text: (lastItem.text || '') + progressItem.text
                          }
                        ]
                      } else {
                        // New thinking block
                        return [...prev, progressItem]
                      }
                    })
                  } else if (data.type === 'phase' || data.type === 'search' || data.type === 'search_result' || data.type === 'timing' || data.type === 'warning' || data.type === 'batch_saved') {
                    // Progress messages go directly to completed items (always visible, never replaced)
                    setCompletedItems((prev) => [...prev, progressItem])
                    // Update document count from batch_saved messages
                    if (data.type === 'batch_saved' && progressItem.total_saved) {
                      setDocumentCount(progressItem.total_saved)
                      memoizedOnDocCountUpdate(progressItem.total_saved)
                    }
                  } else {
                    // Status-bearing messages (claude_text, etc.) go to currentStatus
                    if (currentStatus && currentStatus.status === 'in-progress') {
                      const completedItem = { ...currentStatus, status: 'done' }
                      setCompletedItems((prev) => [...prev, completedItem])
                    }
                    setCurrentStatus(progressItem)
                  }

                  // Handle special cases
                  if (data.type === 'complete') {
                    setDocumentCount(data.document_count || 0)
                    memoizedOnDocCountUpdate(data.document_count || 0)
                    setIsComplete(true)
                    setTimeout(() => onComplete(), 1200)
                  } else if (data.type === 'error') {
                    setIsComplete(true)
                    setTimeout(() => onComplete(), 1500)
                  }
                }, 200)

              } catch (e) {
                console.error('Failed to parse SSE message:', e)
              }
            }
          }
        }
      } catch (error) {
        console.error('Crawl connection error:', error)
        setCurrentStatus({
          type: 'error',
          message: 'Connection error',
          status: 'error'
        })
        setIsComplete(true)
        setTimeout(() => onComplete(), 1500)
      }
    }

    startCrawl()
  }, [countryCode])

  const getIcon = (item: ProgressItem) => {
    if (item.status === 'error') {
      return <AlertCircle className="h-4 w-4 text-red-400/80" />
    }
    if (item.status === 'in-progress') {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-400/80" />
    }
    if (item.status === 'done' || item.type === 'complete') {
      return <CheckCircle2 className="h-4 w-4 text-green-400/80" />
    }
    return <div className="h-4 w-4 rounded-full border border-white/20" />
  }

  const formatTime = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  return (
    <div className="flex w-[600px] flex-col rounded-lg border border-white/10 bg-gradient-to-br from-black/98 via-black/95 to-black/98 shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-3.5">
        <div className="flex-1">
          <h3 className="text-sm font-semibold tracking-tight text-white">{countryName}</h3>
          {documentCount > 0 && (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-400/80">
              <span>📊</span>
              <span>{documentCount} documents stored</span>
            </p>
          )}
        </div>
        <button
          onClick={onComplete}
          className="text-white/40 transition-colors hover:text-white/80"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3 text-xs">
          {completedItems.length === 0 && !currentStatus ? (
            <div className="flex items-center gap-2 text-white/50">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Connecting to crawler...</span>
            </div>
          ) : (
            <>
              {/* Completed items */}
              {completedItems.map((item, idx) => (
                <div
                  key={`completed-${idx}`}
                  className={`animate-fadeIn flex items-start gap-3 transition-all duration-200 ${
                    item.status === 'done'
                      ? 'text-white/50'
                      : item.status === 'error'
                        ? 'text-red-400/70'
                        : 'text-white/60'
                  }`}
                  style={{
                    animation: 'fadeIn 0.3s ease-in-out'
                  }}
                >
                  <div className="mt-1 flex-shrink-0">{getIcon(item)}</div>
                  <div className="min-w-0 flex-1">
                    {item.type === 'thinking' ? (
                      // Thinking blocks - Anthropic style floating box
                      <div className="rounded-lg bg-gradient-to-br from-blue-950/40 to-blue-900/20 border border-blue-700/40 p-3 my-2 shadow-lg">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 text-base">🧠</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-blue-300 mb-2">Claude is thinking...</p>
                            <p className="break-words whitespace-pre-wrap font-mono text-xs text-blue-200/80 leading-relaxed max-h-40 overflow-hidden">
                              {item.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Regular messages
                      <div className="flex flex-col gap-0.5">
                        {item.message && (
                          <p className="break-words whitespace-pre-wrap font-mono leading-relaxed">{item.message}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Current status (loading) */}
              {currentStatus && (
                <div
                  className={`flex items-start gap-3 transition-all duration-200 p-1.5 rounded ${
                    currentStatus.status === 'in-progress'
                      ? 'text-white/60'
                      : currentStatus.status === 'error'
                        ? 'text-red-400/70'
                        : 'text-white/40'
                  }`}
                >
                  <div className="mt-1 flex-shrink-0">{getIcon(currentStatus)}</div>
                  <div className="min-w-0 flex-1">
                    {currentStatus.type === 'thinking' ? (
                      // Thinking blocks - in-progress view
                      <div className="rounded-lg bg-gradient-to-br from-blue-950/40 to-blue-900/20 border border-blue-700/40 p-3 shadow-lg">
                        <p className="text-xs font-semibold text-blue-300 mb-2">Claude is thinking...</p>
                        {currentStatus.text && (
                          <p className="break-words whitespace-pre-wrap font-mono text-xs text-blue-200/80 leading-relaxed max-h-48 overflow-auto">
                            {currentStatus.text}
                          </p>
                        )}
                      </div>
                    ) : (
                      // Regular messages
                      <div className="flex flex-col gap-0.5">
                        {currentStatus.message && (
                          <p className="break-words whitespace-pre-wrap font-mono leading-relaxed">
                            {currentStatus.message}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {isComplete && (
        <div className="border-t border-white/10 bg-white/[0.02] px-4 py-3 text-center">
          <p className="text-xs font-medium text-emerald-400/80">✓ Crawl complete</p>
        </div>
      )}
    </div>
  )
}
