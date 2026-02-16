import { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import type { Chat } from '@/lib/chatStore';
import { useI18n } from '@/lib/i18n';
import { getObjectiveIcon, chatLabel, timeAgo } from '@/lib/chatUtils';

interface HomePageProps {
  chats: Chat[];
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
}

const MAX_RECENT = 3;

export function HomePage({ chats, onSelectChat, onNewChat }: HomePageProps) {
  const { t, locale } = useI18n();

  const recentChats = useMemo(
    () => [...chats].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_RECENT),
    [chats],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-lg flex-col items-center gap-4">
        {/* Logo + subtitle */}
        <div className="flex flex-col items-center">
          <img src="/logo.png" alt={t('nav.logo.alt')} className="h-20 w-auto" />
          <p className="text-muted-foreground text-center text-base">{t('home.subtitle')}</p>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onNewChat}
          className="bg-primary text-primary-foreground hover:bg-primary/90 group mt-5 flex cursor-pointer items-center gap-4 rounded-xl px-8 py-3.5 text-sm font-medium shadow-lg transition-all hover:shadow-xl"
        >
          {t('home.cta')}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
        </button>

        {/* Divider + Recent chats */}
        {recentChats.length > 0 && (
          <>
            <p className="text-muted-foreground/40 text-center text-sm">{t('home.or')}</p>
            <div className="w-full">
              <p className="text-muted-foreground/60 mb-3 text-center text-sm">
                {t('home.resume')}
              </p>
              <div className="flex flex-col gap-1.5">
                {recentChats.map((chat) => {
                  const objectives = chat.systemVars.objective.split(', ').filter(Boolean);
                  const Icon = getObjectiveIcon(objectives[0] ?? '');
                  return (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => onSelectChat(chat.id)}
                      className="border-border/50 hover:bg-muted/30 group flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-start transition-all"
                    >
                      <div className="bg-muted/50 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                        <Icon className="text-muted-foreground h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-foreground block truncate text-sm font-medium">
                          {chatLabel(chat, t)}
                        </span>
                        <span className="text-muted-foreground/50 block text-xs">
                          {timeAgo(chat.updatedAt, locale)}
                        </span>
                      </div>
                      <ArrowRight className="text-muted-foreground/30 group-hover:text-muted-foreground/60 h-4 w-4 shrink-0 transition-all group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
