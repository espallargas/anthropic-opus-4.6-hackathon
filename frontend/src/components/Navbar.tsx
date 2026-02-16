import { Languages, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Locale } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: 'pt-BR', label: '🇧🇷 🇵🇹 Português' },
  { value: 'en', label: '🇺🇸 🇬🇧 English' },
  { value: 'ar', label: '🇸🇦 🇦🇪 العربية' },
  { value: 'bn', label: '🇧🇩 বাংলা' },
  { value: 'fil', label: '🇵🇭 Filipino' },
  { value: 'fr', label: '🇫🇷 Français' },
  { value: 'hi', label: '🇮🇳 हिन्दी' },
  { value: 'id', label: '🇮🇩 Bahasa Indonesia' },
  { value: 'zh', label: '🇨🇳 中文' },
  { value: 'ru', label: '🇷🇺 Русский' },
  { value: 'es', label: '🇪🇸 🇲🇽 Español' },
  { value: 'uk', label: '🇺🇦 Українська' },
  { value: 'ps', label: '🇦🇫 پښتو' },
  { value: 'dar', label: '🇦🇫 دری' },
  { value: 'ur', label: '🇵🇰 اردو' },
];

const COMPACT_TRIGGER =
  'h-8 min-w-0 w-auto gap-1.5 rounded-md border-border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground hover:border-input hover:text-foreground/90 focus:ring-0 focus:ring-offset-0 transition-colors';

interface NavbarProps {
  onMenuClick?: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const currentLocaleLabel = LOCALE_OPTIONS.find((o) => o.value === locale)?.label ?? locale;

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
        <Languages className="text-muted-foreground hidden h-4 w-4 sm:block" />
        <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
          <SelectTrigger className={COMPACT_TRIGGER}>
            <SelectValue>{currentLocaleLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent align="end" className="min-w-[150px]">
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
