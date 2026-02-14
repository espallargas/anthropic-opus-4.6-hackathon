import { useAdminCountries } from '@/hooks/useAdminCountries';
import { useState, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { CountrySection } from './CountrySection';
import { CrawlProgressBox } from './CrawlProgressBox';

export function AdminPage() {
  const { active, pending, loading, error, refetch, markCrawled } = useAdminCountries();
  const { t } = useI18n();
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [selectedCountryName, setSelectedCountryName] = useState<string | null>(null);
  const [crawlInProgress, setCrawlInProgress] = useState(false);
  const [liveDocCount, setLiveDocCount] = useState<Record<string, number>>({});

  const handleCrawlStart = useCallback((code: string, name: string) => {
    setSelectedCountryCode(code);
    setSelectedCountryName(name);
    setCrawlInProgress(true);
  }, []);

  const handleDocCountUpdate = useCallback((code: string, count: number) => {
    setLiveDocCount((prev) => ({ ...prev, [code]: count }));
  }, []);

  const handleCrawlComplete = useCallback(
    (documentCount: number) => {
      setCrawlInProgress(false);
      if (selectedCountryCode && documentCount > 0) {
        markCrawled(selectedCountryCode, documentCount);
      }
      // Background refetch to sync with server (no loading flash)
      setTimeout(() => {
        refetch();
      }, 3500);
    },
    [selectedCountryCode, markCrawled, refetch],
  );

  if (loading) {
    return (
      <div className="bg-background text-foreground flex h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">{t('admin.crawl.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background text-foreground flex h-screen items-center justify-center">
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
      <div className="bg-background text-foreground flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-sm font-semibold">
            {t('admin.crawl.no_countries')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground flex h-screen w-full">
      {/* Main admin panel */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl space-y-8 p-6">
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

      {/* Crawl progress panel */}
      {crawlInProgress && selectedCountryCode && (
        <CrawlProgressBox
          key={`crawl-${selectedCountryCode}`}
          countryCode={selectedCountryCode}
          countryName={selectedCountryName || ''}
          onComplete={handleCrawlComplete}
          onDocCountUpdate={(count) => handleDocCountUpdate(selectedCountryCode!, count)}
        />
      )}
    </div>
  );
}
