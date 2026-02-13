import { useEffect } from 'react'
import { X } from 'lucide-react'

interface CrawlProgressBoxProps {
  countryCode: string
  messages: string[]
  setMessages: (messages: string[]) => void
  onComplete: () => void
}

export function CrawlProgressBox({
  countryCode,
  messages,
  setMessages,
  onComplete,
}: CrawlProgressBoxProps) {
  useEffect(() => {
    const eventSource = new EventSource(`/api/v1/admin/crawl/${countryCode}`)

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'crawl_progress') {
          setMessages((prev) => [...prev, data.message])
        } else if (data.type === 'crawl_complete') {
          setMessages((prev) => [...prev, '✓ Crawl complete!'])
          eventSource.close()
          setTimeout(() => onComplete(), 1000)
        } else if (data.type === 'error') {
          setMessages((prev) => [...prev, `❌ Error: ${data.error}`])
          eventSource.close()
          setTimeout(() => onComplete(), 2000)
        }
      } catch (e) {
        console.error('Failed to parse SSE message:', e)
      }
    }

    eventSource.addEventListener('message', handleMessage)
    eventSource.addEventListener('error', () => {
      eventSource.close()
      setTimeout(() => onComplete(), 1000)
    })

    return () => {
      eventSource.close()
    }
  }, [countryCode, setMessages, onComplete])

  return (
    <div className="flex w-96 flex-col border-l border-white/10 bg-black/95">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="font-semibold">Crawl Progress</h3>
        <button
          onClick={onComplete}
          className="text-white/50 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-2 font-mono text-sm">
          {messages.map((msg, idx) => (
            <div key={idx} className="text-white/80">
              {msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
