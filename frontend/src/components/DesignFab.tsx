import { Palette, X } from 'lucide-react';
import { useState, useEffect } from 'react';
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
import { DesignPage } from '@/components/DesignPage';

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

export function DesignFab() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  const groups = groupedThemes(t);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <>
      {/* FAB button */}
      <button
        onClick={() => setOpen(true)}
        className="border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground fixed end-4 bottom-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border shadow-md transition-all hover:scale-105 active:scale-95"
        title={t('design.title')}
      >
        <Palette className="h-4 w-4" />
      </button>

      {/* Panel overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" dir={document.documentElement.dir}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />

          {/* Slide-in panel */}
          <div className="bg-background border-border animate-panel-in relative flex w-full max-w-md flex-col border-s shadow-xl">
            {/* Header */}
            <div className="border-border flex shrink-0 items-center justify-between border-b px-4 py-3">
              <div>
                <h2 className="text-foreground text-sm font-semibold">{t('design.title')}</h2>
                <p className="text-muted-foreground text-xs">{t('design.subtitle')}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground rounded-md p-1.5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Theme selector */}
            <div className="border-border shrink-0 border-b px-4 py-3">
              <div className="flex items-center gap-3">
                <Palette className="text-muted-foreground h-4 w-4 shrink-0" />
                <Select value={theme} onValueChange={(v) => setTheme(v as ThemeId)}>
                  <SelectTrigger className="border-border bg-muted/30 text-muted-foreground hover:border-input hover:text-foreground/90 h-8 min-w-0 flex-1 gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors focus:ring-0 focus:ring-offset-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end" className="min-w-[180px]">
                    {groups.map((group, i) => (
                      <SelectGroup key={group.mood}>
                        {i > 0 && <div className="bg-border mx-1 my-1 h-px" />}
                        <SelectLabel className="ps-2 text-[10px] tracking-wider uppercase">
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
              </div>
            </div>

            {/* Design system showcase */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <DesignPage />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
