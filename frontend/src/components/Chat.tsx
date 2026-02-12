import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useChat, type SystemVars } from '@/hooks/useChat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ToolCallCard } from '@/components/ToolCallCard'

interface ChatProps {
  systemVars?: SystemVars
  onReconfigure?: () => void
}

export function Chat({ systemVars, onReconfigure }: ChatProps) {
  const { messages, status, error, sendMessage, clearMessages } = useChat(systemVars)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isStreaming = status === 'streaming'

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (!isStreaming) {
      inputRef.current?.focus()
    }
  }, [isStreaming])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return
    sendMessage(input)
    setInput('')
  }

  const statusDot =
    status === 'idle'
      ? 'bg-green-400'
      : status === 'streaming'
        ? 'animate-pulse bg-blue-400'
        : 'bg-red-400'

  const statusLabel =
    status === 'streaming' ? 'streaming...' : status === 'error' ? 'error' : 'ready'

  // Dynamic opacity: less opaque when empty (globo visible), more opaque when has messages
  const bgOpacity = messages.length === 0 ? 'bg-black/20' : 'bg-black/70'
  const headerOpacity = messages.length === 0 ? 'bg-black/10' : 'bg-black/40'

  return (
    <Card className={`flex h-full w-full flex-col rounded-none border-0 ${bgOpacity} shadow-none`}>
      <CardHeader className={`flex-row items-center justify-between border-b ${headerOpacity}`}>
        <CardTitle className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${statusDot}`} />
          <span className="text-muted-foreground text-sm font-medium">{statusLabel}</span>
        </CardTitle>
        <div className="flex items-center gap-2">
          {onReconfigure && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReconfigure}
              disabled={isStreaming}
              className="md:hidden"
            >
              Reconfigurar
            </Button>
          )}
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearMessages} disabled={isStreaming}>
              Clear
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div ref={scrollRef} className="flex h-full flex-col">
            <div className="flex flex-1 flex-col gap-4 p-4">
              {messages.length === 0 && (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-muted-foreground text-sm">Send a message to start chatting.</p>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[80%]">
                    {msg.toolCalls?.map((tc) => (
                      <ToolCallCard key={tc.id} toolCall={tc} />
                    ))}
                    {(msg.content || !msg.toolCalls?.length) && (
                      <div
                        className={`rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {msg.content || (
                          <span className="text-muted-foreground animate-pulse">...</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>

      {error && (
        <div className="px-4 py-2">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      <CardFooter className={`border-t border-white/10 ${headerOpacity} p-4`}>
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isStreaming}
            autoFocus
          />
          <Button type="submit" disabled={!input.trim() || isStreaming}>
            Send
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
