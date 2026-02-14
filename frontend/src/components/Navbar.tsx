import { Globe, Languages } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n';

export function Navbar() {
  const { locale, setLocale, t } = useI18n();

  return (
    <nav className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-black px-4">
      <div className="flex items-center gap-3">
        <Globe className="h-5 w-5 text-white/70" />
        <h1 className="text-sm font-semibold">{t('app.title')}</h1>
      </div>

      <div className="flex items-center gap-3">
        <Languages className="h-4 w-4 text-white/50" />
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          className="cursor-pointer rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 transition-colors outline-none hover:border-white/20 hover:text-white/90"
        >
          <option value="pt-BR" className="bg-black">
            Portugues (BR)
          </option>
          <option value="en" className="bg-black">
            English
          </option>
        </select>
      </div>
    </nav>
  );
}
