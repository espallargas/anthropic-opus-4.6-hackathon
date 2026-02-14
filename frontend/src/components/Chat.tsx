import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useChat } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToolCallCard } from '@/components/ToolCallCard';
import { ArrowUp, Square } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useI18n } from '@/lib/i18n';
import type { Chat as ChatType, ChatMessage } from '@/lib/chatStore';

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

  const isStreaming = status === 'streaming';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
      <div className="scroll-fade relative w-full max-w-3xl flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div ref={scrollRef} className="flex h-full flex-col">
            <div className="flex flex-1 flex-col gap-4 p-4 pt-12 pb-12">
              {messages.length === 0 && (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-muted-foreground text-sm">{t('chat.empty')}</p>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`animate-fade-in flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[80%]">
                    {msg.toolCalls?.map((tc) => (
                      <ToolCallCard key={tc.id} toolCall={tc} />
                    ))}
                    {(msg.content || !msg.toolCalls?.length) && (
                      <div
                        className={`rounded-lg px-4 py-2 text-sm ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground whitespace-pre-wrap'
                            : 'text-foreground prose prose-invert prose-sm max-w-none bg-white/15'
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
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
