import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import type { Chat, ChatMessage, ToolCall } from '@/lib/chatStore';

type ChatStatus = 'idle' | 'streaming' | 'error';

interface SSEEvent {
  type: string;
  token?: string;
  error?: string;
  tool_call_id?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  result?: Record<string, unknown>;
}

export function useChat(
  chat: Chat | null,
  onUpdateMessages: (id: string, msgs: ChatMessage[]) => void,
) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>(chat?.messages ?? []);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const chatIdRef = useRef<string | null>(chat?.id ?? null);

  // Reset messages when active chat changes
  useEffect(() => {
    if (chat?.id !== chatIdRef.current) {
      abortRef.current?.abort();
      chatIdRef.current = chat?.id ?? null;
      setMessages(chat?.messages ?? []);
      setStatus('idle');
      setError(null);
    }
  }, [chat?.id, chat?.messages]);

  // Persist messages to store on change
  useEffect(() => {
    if (chat?.id) {
      onUpdateMessages(chat.id, messages);
    }
  }, [messages, chat?.id, onUpdateMessages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !chat) return;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: content.trim(),
      };

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
      };

      const assistantId = assistantMessage.id;
      setError(null);
      setStatus('streaming');

      const updatedMessages = [...messages, userMessage];
      setMessages([...updatedMessages, assistantMessage]);

      const history = updatedMessages.map((m) => ({ role: m.role, content: m.content }));

      abortRef.current = new AbortController();

      try {
        const body: Record<string, unknown> = {
          messages: history,
          system_vars: chat.systemVars,
        };

        const res = await fetch('/api/v1/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const json = line.slice(6).trim();
            if (!json) continue;

            try {
              const event = JSON.parse(json) as SSEEvent;

              if (event.type === 'token' && event.token) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: m.content + event.token } : m,
                  ),
                );
              } else if (event.type === 'tool_use_start' && event.tool_call_id) {
                const toolCall: ToolCall = {
                  id: event.tool_call_id,
                  name: event.tool_name ?? 'unknown',
                  input: event.tool_input ?? {},
                  status: 'calling',
                };
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, toolCalls: [...(m.toolCalls ?? []), toolCall] }
                      : m,
                  ),
                );
              } else if (event.type === 'tool_use_result' && event.tool_call_id) {
                const callId = event.tool_call_id;
                const result = event.result;
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
                );
              } else if (event.type === 'error') {
                setError(event.error ?? 'Unknown error');
                setStatus('error');
                return;
              }
            } catch {
              // skip malformed JSON lines
            }
          }
        }

        setStatus('idle');
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.id === assistantId && !last.content && !last.toolCalls?.length) {
              return prev.slice(0, -1);
            }
            if (last?.id === assistantId && last.content) {
              return prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + '\n\n' + t('chat.interrupted') }
                  : m,
              );
            }
            return prev;
          });
          setStatus('idle');
          return;
        }
        setError(e instanceof Error ? e.message : 'Unknown error');
        setStatus('error');
      } finally {
        abortRef.current = null;
      }
    },
    [messages, chat, t],
  );

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setStatus('idle');
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { messages, status, error, sendMessage, clearMessages, stopStreaming };
}
