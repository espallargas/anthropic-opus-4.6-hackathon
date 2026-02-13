import { useEffect, useState } from 'react'
import { X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface CrawlProgressBoxProps {
  countryCode: string
  messages: string[]
  setMessages: (messages: string[]) => void
  onComplete: () => void
}

interface ProgressItem {
  type: 'phase' | 'search' | 'save' | 'complete' | 'error'
  message: string
  status: 'pending' | 'in-progress' | 'done' | 'error'
}

export function CrawlProgressBox({
  countryCode,
  messages,
  setMessages,
  onComplete,
}: CrawlProgressBoxProps) {
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([])
  const [isComplete, setIsComplete] = useState(false)

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
          setProgressItems([{ type: 'error', message: `Error: ${response.statusText}`, status: 'error' }])
          setTimeout(() => {
            setIsComplete(true)
            setTimeout(() => onComplete(), 1500)
          }, 500)
          return
        }

        const reader = response.body?.getReader()
        if (!reader) {
          setProgressItems([{ type: 'error', message: 'No response stream', status: 'error' }])
          setTimeout(() => {
            setIsComplete(true)
            setTimeout(() => onComplete(), 1500)
          }, 500)
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''
        let currentSearch = 0

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

                  // Phase messages (starting, type, found existing)
                  if (msg.includes('Starting crawl') || msg.includes('Crawl type') || msg.includes('Found')) {
                    setProgressItems((prev) => {
                      const updated = [...prev]
                      if (updated.length > 0 && updated[updated.length - 1].status === 'pending') {
                        return updated
                      }
                      return [...updated, { type: 'phase', message: msg, status: 'done' }]
                    })
                  }
                  // Search messages
                  else if (msg.includes('Claude called') || msg.includes('Found') || msg.includes('results')) {
                    if (msg.includes('Claude called')) {
                      currentSearch++
                      setProgressItems((prev) => [
                        ...prev,
                        { type: 'search', message: `Search ${currentSearch}/6`, status: 'in-progress' },
                      ])
                    } else if (msg.includes('Found') && msg.includes('results')) {
                      setProgressItems((prev) => {
                        const updated = [...prev]
                        const lastIdx = updated.length - 1
                        if (lastIdx >= 0 && updated[lastIdx].status === 'in-progress') {
                          updated[lastIdx].status = 'done'
                        }
                        return updated
                      })
                    }
                  }
                  // Save messages
                  else if (msg.includes('Saving') || msg.includes('Processed')) {
                    if (msg.includes('Processed')) {
                      const match = msg.match(/(\d+)\s+documents/)
                      if (match) {
                        setProgressItems((prev) => [
                          ...prev,
                          { type: 'save', message: `Saving ${match[1]} documents`, status: 'in-progress' },
                        ])
                      }
                    }
                  }
                  // Complete message
                  else if (msg.includes('Crawl complete') || msg.includes('documents stored')) {
                    setProgressItems((prev) => {
                      const updated = [...prev]
                      const lastIdx = updated.length - 1
                      if (lastIdx >= 0) {
                        updated[lastIdx].status = 'done'
                      }
                      return [...updated, { type: 'complete', message: msg, status: 'done' }]
                    })
                  }
                } else if (data.type === 'crawl_complete') {
                  setMessages((prev) => [...prev, '✓ Crawl complete!'])
                  setIsComplete(true)
                  setTimeout(() => onComplete(), 1500)
                } else if (data.type === 'error') {
                  setProgressItems((prev) => [...prev, { type: 'error', message: `Error: ${data.error}`, status: 'error' }])
                  setIsComplete(true)
                  setTimeout(() => onComplete(), 2000)
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
        setTimeout(() => onComplete(), 2000)
      }
    }

    startCrawl()
  }, [countryCode, setMessages, onComplete])

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
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="flex w-full max-w-2xl h-96 flex-col border border-white/10 bg-black/98 rounded-lg shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold tracking-tight">Crawling Legislation</h3>
            {!isComplete && <Loader2 className="h-4 w-4 animate-spin text-blue-400/60" />}
          </div>
          <button
            onClick={onComplete}
            className="text-white/40 hover:text-white/80 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="space-y-3">
            {progressItems.length === 0 ? (
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Connecting...</span>
              </div>
            ) : (
              progressItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 text-sm transition-all duration-300 ${
                    item.status === 'done' ? 'text-white/60' : item.status === 'error' ? 'text-red-400/70' : 'text-white/80'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">{getIcon(item)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-mono leading-relaxed">{item.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {isComplete && (
          <div className="border-t border-white/10 px-6 py-3 text-center">
            <p className="text-xs text-green-400/70 font-medium">Closing in 1.5s...</p>
          </div>
        )}
      </div>
    </div>
  )
}
