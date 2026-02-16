import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import type { Chat, ChatMessage } from '@/lib/chatStore';
import { mapSSEEvent, type RawSSEEvent } from '@/lib/sseEventMapper';
import { chatStreamReducer, createStreamState, type StreamState } from '@/lib/chatReducer';

type ChatStatus = 'idle' | 'streaming' | 'error';

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

  useEffect(() => {
    if (chat?.id !== chatIdRef.current) {
      abortRef.current?.abort();
      chatIdRef.current = chat?.id ?? null;
      setMessages(chat?.messages ?? []);
      setStatus('idle');
      setError(null);
    }
  }, [chat?.id, chat?.messages]);

  useEffect(() => {
    if (chat?.id) {
      onUpdateMessages(chat.id, messages);
    }
  }, [messages, chat?.id, onUpdateMessages]);

  const applyStreamState = useCallback((assistantId: string, stream: StreamState) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? {
              ...m,
              content: stream.content,
              textBlocks: stream.textBlocks.length ? stream.textBlocks : m.textBlocks,
              toolCalls: stream.toolCalls.length ? stream.toolCalls : m.toolCalls,
              agentExecutions: stream.agentExecutions.length
                ? stream.agentExecutions
                : m.agentExecutions,
              usageReport: stream.usageReport ?? m.usageReport,
              thinking: stream.thinkingBlocks[0] ?? m.thinking,
              thinkingBlocks: stream.thinkingBlocks.length
                ? stream.thinkingBlocks
                : m.thinkingBlocks,
              contentOrder: stream.contentOrder.length ? stream.contentOrder : m.contentOrder,
            }
          : m,
      ),
    );
  }, []);

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
        const resolvedObjective = chat.systemVars.objective.startsWith('setup.objective.')
          ? t(chat.systemVars.objective)
          : chat.systemVars.objective;

        const body: Record<string, unknown> = {
          messages: history,
          system_vars: { ...chat.systemVars, objective: resolvedObjective },
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
        let stream = createStreamState();

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
              const raw = JSON.parse(json) as RawSSEEvent;
              const action = mapSSEEvent(raw);
              if (!action) continue;

              if (action.type === 'ERROR') {
                setError(action.error);
                setStatus('error');
                return;
              }

              if (action.type === 'MESSAGE_END') break;

              stream = chatStreamReducer(stream, action);
              applyStreamState(assistantId, stream);
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
            return prev.map((m) => {
              if (m.id !== assistantId) return m;
              const toolCalls = m.toolCalls?.map((tc) =>
                tc.status === 'calling' ? { ...tc, status: 'error' as const } : tc,
              );
              const agentExecutions = m.agentExecutions?.map((ae) =>
                ae.status === 'running' ? { ...ae, status: 'error' as const } : ae,
              );
              return {
                ...m,
                content: m.content ? m.content + '\n\n' + t('chat.interrupted') : m.content,
                toolCalls,
                agentExecutions,
              };
            });
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
    [messages, chat, t, applyStreamState],
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
