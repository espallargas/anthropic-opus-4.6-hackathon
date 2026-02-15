import { Languages, MessageSquare, Paintbrush, Palette, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Locale } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n';
import { useTheme, THEMES, type ThemeId, type ThemeMood } from '@/lib/theme';

const MOOD_ORDER: ThemeMood[] = ['clean', 'tech', 'warm', 'bold'];

function groupedThemes(t: (key: string) => string) {
  const groups: { mood: ThemeMood; label: string; themes: { id: ThemeId; name: string }[] }[] = [];
  for (const mood of MOOD_ORDER) {
    const items = THEMES.filter((th) => th.mood === mood);
    if (items.length === 0) continue;
    groups.push({
      mood,
      label: t(items[0].moodKey),
      themes: items.map((th) => ({ id: th.id, name: t(th.nameKey) })),
    });
  }
  return groups;
}

export function Navbar() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const groups = groupedThemes(t);

  const NAV_BUTTONS = [
    { path: '/', label: t('nav.chat'), icon: MessageSquare },
    { path: '/admin', label: t('nav.admin'), icon: Settings },
    { path: '/design', label: t('nav.design'), icon: Paintbrush },
  ] as const;

  return (
    <nav className="border-border bg-background flex h-12 shrink-0 items-center justify-between border-b px-4">
      <div className="flex items-center gap-3">
        <img
          src="/logo.png"
          alt={t('nav.logo.alt')}
          className="h-16 w-auto cursor-pointer"
          onClick={() => navigate('/')}
        />
      </div>

      <div className="flex items-center gap-3">
        {NAV_BUTTONS.filter((btn) => btn.path !== currentPath).map((btn) => (
          <button
            key={btn.path}
            onClick={() => navigate(btn.path)}
            className="border-border text-muted-foreground hover:border-input hover:text-foreground/80 flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors"
          >
            <btn.icon className="h-3.5 w-3.5" />
            <span>{btn.label}</span>
          </button>
        ))}

        <Palette className="text-muted-foreground h-4 w-4" />
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as ThemeId)}
          className="border-border bg-muted/30 text-muted-foreground hover:border-input hover:text-foreground/90 cursor-pointer rounded-md border px-2 py-1 text-xs transition-colors outline-none"
        >
          {groups.map((group) => (
            <optgroup key={group.mood} label={`── ${group.label} ──`} className="bg-background">
              {group.themes.map((th) => (
                <option key={th.id} value={th.id} className="bg-background">
                  {th.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <Languages className="text-muted-foreground h-4 w-4" />
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          className="border-border bg-muted/30 text-muted-foreground hover:border-input hover:text-foreground/90 cursor-pointer rounded-md border px-2 py-1 text-xs transition-colors outline-none"
        >
          <option value="pt-BR" className="bg-background">
            Portugues (BR)
          </option>
          <option value="en" className="bg-background">
            English
          </option>
          <option value="ar" className="bg-background">
            العربية
          </option>
        </select>
      </div>
    </nav>
  );
}
