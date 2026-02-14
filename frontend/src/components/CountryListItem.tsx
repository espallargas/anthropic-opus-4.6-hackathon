import { useState } from 'react';
import { RefreshCw, ChevronDown } from 'lucide-react';
import type { Country } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { getCountryNameLocalized } from '@/lib/countries';
import { LegislationPanel } from './LegislationPanel';
import { timeAgo } from '@/lib/time';

interface CountryListItemProps {
  country: Country;
  onCrawlStart: (code: string, name: string) => void;
  docCount?: number;
}

export function CountryListItem({ country, onCrawlStart, docCount }: CountryListItemProps) {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const statusColor =
    country.status === 'green'
      ? 'bg-green-500'
      : country.status === 'yellow'
        ? 'bg-yellow-500'
        : 'bg-red-500';

  const currentDocCount = docCount ?? country.legislation_count;
  const localizedName = getCountryNameLocalized(country.code, t);

  const handleRefresh = () => {
    setIsLoading(true);
    onCrawlStart(country.code, localizedName);
  };

  return (
    <div className="space-y-0">
      <div className="hover:bg-accent/50 flex items-center gap-3 rounded px-2 py-2 transition-all">
        {/* Status dot */}
        <div className={`h-2 w-2 rounded-full ${statusColor} flex-shrink-0`} />

        {/* Flag */}
        <span className="text-lg">{country.flag_emoji}</span>

        {/* Country name + metadata */}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{localizedName}</div>
          {country.last_crawled_at && (
            <div className="text-muted-foreground/70 text-xs">
              {t('admin.country_item.updated')} {timeAgo(country.last_crawled_at)}
            </div>
          )}
        </div>

        {/* Document count */}
        {currentDocCount > 0 && (
          <div className="text-muted-foreground flex-shrink-0 text-xs">
            {currentDocCount}
            <span className="text-muted-foreground/70 ml-1">
              {currentDocCount === 1 ? t('admin.units.doc') : t('admin.units.docs')}
            </span>
          </div>
        )}

        {/* Expand button if has legislations */}
        {currentDocCount > 0 && (
          <button
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className="text-muted-foreground/70 hover:text-muted-foreground p-1 transition-colors"
            title={t('admin.country_item.view_legislations')}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isPanelOpen ? 'rotate-180' : ''}`}
            />
          </button>
        )}

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="text-muted-foreground/70 hover:text-muted-foreground p-1 transition-colors disabled:opacity-30"
          title={t('admin.country_item.refresh_legislation')}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Legislation panel - more compact */}
      {isPanelOpen && currentDocCount > 0 && (
        <div className="pr-2 pb-2 pl-8">
          <LegislationPanel
            countryCode={country.code}
            isOpen={isPanelOpen}
            onToggle={() => setIsPanelOpen(!isPanelOpen)}
          />
        </div>
      )}
    </div>
  );
}
