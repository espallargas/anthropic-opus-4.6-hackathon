import { useMemo } from 'react';
import type { Chat } from '@/lib/chatStore';
import { useI18n } from '@/lib/i18n';
import { getObjectiveIcon, chatLabel, timeAgo, absoluteDate } from '@/lib/chatUtils';
import { Plus, Trash2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onClose?: () => void;
}

export function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onClose,
}: SidebarProps) {
  const { t, locale } = useI18n();

  const sortedChats = useMemo(() => [...chats].sort((a, b) => b.updatedAt - a.updatedAt), [chats]);

  const handleSelectChat = (id: string) => {
    onSelectChat(id);
    onClose?.();
  };

  return (
    <aside
      className="border-border bg-background flex flex-col border-e transition-[width] duration-300 ease-in-out"
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

      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-muted-foreground text-sm font-semibold">{t('sidebar.chats')}</h3>
        <Button onClick={onNewChat} variant="ghost" size="icon-sm" title={t('sidebar.newChat')}>
          <Plus className="size-4" />
        </Button>
      </div>

      {/* Chat list */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {sortedChats.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-center">
              <MessageSquare className="text-muted-foreground/50 size-5" />
              <p className="text-muted-foreground/60 text-xs">{t('sidebar.empty')}</p>
            </div>
          </div>
        ) : (
          sortedChats.map((chat) => {
            const Icon = getObjectiveIcon(chat.systemVars.objective);
            return (
              <div
                key={chat.id}
                className={`group flex cursor-pointer items-start gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  chat.id === activeChatId
                    ? 'bg-muted/40 text-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground/80'
                }`}
                onClick={() => handleSelectChat(chat.id)}
                title={chatLabel(chat, t)}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="block truncate">{chatLabel(chat, t)}</span>
                  <time
                    className="text-muted-foreground/50 block text-[11px] font-light"
                    dateTime={new Date(chat.updatedAt).toISOString()}
                    title={absoluteDate(chat.updatedAt, locale)}
                  >
                    {timeAgo(chat.updatedAt, locale)}
                  </time>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                  className="group-hover:text-muted-foreground/70 mt-0.5 shrink-0 text-transparent transition-colors hover:!text-red-400"
                  title={t('sidebar.deleteChat')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </nav>
    </aside>
  );
}
