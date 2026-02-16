import { AgentCard } from '@/components/AgentCard';
import { SelectionSummary } from '@/components/SelectionSummary';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { ThinkingCard } from '@/components/ThinkingCard';
import { ToolCallCard } from '@/components/ToolCallCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UsageBadge } from '@/components/UsageBadge';
import { useChat } from '@/hooks/useChat';
import type { ChatMessage, ContentBlock, Chat as ChatType } from '@/lib/chatStore';
import { useI18n } from '@/lib/i18n';
import { Pill } from '@/components/ui/Pill';
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Compass,
  FileCheck,
  FileText,
  Loader2,
  Square,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';

const FAQ_PILLS = [
  {
    labelKey: 'chat.faq.visaOptions',
    promptKey: 'chat.faq.visaOptions.prompt',
    icon: <FileCheck className="h-3 w-3" />,
  },
  {
    labelKey: 'chat.faq.requiredDocs',
    promptKey: 'chat.faq.requiredDocs.prompt',
    icon: <FileText className="h-3 w-3" />,
  },
  {
    labelKey: 'chat.faq.timeline',
    promptKey: 'chat.faq.timeline.prompt',
    icon: <Clock className="h-3 w-3" />,
  },
  {
    labelKey: 'chat.faq.gettingStarted',
    promptKey: 'chat.faq.gettingStarted.prompt',
    icon: <Compass className="h-3 w-3" />,
  },
];

/** Fallback order for messages without contentOrder (backward compat with localStorage). */
function defaultContentOrder(msg: ChatMessage): ContentBlock[] {
  const order: ContentBlock[] = [];
  if (msg.thinkingBlocks?.length) {
    for (const tb of msg.thinkingBlocks) {
      order.push({ type: 'thinking', thinkingId: tb.id ?? 'legacy' });
    }
  } else if (msg.thinking) {
    order.push({ type: 'thinking', thinkingId: msg.thinking.id ?? 'legacy' });
  }
  if (msg.toolCalls?.length) {
    for (const tc of msg.toolCalls) order.push({ type: 'toolCall', toolCallId: tc.id });
  }
  if (msg.agentExecutions?.length) {
    for (const ae of msg.agentExecutions) order.push({ type: 'agent', agentName: ae.agentName });
  }
  if (msg.textBlocks?.length) {
    for (const tb of msg.textBlocks) order.push({ type: 'text', textBlockId: tb.id });
  } else if (msg.content) {
    order.push({ type: 'text', textBlockId: 'legacy' });
  }
  return order;
}

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
      textareaRef.current?.focus();
    }
  }, [isStreaming]);

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && isStreaming) {
        stopStreaming();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStreaming, stopStreaming]);

  const doSend = useCallback(() => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput('');
  }, [input, isStreaming, sendMessage]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    doSend();
  };

  const handleTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center backdrop-blur-md">
      <div className="absolute end-4 top-4 z-20 hidden w-64 md:block">
        <SelectionSummary
          nationalities={
            chat.systemVars.nationality
              ? chat.systemVars.nationality.split(', ').filter(Boolean)
              : []
          }
          origin={chat.systemVars.origin_country}
          destination={chat.systemVars.destination_country}
          objective={chat.systemVars.objective}
          t={t}
        />
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="w-full max-w-3xl flex-1 overflow-y-auto px-2 pt-8 pb-4 md:px-4"
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
              <div
                className={msg.role === 'user' ? 'max-w-[95%] md:max-w-[80%]' : 'w-full'}
              >
                {msg.role === 'user' ? (
                  <div className="bg-primary text-primary-foreground whitespace-pre-wrap rounded-lg px-4 py-2 text-sm">
                    {msg.content}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {(msg.contentOrder?.length ? msg.contentOrder : defaultContentOrder(msg)).map(
                      (block) => {
                        switch (block.type) {
                          case 'thinking': {
                            const tb =
                              msg.thinkingBlocks?.find((b) => b.id === block.thinkingId) ??
                              (block.thinkingId === 'legacy' ? msg.thinking : null);
                            return tb ? (
                              <div key={block.thinkingId} className="w-[95%] md:w-[80%]">
                                <ThinkingCard thinking={tb} />
                              </div>
                            ) : null;
                          }
                          case 'toolCall': {
                            const tc = msg.toolCalls?.find((t) => t.id === block.toolCallId);
                            if (!tc) return null;
                            const agent = msg.agentExecutions?.find((ae) =>
                              ae.toolCallId
                                ? ae.toolCallId === tc.id
                                : ae.agentName === tc.name,
                            );
                            return (
                              <div key={tc.id} className="w-[95%] md:w-[80%]">
                                <ToolCallCard toolCall={tc} waiting={!agent}>
                                  {agent && <AgentCard agent={agent} />}
                                </ToolCallCard>
                              </div>
                            );
                          }
                          case 'agent': {
                            const agent = msg.agentExecutions?.find(
                              (ae) => ae.agentName === block.agentName,
                            );
                            return agent ? (
                              <div key={`${block.agentName}-${agent.task}`} className="w-[95%] md:w-[80%]">
                                <AgentCard agent={agent} />
                              </div>
                            ) : null;
                          }
                          case 'text': {
                            const textBlock =
                              msg.textBlocks?.find((tb) => tb.id === block.textBlockId) ??
                              (block.textBlockId === 'legacy' ? { id: 'legacy', content: msg.content } : null);
                            return (
                              <div key={block.textBlockId} className="w-full">
                                <div className="text-foreground prose prose-sm prose-themed max-w-none rounded-lg px-4 py-2 text-sm [&_li]:leading-[1.85] [&_p]:leading-[1.85]">
                                  {textBlock?.content ? (
                                    <MarkdownRenderer content={textBlock.content} />
                                  ) : (
                                    <span className="text-muted-foreground animate-pulse">
                                      ...
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          }
                        }
                      },
                    )}
                    {!msg.content && !msg.toolCalls?.length && (
                      <div className="text-foreground rounded-lg px-4 py-2 text-sm">
                        <span className="text-muted-foreground animate-pulse">...</span>
                      </div>
                    )}
                  </div>
                )}
                {msg.usageReport && <UsageBadge report={msg.usageReport} />}
              </div>
            </div>
          ))}
          {isStreaming && (
            <div className="flex items-center gap-2 px-1 py-2">
              <Loader2 className="text-muted-foreground h-3 w-3 animate-spin" />
              <span className="text-muted-foreground text-xs">{t('chat.processing')}</span>
            </div>
          )}
        </div>
      </div>

      {showScrollBtn && (
        <div className="pointer-events-none relative w-full max-w-3xl">
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={scrollToBottom}
            className="pointer-events-auto absolute end-6 -top-8 z-10 rounded-full opacity-70 shadow-md transition-opacity hover:opacity-100"
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

      <div className="w-full max-w-3xl px-3 pt-2 pb-4">
        <form onSubmit={handleSubmit}>
          <div className="border-border bg-card rounded-2xl border p-3">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder={t('chat.placeholder')}
              disabled={isStreaming}
              autoFocus
              rows={1}
              className="max-h-48 min-h-[2.5rem] w-full resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap gap-2">
                {FAQ_PILLS.map((pill) => (
                  <Pill
                    key={pill.labelKey}
                    icon={pill.icon}
                    size="sm"
                    onClick={() => sendMessage(t(pill.promptKey))}
                  >
                    {t(pill.labelKey)}
                  </Pill>
                ))}
              </div>
              {isStreaming ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  className="shrink-0 rounded-xl transition-all duration-200"
                  onClick={stopStreaming}
                  title={t('chat.stop')}
                >
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon-sm"
                  className="shrink-0 rounded-xl transition-all duration-200"
                  disabled={!input.trim()}
                  title={t('chat.send')}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
