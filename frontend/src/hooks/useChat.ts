import { useCallback, useEffect, useRef, useState } from 'react'

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
  result?: Record<string, unknown>
  status: 'calling' | 'done' | 'error'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
}

export interface SystemVars {
  origin_country: string
  nationality: string
  destination_country: string
  objective: string
  additional_info: string
}

type ChatStatus = 'idle' | 'streaming' | 'error'

const STORAGE_KEY = 'chat_messages'

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ChatMessage[]
  } catch {
    return []
  }
}

function saveMessages(messages: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  } catch {
    // quota exceeded or unavailable
  }
}

interface SSEEvent {
  type: string
  token?: string
  error?: string
  tool_call_id?: string
  tool_name?: string
  tool_input?: Record<string, unknown>
  result?: Record<string, unknown>
}

export function useChat(systemVars?: SystemVars) {
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages)
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    saveMessages(messages)
  }, [messages])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: content.trim(),
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
      }

      const assistantId = assistantMessage.id
      setError(null)
      setStatus('streaming')

      const updatedMessages = [...messages, userMessage]
      setMessages([...updatedMessages, assistantMessage])

      const history = updatedMessages.map((m) => ({ role: m.role, content: m.content }))

      abortRef.current = new AbortController()

      try {
        const body: Record<string, unknown> = { messages: history }
        if (systemVars) {
          body.system_vars = systemVars
        }

        const res = await fetch('/api/v1/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: abortRef.current.signal,
        })

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const json = line.slice(6).trim()
            if (!json) continue

            try {
              const event = JSON.parse(json) as SSEEvent

              if (event.type === 'token' && event.token) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: m.content + event.token } : m,
                  ),
                )
              } else if (event.type === 'tool_use_start' && event.tool_call_id) {
                const toolCall: ToolCall = {
                  id: event.tool_call_id,
                  name: event.tool_name ?? 'unknown',
                  input: event.tool_input ?? {},
                  status: 'calling',
                }
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, toolCalls: [...(m.toolCalls ?? []), toolCall] }
                      : m,
                  ),
                )
              } else if (event.type === 'tool_use_result' && event.tool_call_id) {
                const callId = event.tool_call_id
                const result = event.result
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          toolCalls: m.toolCalls?.map((tc) =>
                            tc.id === callId ? { ...tc, status: 'done' as const, result } : tc,
                          ),
                        }
                      : m,
                  ),
                )
              } else if (event.type === 'error') {
                setError(event.error ?? 'Unknown error')
                setStatus('error')
                return
              }
            } catch {
              // skip malformed JSON lines
            }
          }
        }

        setStatus('idle')
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          setStatus('idle')
          return
        }
        setError(e instanceof Error ? e.message : 'Unknown error')
        setStatus('error')
      } finally {
        abortRef.current = null
      }
    },
    [messages, systemVars],
  )

  const clearMessages = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setError(null)
    setStatus('idle')
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  return { messages, status, error, sendMessage, clearMessages }
}
