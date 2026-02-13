import { useState } from 'react'
import {
  Globe,
  Activity,
  Wifi,
  PanelLeftClose,
  PanelLeftOpen,
  Languages,
  Plus,
  Trash2,
  MessageSquare,
} from 'lucide-react'
import type { Locale } from '@/lib/i18n'
import { useI18n } from '@/lib/i18n'
import type { Chat } from '@/lib/chatStore'

interface SidebarProps {
  chats: Chat[]
  activeChatId: string | null
  onSelectChat: (id: string) => void
  onNewChat: () => void
  onDeleteChat: (id: string) => void
  status: {
    health: string | null
    healthRtt: number | null
    wsStatus: string
    wsRoundTripMs: number | null
  }
}

function statusDot(state: 'ok' | 'connected' | 'error' | 'disconnected' | string | null) {
  if (state === 'ok' || state === 'connected') return 'bg-green-400'
  if (state === 'error' || state === 'disconnected') return 'bg-red-400'
  return 'animate-pulse bg-yellow-400'
}

function chatLabel(chat: Chat): string {
  const dest = chat.systemVars.destination_country
  const obj = chat.systemVars.objective
  if (dest && obj) return `${dest} - ${obj}`
  return dest || obj || chat.id.slice(0, 8)
}

export function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  status,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { locale, setLocale, t } = useI18n()

  const apiLabel =
    status.health && status.healthRtt !== null
      ? `${status.health} (${status.healthRtt}ms)`
      : (status.health ?? 'connecting...')

  const wsLabel =
    status.wsStatus === 'connected' && status.wsRoundTripMs !== null
      ? `connected (${status.wsRoundTripMs}ms)`
      : status.wsStatus

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-64'} hidden flex-col border-r border-white/10 bg-black transition-[width] duration-300 ease-in-out md:flex`}
    >
      {/* Header with collapse toggle */}
      <div className="flex items-center gap-3 border-b border-white/10 p-4">
        <Globe className="h-5 w-5 shrink-0 text-white/70" />
        {!collapsed && <h1 className="flex-1 truncate text-sm font-semibold">{t('app.title')}</h1>}
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className="shrink-0 text-white/40 transition-colors hover:text-white/80"
          title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
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
            title={collapsed ? chatLabel(chat) : undefined}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 truncate">{chatLabel(chat)}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteChat(chat.id)
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

      {/* Status section */}
      <div className="border-t border-white/10 p-2">
        <SidebarItem
          icon={<Activity className="h-4 w-4" />}
          collapsed={collapsed}
          label={`API: ${apiLabel}`}
          badge={
            <span className={`inline-block h-2 w-2 rounded-full ${statusDot(status.health)}`} />
          }
        />
        <SidebarItem
          icon={<Wifi className="h-4 w-4" />}
          collapsed={collapsed}
          label={`WS: ${wsLabel}`}
          badge={
            <span className={`inline-block h-2 w-2 rounded-full ${statusDot(status.wsStatus)}`} />
          }
        />
      </div>

      {/* Language select at bottom */}
      <div className="border-t border-white/10 p-2">
        {collapsed ? (
          <button
            onClick={() => setLocale(locale === 'pt-BR' ? 'en' : 'pt-BR')}
            className="flex w-full items-center justify-center rounded-md px-3 py-2 text-white/50 transition-colors hover:bg-white/5 hover:text-white/80"
            title={`${t('sidebar.language')}: ${locale === 'pt-BR' ? 'PT-BR' : 'EN'}`}
          >
            <Languages className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center gap-3 px-3 py-2">
            <Languages className="h-4 w-4 shrink-0 text-white/50" />
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="flex-1 cursor-pointer rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 transition-colors outline-none hover:border-white/20 hover:text-white/90"
            >
              <option value="pt-BR" className="bg-black">
                Portugues (BR)
              </option>
              <option value="en" className="bg-black">
                English
              </option>
            </select>
          </div>
        )}
      </div>
    </aside>
  )
}

function SidebarItem({
  icon,
  label,
  collapsed,
  badge,
}: {
  icon: React.ReactNode
  label: string
  collapsed: boolean
  badge?: React.ReactNode
}) {
  return (
    <div
      className="relative flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/70"
      title={collapsed ? label : undefined}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && (
        <>
          <span className="truncate">{label}</span>
          {badge}
        </>
      )}
      {collapsed && badge && <span className="absolute top-1 right-1">{badge}</span>}
    </div>
  )
}
