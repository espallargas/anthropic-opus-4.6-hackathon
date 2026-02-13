import { useEffect, useRef, useState } from 'react'
import { X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface CrawlProgressBoxProps {
  countryCode: string
  countryName: string
  messages: string[]
  setMessages: (messages: string[]) => void
  onComplete: () => void
  onDocCountUpdate?: (count: number) => void
}

interface ProgressItem {
  type: 'phase' | 'search' | 'save' | 'complete' | 'error'
  message: string
  status: 'pending' | 'in-progress' | 'done' | 'error'
}

export function CrawlProgressBox({
  countryCode,
  countryName,
  messages,
  setMessages,
  onComplete,
  onDocCountUpdate,
}: CrawlProgressBoxProps) {
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [documentCount, setDocumentCount] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new items appear
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [progressItems])

  useEffect(() => {
    const startCrawl = async () => {
      try {
        const response = await fetch(`/api/v1/admin/crawl/${countryCode}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          setProgressItems([
            { type: 'error', message: `Error: ${response.statusText}`, status: 'error' },
          ])
          setTimeout(() => {
            setIsComplete(true)
            setTimeout(() => onComplete(), 1200)
          }, 300)
          return
        }

        const reader = response.body?.getReader()
        if (!reader) {
          setProgressItems([{ type: 'error', message: 'No response stream', status: 'error' }])
          setTimeout(() => {
            setIsComplete(true)
            setTimeout(() => onComplete(), 1200)
          }, 300)
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''
        let currentSearch = 0
        const seenSearches = new Set<number>()

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
                const data = JSON.parse(jsonStr)

                if (data.type === 'crawl_progress') {
                  const msg = data.message

                  // Skip internal messages that shouldn't be shown
                  if (
                    msg.includes('Skipping existing') ||
                    msg.includes('Invoking Claude') ||
                    msg.includes('Processing search')
                  ) {
                    return
                  }

                  // Phase messages (starting, type, found existing)
                  if (
                    msg.includes('Starting crawl') ||
                    msg.includes('Crawl type') ||
                    msg.includes('Found')
                  ) {
                    setTimeout(() => {
                      setProgressItems((prev) => {
                        const updated = [...prev]
                        if (
                          updated.length > 0 &&
                          updated[updated.length - 1].status === 'pending'
                        ) {
                          return updated
                        }
                        return [...updated, { type: 'phase', message: msg, status: 'done' }]
                      })
                    }, 50)
                  }
                  // Agent calling tool messages
                  else if (msg.includes('Claude Agent: Calling')) {
                    currentSearch++
                    // Only add if we haven't seen this search number yet
                    if (!seenSearches.has(currentSearch)) {
                      seenSearches.add(currentSearch)
                      setTimeout(() => {
                        setProgressItems((prev) => [
                          ...prev,
                          {
                            type: 'search',
                            message: `🤖 Search ${currentSearch}/6`,
                            status: 'in-progress',
                          },
                        ])
                      }, 50)
                    }
                  } else if (msg.includes('web_search returned') && msg.includes('results')) {
                    setTimeout(() => {
                      setProgressItems((prev) => {
                        const updated = [...prev]
                        const lastIdx = updated.length - 1
                        if (lastIdx >= 0 && updated[lastIdx].status === 'in-progress') {
                          updated[lastIdx].status = 'done'
                        }
                        return updated
                      })
                    }, 50)
                  }
                  // Document count update
                  else if (msg.includes('Processed') && msg.includes('documents')) {
                    const match = msg.match(/(\d+)\s+documents/)
                    if (match) {
                      const count = parseInt(match[1])
                      setDocumentCount(count)
                      onDocCountUpdate?.(count)
                      setTimeout(() => {
                        setProgressItems((prev) => [
                          ...prev,
                          {
                            type: 'save',
                            message: `💾 Saving ${count} documents`,
                            status: 'in-progress',
                          },
                        ])
                      }, 50)
                    }
                  }
                  // Complete message
                  else if (msg.includes('complete') && msg.includes('documents')) {
                    setTimeout(() => {
                      setProgressItems((prev) => {
                        const updated = [...prev]
                        const lastIdx = updated.length - 1
                        if (lastIdx >= 0) {
                          updated[lastIdx].status = 'done'
                        }
                        return [
                          ...updated,
                          { type: 'complete', message: '✅ ' + msg, status: 'done' },
                        ]
                      })
                    }, 50)
                  }
                } else if (data.type === 'crawl_complete') {
                  setMessages((prev) => [...prev, '✓ Crawl complete!'])
                  setIsComplete(true)
                  setTimeout(() => onComplete(), 900)
                } else if (data.type === 'error') {
                  setProgressItems((prev) => [
                    ...prev,
                    { type: 'error', message: `Error: ${data.error}`, status: 'error' },
                  ])
                  setIsComplete(true)
                  setTimeout(() => onComplete(), 1500)
                }
              } catch (e) {
                console.error('Failed to parse SSE message:', e)
              }
            }
          }
        }
      } catch (error) {
        setProgressItems([{ type: 'error', message: `Connection error`, status: 'error' }])
        setIsComplete(true)
        setTimeout(() => onComplete(), 1500)
      }
    }

    startCrawl()
  }, [countryCode, setMessages, onComplete, onDocCountUpdate])

  const getIcon = (item: ProgressItem) => {
    if (item.status === 'done' || item.type === 'complete') {
      return <CheckCircle2 className="h-4 w-4 text-green-400/80" />
    }
    if (item.status === 'error') {
      return <AlertCircle className="h-4 w-4 text-red-400/80" />
    }
    if (item.status === 'in-progress') {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-400/80" />
    }
    return <div className="h-4 w-4 rounded-full border border-white/20" />
  }

  return (
    <div className="flex w-96 flex-col border-l border-white/10 bg-black/95">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold">{countryName}</h3>
          {documentCount > 0 && (
            <p className="mt-0.5 text-xs text-green-400/70">{documentCount} docs</p>
          )}
        </div>
        <button
          onClick={onComplete}
          className="text-white/40 transition-colors hover:text-white/80"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-1.5 text-xs">
          {progressItems.length === 0 ? (
            <div className="flex items-center gap-2 text-white/50">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Connecting...</span>
            </div>
          ) : (
            progressItems.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 transition-all duration-200 ${
                  item.status === 'done'
                    ? 'text-white/40'
                    : item.status === 'error'
                      ? 'text-red-400/70'
                      : 'text-white/60'
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">{getIcon(item)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono">{item.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isComplete && (
        <div className="border-t border-white/10 px-4 py-2 text-center">
          <p className="text-xs font-medium text-green-400/70">Complete</p>
        </div>
      )}
    </div>
  )
}
