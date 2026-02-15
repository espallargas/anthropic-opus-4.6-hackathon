import { Languages, Menu, MessageSquare, Paintbrush, Palette, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Locale } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n';
import { useTheme, THEMES, type ThemeId, type ThemeMood } from '@/lib/theme';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: 'pt-BR', label: '🇧🇷 🇵🇹 Português' },
  { value: 'en', label: '🇺🇸 🇬🇧 English' },
  { value: 'ar', label: 'العربية' },
];

const COMPACT_TRIGGER =
  'h-8 min-w-0 w-auto gap-1.5 rounded-md border-border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground hover:border-input hover:text-foreground/90 focus:ring-0 focus:ring-offset-0 transition-colors';

interface NavbarProps {
  onMenuClick?: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const groups = groupedThemes(t);
  const currentLocaleLabel = LOCALE_OPTIONS.find((o) => o.value === locale)?.label ?? locale;

  const NAV_BUTTONS = [
    { path: '/', label: t('nav.chat'), icon: MessageSquare },
    { path: '/admin', label: t('nav.admin'), icon: Settings },
    { path: '/design', label: t('nav.design'), icon: Paintbrush },
  ] as const;

  return (
    <nav className="border-border bg-background relative z-50 flex h-14 shrink-0 items-center justify-between border-b px-4">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="text-muted-foreground hover:text-foreground cursor-pointer rounded-md p-1.5 transition-colors md:hidden"
            title={t('nav.menu')}
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
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
            <span className="hidden sm:inline">{btn.label}</span>
          </button>
        ))}

        <Palette className="text-muted-foreground hidden h-4 w-4 sm:block" />
        <Select value={theme} onValueChange={(v) => setTheme(v as ThemeId)}>
          <SelectTrigger className={COMPACT_TRIGGER}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {groups.map((group, i) => (
              <SelectGroup key={group.mood}>
                {i > 0 && <div className="bg-border mx-1 my-1 h-px" />}
                <SelectLabel className="ps-2 text-[10px] uppercase tracking-wider">
                  {group.label}
                </SelectLabel>
                {group.themes.map((th) => (
                  <SelectItem key={th.id} value={th.id} className="text-xs">
                    {th.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

        <Languages className="text-muted-foreground hidden h-4 w-4 sm:block" />
        <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
          <SelectTrigger className={COMPACT_TRIGGER}>
            <SelectValue>{currentLocaleLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {LOCALE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </nav>
  );
}
