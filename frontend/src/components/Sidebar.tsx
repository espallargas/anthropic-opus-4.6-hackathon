import type { Chat } from '@/lib/chatStore';
import { getCountryNameLocalized, getCountryPreposition } from '@/lib/countries';
import { useI18n } from '@/lib/i18n';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';

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
  const { t, locale } = useI18n();

  return (
    <aside
      className="border-border bg-background hidden flex-col border-r transition-[width] duration-300 ease-in-out md:flex"
      style={{ width: '100%', height: '100%' }}
    >
      {/* Collapse toggle */}
      {/* <div className="flex items-center justify-end border-b border-white/10 p-2">
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className="rounded-md p-1.5 text-white/40 transition-colors hover:bg-white/5 hover:text-white/80"
          title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div> */}

      <h3 className="p-4">Chats</h3>
      {/* Chat list */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`group flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              chat.id === activeChatId
                ? 'bg-muted/40 text-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground/80'
            }`}
            onClick={() => onSelectChat(chat.id)}
            title={chatLabel(chat, t, locale)}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{chatLabel(chat, t, locale)}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteChat(chat.id);
              }}
              className="group-hover:text-muted-foreground/70 shrink-0 text-transparent transition-colors hover:!text-red-400"
              title={t('sidebar.deleteChat')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </nav>

      {/* New chat button */}
      <div className="border-border border-b p-2">
        <button
          onClick={onNewChat}
          className="text-muted-foreground hover:bg-accent/50 hover:text-foreground/80 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
          title={t('sidebar.newChat')}
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span className="truncate">{t('sidebar.newChat')}</span>
        </button>
      </div>
    </aside>
  );
}
