import { useAdminCountries } from '@/hooks/useAdminCountries';
import { useExtractionChannel } from '@/hooks/useExtractionChannel';
import { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { CountrySection } from './CountrySection';
import { CrawlProgressBox } from './CrawlProgressBox';

export function AdminPage() {
  const { active, pending, loading, error, refetch, markCrawled, updateExtraction } =
    useAdminCountries();
  const { t } = useI18n();
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [selectedCountryName, setSelectedCountryName] = useState<string | null>(null);
  const [crawlInProgress, setCrawlInProgress] = useState(false);
  const [liveDocCount, setLiveDocCount] = useState<Record<string, number>>({});

  useExtractionChannel(
    useCallback(
      (data) => {
        updateExtraction(data.country_code, data.extraction_status, data.token_count);
      },
      [updateExtraction],
    ),
  );

  const handleCrawlStart = useCallback((code: string, name: string) => {
    setSelectedCountryCode(code);
    setSelectedCountryName(name);
    setCrawlInProgress(true);
  }, []);

  const handleDocCountUpdate = useCallback((code: string, count: number) => {
    setLiveDocCount((prev) => ({ ...prev, [code]: count }));
  }, []);

  const handleDocCountUpdateForCrawl = useCallback(
    (count: number) => {
      if (selectedCountryCode) {
        handleDocCountUpdate(selectedCountryCode, count);
      }
    },
    [selectedCountryCode, handleDocCountUpdate],
  );

  const handleCrawlComplete = useCallback(
    (documentCount: number) => {
      setCrawlInProgress(false);
      if (selectedCountryCode && documentCount > 0) {
        markCrawled(selectedCountryCode, documentCount);
      }
    },
    [selectedCountryCode, markCrawled],
  );

  if (loading) {
    return (
      <div className="bg-background text-foreground flex flex-1 items-center justify-center">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t('admin.crawl.loading')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background text-foreground flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-semibold text-red-400">{t('admin.crawl.error')}</p>
          <p className="text-muted-foreground mt-2 text-xs">{error}</p>
          <button
            onClick={refetch}
            className="text-foreground hover:text-foreground/80 mt-4 px-4 py-2 text-xs font-semibold"
          >
            {t('admin.crawl.retry')}
          </button>
        </div>
      </div>
    );
  }

  if (active.length === 0 && pending.length === 0) {
    return (
      <div className="bg-background text-foreground flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-sm font-semibold">
            {t('admin.crawl.no_countries')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground flex flex-1">
      {/* Main admin panel */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl space-y-8 p-3 md:p-6">
          {/* Header */}
          <div>
            <h1 className="text-xl font-semibold">{t('admin.header.title')}</h1>
            <p className="text-muted-foreground/70 mt-1 text-xs">{t('admin.header.description')}</p>
          </div>

          {/* Active countries section (green + yellow) */}
          {active.length > 0 && (
            <div>
              <CountrySection
                title={t('admin.section.active')}
                countries={active}
                onCrawlStart={handleCrawlStart}
                liveDocCount={liveDocCount}
              />
            </div>
          )}

          {/* Pending countries section (red) */}
          {pending.length > 0 && (
            <div>
              <CountrySection
                title={t('admin.section.pending')}
                countries={pending}
                onCrawlStart={handleCrawlStart}
                liveDocCount={liveDocCount}
              />
            </div>
          )}
        </div>
      </div>

      {/* Crawl progress overlay — centered */}
      {crawlInProgress && selectedCountryCode && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <CrawlProgressBox
            key={`crawl-${selectedCountryCode}`}
            countryCode={selectedCountryCode}
            countryName={selectedCountryName || ''}
            onComplete={handleCrawlComplete}
            onDocCountUpdate={handleDocCountUpdateForCrawl}
          />
        </div>
      )}
    </div>
  );
}
