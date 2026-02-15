import type { Chat } from '@/lib/chatStore';
import { getCountryNameLocalized } from '@/lib/countries';
import { useI18n } from '@/lib/i18n';
import {
  Plane,
  GraduationCap,
  Briefcase,
  Users,
  Shield,
  TrendingUp,
  Home,
  MoreHorizontal,
  Plus,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const OBJECTIVE_ICON_MAP: Record<string, LucideIcon> = {
  'setup.objective.temporary_visit': Plane,
  'setup.objective.education': GraduationCap,
  'setup.objective.work': Briefcase,
  'setup.objective.family_reunion': Users,
  'setup.objective.seek_protection': Shield,
  'setup.objective.investments': TrendingUp,
  'setup.objective.permanent_residence': Home,
  'setup.objective.other': MoreHorizontal,
};

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onClose?: () => void;
}

function chatLabel(chat: Chat, t: (key: string) => string): string {
  const origin = chat.systemVars.origin_country;
  const dest = chat.systemVars.destination_country;
  if (origin && dest) {
    const originName = getCountryNameLocalized(origin, t);
    const destName = getCountryNameLocalized(dest, t);
    return `${originName} → ${destName}`;
  }
  if (dest) return getCountryNameLocalized(dest, t);
  if (origin) return getCountryNameLocalized(origin, t);
  return chat.id.slice(0, 8);
}

function getObjectiveIcon(objective: string): LucideIcon {
  return OBJECTIVE_ICON_MAP[objective] ?? MoreHorizontal;
}

export function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onClose,
}: SidebarProps) {
  const { t } = useI18n();

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

      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-semibold text-white/70">Chats</h3>
        <button
          onClick={onNewChat}
          className="cursor-pointer rounded-md p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white/80"
          title={t('sidebar.newChat')}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Chat list */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {chats.map((chat) => {
          const Icon = getObjectiveIcon(chat.systemVars.objective);
          return (
            <div
              key={chat.id}
              className={`group flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                chat.id === activeChatId
                  ? 'bg-muted/40 text-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground/80'
              }`}
              onClick={() => handleSelectChat(chat.id)}
              title={chatLabel(chat, t)}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{chatLabel(chat, t)}</span>
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
          );
        })}
      </nav>
    </aside>
  );
}
