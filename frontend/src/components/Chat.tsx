import { AgentActivityPanel } from '@/components/AgentActivityPanel';
import { ChatContextBar } from '@/components/ChatContextBar';
import { ThinkingCard } from '@/components/ThinkingCard';
import { ToolCallCard } from '@/components/ToolCallCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UsageBadge } from '@/components/UsageBadge';
import { useChat } from '@/hooks/useChat';
import type { ChatMessage, Chat as ChatType } from '@/lib/chatStore';
import { useI18n } from '@/lib/i18n';
import { ArrowUp, Square } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatProps {
  chat: ChatType;
  onUpdateMessages: (id: string, msgs: ChatMessage[]) => void;
}

export function Chat({ chat, onUpdateMessages }: ChatProps) {
  const { messages, status, error, sendMessage, stopStreaming } = useChat(chat, onUpdateMessages);
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const userScrolledRef = useRef(false);

  const isStreaming = status === 'streaming';

  // Reset user-scrolled flag when streaming starts
  useEffect(() => {
    if (isStreaming) {
      userScrolledRef.current = false;
    }
  }, [isStreaming]);

  // Detect user scroll: if user scrolls up, stop auto-scrolling
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || !isStreaming) return;
    const el = scrollRef.current;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    userScrolledRef.current = !atBottom;
  }, [isStreaming]);

  // Auto-scroll while streaming unless user scrolled up
  useEffect(() => {
    if (!scrollRef.current) return;
    if (isStreaming && !userScrolledRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    } else if (!isStreaming) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  useEffect(() => {
    if (!isStreaming) {
      inputRef.current?.focus();
    }
  }, [isStreaming]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isStreaming) {
        stopStreaming();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStreaming, stopStreaming]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <div className="flex h-full w-full flex-col items-center backdrop-blur-md">
      <ChatContextBar systemVars={chat.systemVars} />

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="w-full max-w-3xl flex-1 overflow-y-auto px-4 pt-8 pb-4"
      >
        <div className="flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="flex flex-1 items-center justify-center py-20">
              <p className="text-muted-foreground text-sm">{t('chat.empty')}</p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`animate-fade-in flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-[80%]">
                {msg.thinking && <ThinkingCard thinking={msg.thinking} />}
                {msg.toolCalls?.map((tc) => (
                  <ToolCallCard key={tc.id} toolCall={tc} />
                ))}
                {msg.agentExecutions && msg.agentExecutions.length > 0 && (
                  <AgentActivityPanel agents={msg.agentExecutions} />
                )}
                {(msg.content || !msg.toolCalls?.length) && (
                  <div
                    className={`rounded-lg px-4 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground whitespace-pre-wrap'
                        : 'text-foreground prose prose-invert prose-sm max-w-none [&_li]:leading-[1.85] [&_p]:leading-[1.85]'
                    }`}
                  >
                    {msg.content ? (
                      msg.role === 'user' ? (
                        msg.content
                      ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      )
                    ) : (
                      <span className="text-muted-foreground animate-pulse">...</span>
                    )}
                  </div>
                )}
                {msg.usageReport && <UsageBadge report={msg.usageReport} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="px-4 py-2">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      <div className="w-full max-w-3xl p-4">
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('chat.placeholder')}
            disabled={isStreaming}
            autoFocus
          />
          {isStreaming ? (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={stopStreaming}
              title={t('chat.stop')}
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim()} title={t('chat.send')}>
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
