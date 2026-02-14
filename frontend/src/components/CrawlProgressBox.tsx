import { useEffect, useRef, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { ThinkingPanel } from './ThinkingPanel'
import { CategoriesPanel, type CategoryStatus } from './CategoriesPanel'
import { ClaudeOutputPanel } from './ClaudeOutputPanel'
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
  searchQuery?: string
  searchIndex?: number
  searchTotal?: number
}

export function CrawlProgressBox({
  countryCode,
  countryName,
  onComplete,
  onDocCountUpdate,
}: CrawlProgressBoxProps) {
  const [thinkingText, setThinkingText] = useState('')
  const [claudeOutputText, setClaudeOutputText] = useState('')
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
    console.log(`[SSE] Message type: ${data.type}`, data)

    if (data.type === 'thinking') {
      const text = (data.text as string) || ''
      if (text) {
        console.log('[THINKING] Updating with:', text.slice(0, 50))
        setThinkingText((prev) => prev + text)
      }
    } else if (data.type === 'claude_text') {
      const text = (data.text as string) || ''
      if (text) {
        console.log('[CLAUDE_OUTPUT] Updating with:', text.slice(0, 50))
        setClaudeOutputText((prev) => prev + text)
      }
    } else if (data.type === 'search_started') {
      const category = data.category as string
      const query = (data.query as string) || ''
      const searchIndex = (data.index as number) || 0
      const searchTotal = (data.total as number) || 6
      console.log(
        '[SEARCH_STARTED] Category:',
        category,
        'Query:',
        query.slice(0, 50),
        'Index:',
        searchIndex,
      )
      setCategories((prev) =>
        prev.map((cat) => {
          if (cat.name === category) {
            console.log('  -> Marking', category, 'as searching with query:', query.slice(0, 40))
            return {
              ...cat,
              status: 'searching' as CategoryStatus,
              searchQuery: query,
              searchIndex,
              searchTotal,
              hasWebSearched: true,
            }
          }
          return cat
        }),
      )
    } else if (data.type === 'search_result') {
      const category = data.category as string
      const resultCount = (data.result_count as number) || 0
      console.log('[SEARCH_RESULT] Category:', category, 'Count:', resultCount)
      setCategories((prev) =>
        prev.map((cat) => {
          if (cat.name === category) {
            console.log('  -> Marking', category, 'as done with', resultCount, 'results')
            return {
              ...cat,
              status: 'done' as CategoryStatus,
              resultCount,
              searchQuery: undefined, // Clear query on completion
            }
          }
          return cat
        }),
      )
    } else if (data.type === 'phase') {
      const message = data.message as string
      if (message) {
        console.log('[PHASE]', message)
        setStatusMessages((prev) => [...prev, message])
      }
    } else if (data.type === 'tokens') {
      const inputTokens = (data.input_tokens as number) || 0
      const outputTokens = (data.output_tokens as number) || 0
      console.log('[TOKENS] Input:', inputTokens, 'Output:', outputTokens)
      setInputTokens(inputTokens)
      setOutputTokens(outputTokens)
    } else if (data.type === 'complete') {
      const count = (data.document_count as number) || 0
      console.log('[COMPLETE] Documents:', count)
      setDocumentCount(count)
      setIsComplete(true)
      setTimeout(() => onCompleteRef.current(), 1200)
    } else if (data.type === 'batch_saved') {
      const count = (data.total_saved as number) || 0
      console.log('[BATCH_SAVED] Total:', count)
      setDocumentCount(count)
    } else if (data.type === 'error') {
      const msg = data.message as string
      console.log('[ERROR]', msg)
      setStatusMessages((prev) => [...prev, `Error: ${msg}`])
      setCategories((prev) =>
        prev.map((cat) =>
          cat.status === 'searching' ? { ...cat, status: 'error' as CategoryStatus } : cat,
        ),
      )
      setIsComplete(true)
      setTimeout(() => onCompleteRef.current(), 1500)
    } else {
      console.log('[SSE] Unhandled message type:', data.type)
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
            console.log(`[SSE] ✓ Stream ended. Total messages received: ${messageCount}`)
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
                console.log(`[SSE] Raw message #${messageCount}: ${jsonStr.slice(0, 100)}`)
                const data = JSON.parse(jsonStr) as SSEMessage
                console.log(`[SSE] ✓ Parsed #${messageCount}: type=${data.type}`)
                if (processMessageRef.current) {
                  console.log(`[SSE] Calling processMessage for ${data.type}`)
                  processMessageRef.current(data)
                } else {
                  console.error(`[SSE] ✗ processMessageRef.current is null!`)
                }
              } catch (e) {
                console.error('[SSE] ✗ Parse error:', e, 'line:', line.slice(0, 100))
              }
            } else if (line.length > 0) {
              console.log(`[SSE] Skipping non-data line: ${line.slice(0, 50)}`)
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
    <div className="flex h-[700px] w-[1200px] flex-col overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-black/98 via-black/95 to-black/98 shadow-2xl">
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

      {/* Main content - 3 column layout */}
      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden">
        {/* Left: Thinking panel (35%) */}
        <div className="w-[35%] flex-none overflow-hidden border-r border-white/10">
          <ThinkingPanel
            thinkingText={thinkingText}
            inputTokens={inputTokens}
            outputTokens={outputTokens}
          />
        </div>

        {/* Middle: Claude Output (35%) */}
        <div className="w-[35%] flex-none overflow-hidden border-r border-white/10">
          <ClaudeOutputPanel outputText={claudeOutputText} />
        </div>

        {/* Right: Categories + status (30%) */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <CategoriesPanel categories={categories} />
          </div>

          {/* Status messages footer */}
          {statusMessages.length > 0 && (
            <div className="max-h-24 flex-none overflow-y-auto border-t border-white/10 bg-white/[0.02] px-3 py-2.5 text-xs">
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
