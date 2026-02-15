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

  const extractedCount = country.extraction_completed ?? 0;
  const processingCount = country.extraction_processing ?? 0;
  const isFullyExtracted = currentDocCount > 0 && extractedCount === currentDocCount;
  const isProcessing = processingCount > 0;

  let extractionLabel: string | null = null;
  let extractionColor = '';

  if (currentDocCount > 0 && extractedCount > 0) {
    if (isFullyExtracted) {
      extractionLabel = `${extractedCount}/${currentDocCount} ${t('admin.extraction.progress')}`;
      extractionColor = 'bg-green-400/15 text-green-400';
    } else {
      extractionLabel = `${extractedCount}/${currentDocCount} ${t('admin.extraction.progress')}`;
      extractionColor = 'bg-amber-400/15 text-amber-400';
    }
  } else if (currentDocCount > 0 && isProcessing) {
    extractionLabel = t('admin.extraction.processing');
    extractionColor = 'bg-blue-400/15 text-blue-400';
  }

  const contentKB = country.content_size ? Math.round(country.content_size / 1024) : 0;
  const tokenCount = country.token_count ?? 0;
  const formatTokens = (count: number): string => {
    if (count >= 1000) return `~${Math.round(count / 1000)}k`;
    return String(count);
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

        {/* Document count + size + tokens + extraction badge */}
        {currentDocCount > 0 && (
          <div className="flex flex-shrink-0 items-center gap-2">
            <div className="text-muted-foreground text-xs">
              {currentDocCount}{' '}
              {currentDocCount === 1 ? t('admin.units.doc') : t('admin.units.docs')}
              {contentKB > 0 && <span className="text-muted-foreground/60"> · {contentKB} KB</span>}
              {tokenCount > 0 && (
                <span className="text-muted-foreground/60">
                  {' '}
                  · {formatTokens(tokenCount)} {t('admin.units.tokens')}
                </span>
              )}
            </div>
            {extractionLabel && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none font-medium ${extractionColor}`}
              >
                {extractionLabel}
              </span>
            )}
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
        <div className="ps-8 pe-2 pb-2">
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
