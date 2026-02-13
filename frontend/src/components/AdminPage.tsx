import { useAdminCountries } from '@/hooks/useAdminCountries'
import { useState, useCallback } from 'react'
import { CountrySection } from './CountrySection'
import { CrawlProgressBox } from './CrawlProgressBox'

export function AdminPage() {
  const { active, pending, loading, refetch } = useAdminCountries()
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null)
  const [selectedCountryName, setSelectedCountryName] = useState<string | null>(null)
  const [crawlInProgress, setCrawlInProgress] = useState(false)
  const [liveDocCount, setLiveDocCount] = useState<Record<string, number>>({})

  const handleCrawlStart = useCallback((code: string, name: string) => {
    setSelectedCountryCode(code)
    setSelectedCountryName(name)
    setCrawlInProgress(true)
  }, [])

  const handleDocCountUpdate = useCallback((code: string, count: number) => {
    setLiveDocCount((prev) => ({ ...prev, [code]: count }))
  }, [])

  const handleCrawlComplete = useCallback(() => {
    setCrawlInProgress(false)
    refetch()
  }, [refetch])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-white/50">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full bg-black text-white">
      {/* Main admin panel */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl space-y-8 p-6">
          {/* Header */}
          <div>
            <h1 className="text-xl font-semibold">Legislation Admin</h1>
            <p className="mt-1 text-xs text-white/40">Manage country legislation</p>
          </div>

          {/* Active countries section (green + yellow) */}
          {active.length > 0 && (
            <div>
              <CountrySection
                title="Active"
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
                title="Pending"
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
          countryCode={selectedCountryCode}
          countryName={selectedCountryName || ''}
          onComplete={handleCrawlComplete}
          onDocCountUpdate={(count) => handleDocCountUpdate(selectedCountryCode!, count)}
        />
      )}
    </div>
  )
}
