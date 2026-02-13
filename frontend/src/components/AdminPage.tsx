import { useAdminCountries } from '@/hooks/useAdminCountries'
import { useState } from 'react'
import { CountrySection } from './CountrySection'
import { CrawlProgressBox } from './CrawlProgressBox'

export function AdminPage() {
  const { active, pending, loading, refetch } = useAdminCountries()
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null)
  const [crawlInProgress, setCrawlInProgress] = useState(false)
  const [crawlMessages, setCrawlMessages] = useState<string[]>([])

  const handleCrawlStart = (code: string) => {
    setSelectedCountryCode(code)
    setCrawlInProgress(true)
    setCrawlMessages([])
  }

  const handleCrawlComplete = () => {
    setCrawlInProgress(false)
    refetch()
  }

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
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-xl font-semibold">Legislation Admin</h1>
            <p className="text-xs text-white/40 mt-1">Manage country legislation</p>
          </div>

          {/* Active countries section (green + yellow) */}
          {active.length > 0 && (
            <div>
              <CountrySection
                title="Active"
                countries={active}
                selectedCountryCode={selectedCountryCode}
                onCrawlStart={handleCrawlStart}
              />
            </div>
          )}

          {/* Pending countries section (red) */}
          {pending.length > 0 && (
            <div>
              <CountrySection
                title="Pending"
                countries={pending}
                selectedCountryCode={selectedCountryCode}
                onCrawlStart={handleCrawlStart}
              />
            </div>
          )}
        </div>
      </div>

      {/* Crawl progress panel */}
      {crawlInProgress && selectedCountryCode && (
        <CrawlProgressBox
          countryCode={selectedCountryCode}
          messages={crawlMessages}
          setMessages={setCrawlMessages}
          onComplete={handleCrawlComplete}
        />
      )}
    </div>
  )
}
