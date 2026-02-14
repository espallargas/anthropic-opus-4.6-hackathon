import { useState, useEffect } from 'react';
import { apiFetch, type CountryDetailsResponse, type Legislation } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { ChevronDown } from 'lucide-react';

interface LegislationPanelProps {
  countryCode: string;
  isOpen: boolean;
  onToggle: () => void;
}

function getCategoryLabels(t: (key: string) => string): Record<string, string> {
  return {
    federal_laws: t('admin.category.federal_laws'),
    regulations: t('admin.category.regulations'),
    consular: t('admin.category.consular'),
    jurisdictional: t('admin.category.jurisdictional'),
    complementary: t('admin.category.complementary'),
    auxiliary: t('admin.category.auxiliary'),
  };
}

export function LegislationPanel({ countryCode, isOpen }: LegislationPanelProps) {
  const { t } = useI18n();
  const [legislations, setLegislations] = useState<Record<string, Legislation[]>>({});
  const [loading, setLoading] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const categoryLabels = getCategoryLabels(t);

  useEffect(() => {
    if (!isOpen) return;

    const fetchLegislations = async () => {
      try {
        setLoading(true);
        const data = await apiFetch<CountryDetailsResponse>(`/admin/countries/${countryCode}`);
        setLegislations(data.legislations);
      } catch (err) {
        console.error('Failed to fetch legislations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLegislations();
  }, [isOpen, countryCode]);

  if (!isOpen) return null;

  return (
    <div className="space-y-1 text-xs">
      {loading ? (
        <p className="px-2 py-1 text-white/40">{t('admin.legislation_panel.loading')}</p>
      ) : Object.keys(legislations).length === 0 ? (
        <p className="px-2 py-1 text-white/40">{t('admin.legislation_panel.empty')}</p>
      ) : (
        Object.entries(legislations).map(([category, laws]) => (
          <div key={category}>
            <button
              onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
              className="flex w-full items-center gap-2 px-2 py-1 text-white/60 transition-colors hover:text-white/80"
            >
              <ChevronDown
                className={`h-3 w-3 flex-shrink-0 transition-transform ${expandedCategory === category ? 'rotate-180' : ''}`}
              />
              <span className="truncate">
                {categoryLabels[category]} ({laws.length})
              </span>
            </button>

            {expandedCategory === category && (
              <div className="space-y-1 py-1 pl-4">
                {laws.map((law) => (
                  <div
                    key={law.id}
                    className="py-0.5 text-white/60 transition-colors hover:text-white/80"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-white/40">•</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-white/80">{law.title}</p>
                        {law.summary && (
                          <p className="line-clamp-2 text-xs text-white/50">{law.summary}</p>
                        )}
                        {law.source_url && (
                          <a
                            href={law.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            {t('legislation.source')}
                          </a>
                        )}
                      </div>
                      {law.is_deprecated && (
                        <span className="flex-shrink-0 text-xs text-red-400">
                          {t('legislation.deprecated')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
