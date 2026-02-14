import { useState } from 'react';
import { ChevronsLeft, ChevronsRight, Plus, Trash2, MessageSquare } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getCountryNameLocalized, getCountryPreposition } from '@/lib/countries';
import type { Chat } from '@/lib/chatStore';

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
}

function chatLabel(chat: Chat, t: (key: string) => string, locale: string): string {
  const dest = chat.systemVars.destination_country;
  const obj = chat.systemVars.objective;
  if (dest && obj) {
    const name = getCountryNameLocalized(dest, t);
    const prep = getCountryPreposition(dest, locale);
    return `${obj} ${prep} ${name}`;
  }
  if (dest) return getCountryNameLocalized(dest, t);
  return obj || chat.id.slice(0, 8);
}

export function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { t, locale } = useI18n();

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-64'} hidden flex-col border-r border-white/10 bg-black transition-[width] duration-300 ease-in-out md:flex`}
    >
      {/* Collapse toggle */}
      <div className="flex items-center justify-end border-b border-white/10 p-2">
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className="rounded-md p-1.5 text-white/40 transition-colors hover:bg-white/5 hover:text-white/80"
          title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* New chat button */}
      <div className="border-b border-white/10 p-2">
        <button
          onClick={onNewChat}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-white/50 transition-colors hover:bg-white/5 hover:text-white/80"
          title={t('sidebar.newChat')}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">{t('sidebar.newChat')}</span>}
        </button>
      </div>

      {/* Chat list */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`group flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              chat.id === activeChatId
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:bg-white/5 hover:text-white/80'
            }`}
            onClick={() => onSelectChat(chat.id)}
            title={collapsed ? chatLabel(chat, t, locale) : undefined}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 truncate">{chatLabel(chat, t, locale)}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                  className="shrink-0 text-white/0 transition-colors group-hover:text-white/40 hover:!text-red-400"
                  title={t('sidebar.deleteChat')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
