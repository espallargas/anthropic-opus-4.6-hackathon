import { AgentCard } from '@/components/AgentCard';
import { ChatContextBar } from '@/components/ChatContextBar';
import { ThinkingCard } from '@/components/ThinkingCard';
import { ToolCallCard } from '@/components/ToolCallCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UsageBadge } from '@/components/UsageBadge';
import { useChat } from '@/hooks/useChat';
import type { ChatMessage, Chat as ChatType } from '@/lib/chatStore';
import { useI18n } from '@/lib/i18n';
import { ArrowDown, Loader2, SendHorizonal, Square } from 'lucide-react';
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
  const [showScrollBtn, setShowScrollBtn] = useState(false);
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

  // Detect user scroll: track position for auto-scroll + floating button
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (isStreaming) userScrolledRef.current = !atBottom;
    setShowScrollBtn(!atBottom);
  }, [isStreaming]);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, []);

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
              <p className="text-sm text-white/40">{t('chat.empty')}</p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`animate-fade-in flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-[80%]">
                <div className="w-[80%]">
                  {msg.thinking && <ThinkingCard thinking={msg.thinking} />}
                  {msg.toolCalls?.map((tc) => {
                    const agent = msg.agentExecutions?.find((ae) => ae.agentName === tc.name);
                    return (
                      <ToolCallCard key={tc.id} toolCall={tc} waiting={!agent}>
                        {agent && <AgentCard agent={agent} />}
                      </ToolCallCard>
                    );
                  })}
                  {msg.agentExecutions
                    ?.filter((ae) => !msg.toolCalls?.some((tc) => tc.name === ae.agentName))
                    .map((ae) => (
                      <AgentCard key={`${ae.agentName}-${ae.task}`} agent={ae} />
                    ))}
                </div>
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

      {showScrollBtn && (
        <div className="pointer-events-none relative w-full max-w-3xl">
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={scrollToBottom}
            className="pointer-events-auto absolute -top-8 right-6 z-10 rounded-full opacity-70 shadow-md transition-opacity hover:opacity-100"
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
        </div>
      )}

      {error && (
        <div className="px-4 py-2">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {isStreaming && (
        <div className="flex w-full max-w-3xl items-center gap-2 px-4 py-2">
          <Loader2 className="text-muted-foreground h-3 w-3 animate-spin" />
          <span className="text-muted-foreground text-xs">{t('chat.processing')}</span>
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
              <SendHorizonal className="h-4 w-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
