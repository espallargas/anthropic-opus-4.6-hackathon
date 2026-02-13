import { useEffect, useRef, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { ThinkingPanel } from './ThinkingPanel'
import { CategoriesPanel, type CategoryStatus } from './CategoriesPanel'
import '../styles/crawler.css'

interface CrawlProgressBoxProps {
  countryCode: string
  countryName: string
  onComplete: () => void
  onDocCountUpdate?: (count: number) => void
}

interface SSEMessage {
  type: string
  [key: string]: string | number | boolean | undefined
}

interface CategoryState {
  id: string
  name: string
  description: string
  status: CategoryStatus
  resultCount: number
}

export function CrawlProgressBox({
  countryCode,
  countryName,
  onComplete,
  onDocCountUpdate,
}: CrawlProgressBoxProps) {
  const [thinkingText, setThinkingText] = useState('')
  const [categories, setCategories] = useState<CategoryState[]>([
    {
      id: 'federal_laws',
      name: 'Federal Laws',
      description: 'Constitutional & main laws',
      status: 'pending',
      resultCount: 0,
    },
    {
      id: 'regulations',
      name: 'Regulations',
      description: 'Official procedures',
      status: 'pending',
      resultCount: 0,
    },
    {
      id: 'consular',
      name: 'Consular Rules',
      description: 'Visa & embassies',
      status: 'pending',
      resultCount: 0,
    },
    {
      id: 'jurisdictional',
      name: 'Jurisdictional',
      description: 'Regional rules',
      status: 'pending',
      resultCount: 0,
    },
    {
      id: 'complementary',
      name: 'Health & Complementary',
      description: 'Health requirements',
      status: 'pending',
      resultCount: 0,
    },
    {
      id: 'auxiliary',
      name: 'Auxiliary',
      description: 'Statistics & quotas',
      status: 'pending',
      resultCount: 0,
    },
  ])
  const [statusMessages, setStatusMessages] = useState<string[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [documentCount, setDocumentCount] = useState(0)
  const [inputTokens, setInputTokens] = useState(0)
  const [outputTokens, setOutputTokens] = useState(0)

  const crawlStartedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  const processMessageRef = useRef<(data: SSEMessage) => void | null>(null)

  // Update refs whenever dependencies change
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Track doc count changes
  useEffect(() => {
    if (documentCount > 0 && onDocCountUpdate) {
      onDocCountUpdate(documentCount)
    }
  }, [documentCount, onDocCountUpdate])

  // Process incoming SSE messages
  const processMessage = useCallback((data: SSEMessage) => {
    console.log(`[SSE] ${data.type}`, data)

    if (data.type === 'thinking') {
      setThinkingText((prev) => prev + ((data.text as string) || ''))
    } else if (data.type === 'search_started') {
      const category = data.category as string
      setCategories((prev) =>
        prev.map((cat) =>
          cat.name === category ? { ...cat, status: 'searching' as CategoryStatus } : cat,
        ),
      )
    } else if (data.type === 'search_result') {
      const category = data.category as string
      const resultCount = (data.result_count as number) || 0
      setCategories((prev) =>
        prev.map((cat) =>
          cat.name === category ? { ...cat, status: 'done' as CategoryStatus, resultCount } : cat,
        ),
      )
    } else if (data.type === 'phase' && data.message) {
      setStatusMessages((prev) => [...prev, data.message as string])
    } else if (data.type === 'tokens') {
      setInputTokens((data.input_tokens as number) || 0)
      setOutputTokens((data.output_tokens as number) || 0)
    } else if (data.type === 'complete') {
      setDocumentCount((data.document_count as number) || 0)
      setIsComplete(true)
      setTimeout(() => onCompleteRef.current(), 1200)
    } else if (data.type === 'batch_saved') {
      setDocumentCount((data.total_saved as number) || 0)
    } else if (data.type === 'error') {
      setStatusMessages((prev) => [...prev, `Error: ${data.message}`])
      setCategories((prev) =>
        prev.map((cat) =>
          cat.status === 'searching' ? { ...cat, status: 'error' as CategoryStatus } : cat,
        ),
      )
      setIsComplete(true)
      setTimeout(() => onCompleteRef.current(), 1500)
    }
  }, [])

  // Update processMessageRef after it's defined
  useEffect(() => {
    processMessageRef.current = processMessage
  }, [processMessage])

  useEffect(() => {
    if (crawlStartedRef.current) {
      console.warn(`[CrawlProgressBox] ⚠️ DUPLICATE: Crawl already started for ${countryCode}`)
      return
    }
    crawlStartedRef.current = true

    const startCrawl = async () => {
      try {
        console.log(`[CrawlProgressBox] ✅ Starting crawl for ${countryCode}`)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 300000)

        const response = await fetch(`/api/v1/admin/crawl/${countryCode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          setStatusMessages((prev) => [...prev, `Error: ${response.statusText}`])
          setIsComplete(true)
          setTimeout(() => onCompleteRef.current(), 1200)
          return
        }

        const reader = response.body?.getReader()
        if (!reader) {
          setStatusMessages((prev) => [...prev, 'Error: No response stream'])
          setIsComplete(true)
          setTimeout(() => onCompleteRef.current(), 1200)
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''
        let messageCount = 0

        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            console.log(`[SSE] Stream ended. Total messages: ${messageCount}`)
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines[lines.length - 1]

          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim()
            if (line.startsWith('data: ')) {
              try {
                messageCount++
                const jsonStr = line.slice(6)
                const data = JSON.parse(jsonStr) as SSEMessage
                console.log(`[SSE] Message #${messageCount}: ${data.type}`)
                processMessageRef.current?.(data)
              } catch (e) {
                console.error('[SSE] Parse error:', e, 'line:', line.slice(0, 100))
              }
            }
          }
        }
      } catch (error) {
        console.error('Crawl connection error:', error)
        setStatusMessages((prev) => [...prev, 'Connection error'])
        setIsComplete(true)
        setTimeout(() => onCompleteRef.current(), 1500)
      }
    }

    startCrawl()
  }, [countryCode])

  return (
    <div className="flex h-[700px] w-[1000px] flex-col overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-black/98 via-black/95 to-black/98 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-white">{countryName}</h3>
          {documentCount > 0 && (
            <p className="mt-1 text-xs font-medium text-emerald-400/80">
              📊 {documentCount} documents
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

      {/* Main content - 2 column layout */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left: Thinking panel (40%) */}
        <div className="w-[40%] border-r border-white/10">
          <ThinkingPanel
            thinkingText={thinkingText}
            inputTokens={inputTokens}
            outputTokens={outputTokens}
          />
        </div>

        {/* Right: Categories + status (60%) */}
        <div className="flex w-[60%] flex-col">
          <CategoriesPanel categories={categories} />

          {/* Status messages footer */}
          {statusMessages.length > 0 && (
            <div className="max-h-24 overflow-y-auto border-t border-white/10 bg-white/[0.02] px-3 py-2.5 text-xs">
              <div className="space-y-1">
                {statusMessages.slice(-3).map((msg, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-white/60">
                    <span className="mt-0.5 flex-shrink-0">→</span>
                    <span className="break-words">{msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {isComplete && (
        <div className="border-t border-white/10 bg-white/[0.02] px-4 py-2.5 text-center">
          <p className="text-xs font-medium text-emerald-400/80">✓ Crawl complete</p>
        </div>
      )}
    </div>
  )
}
