import { Languages, Settings, MessageSquare } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Locale } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n';

export function Navbar() {
  const { locale, setLocale } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = location.pathname === '/admin';

  return (
    <nav className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-black px-4">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="FreePath Logo" className="h-16 w-auto" />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(isAdmin ? '/' : '/admin')}
          className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/50 transition-colors hover:border-white/20 hover:text-white/80"
        >
          {isAdmin ? (
            <>
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Chat</span>
            </>
          ) : (
            <>
              <Settings className="h-3.5 w-3.5" />
              <span>Admin</span>
            </>
          )}
        </button>

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
