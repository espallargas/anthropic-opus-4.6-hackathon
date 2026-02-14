import { useCallback, useEffect, useState } from 'react';
import {
  loadChats,
  saveChats,
  createChat as createChatRecord,
  deleteChat as deleteChatRecord,
  updateChatMessages,
  type Chat,
  type ChatMessage,
  type SystemVars,
} from '@/lib/chatStore';

const ACTIVE_CHAT_KEY = 'active_chat_id';

function loadActiveChatId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_CHAT_KEY);
  } catch {
    return null;
  }
}

function saveActiveChatId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_CHAT_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_CHAT_KEY);
    }
  } catch {
    // ignore
  }
}

export interface UseChatStoreReturn {
  chats: Chat[];
  activeChatId: string | null;
  activeChat: Chat | null;
  createChat: (systemVars: SystemVars, initialMessages?: ChatMessage[]) => string;
  selectChat: (id: string) => void;
  deleteChat: (id: string) => void;
  updateMessages: (id: string, messages: ChatMessage[]) => void;
}

export function useChatStore(): UseChatStoreReturn {
  const [chats, setChats] = useState<Chat[]>(loadChats);
  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    const stored = loadActiveChatId();
    const loaded = loadChats();
    if (stored && loaded.some((c) => c.id === stored)) return stored;
    return null;
  });

  useEffect(() => {
    saveChats(chats);
  }, [chats]);

  useEffect(() => {
    saveActiveChatId(activeChatId);
  }, [activeChatId]);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

  const createChat = useCallback(
    (systemVars: SystemVars, initialMessages?: ChatMessage[]): string => {
      const chat = createChatRecord(systemVars, initialMessages);
      setChats((prev) => [chat, ...prev]);
      setActiveChatId(chat.id);
      return chat.id;
    },
    [],
  );

  const selectChat = useCallback((id: string) => {
    setActiveChatId(id);
  }, []);

  const deleteChat = useCallback(
    (id: string) => {
      setChats((prev) => deleteChatRecord(prev, id));
      if (activeChatId === id) {
        setChats((prev) => {
          const remaining = prev;
          const next = remaining[0] ?? null;
          setActiveChatId(next?.id ?? null);
          return prev;
        });
      }
    },
    [activeChatId],
  );

  const updateMessages = useCallback((id: string, messages: ChatMessage[]) => {
    setChats((prev) => updateChatMessages(prev, id, messages));
  }, []);

  return { chats, activeChatId, activeChat, createChat, selectChat, deleteChat, updateMessages };
}
