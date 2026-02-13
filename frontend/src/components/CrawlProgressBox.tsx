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
    const startCrawl = async () => {
      try {
        const response = await fetch(`/api/v1/admin/crawl/${countryCode}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          setMessages((prev) => [...prev, `❌ Error: ${response.statusText}`])
          setTimeout(() => onComplete(), 2000)
          return
        }

        const reader = response.body?.getReader()
        if (!reader) {
          setMessages((prev) => [...prev, '❌ No response stream'])
          setTimeout(() => onComplete(), 2000)
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')

          // Keep the last incomplete line in buffer
          buffer = lines[lines.length - 1]

          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim()
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6)
                const data = JSON.parse(jsonStr)

                if (data.type === 'crawl_progress') {
                  setMessages((prev) => [...prev, data.message])
                } else if (data.type === 'crawl_complete') {
                  setMessages((prev) => [...prev, '✓ Crawl complete!'])
                  setTimeout(() => onComplete(), 1000)
                } else if (data.type === 'error') {
                  setMessages((prev) => [...prev, `❌ Error: ${data.error}`])
                  setTimeout(() => onComplete(), 2000)
                }
              } catch (e) {
                console.error('Failed to parse SSE message:', e)
              }
            }
          }
        }
      } catch (error) {
        setMessages((prev) => [...prev, `❌ Connection error: ${String(error)}`])
        setTimeout(() => onComplete(), 2000)
      }
    }

    startCrawl()
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
