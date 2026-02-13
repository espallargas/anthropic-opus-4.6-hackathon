import { useState } from 'react'
import { RefreshCw, ChevronDown } from 'lucide-react'
import type { Country } from '@/lib/api'
import { LegislationPanel } from './LegislationPanel'
import { timeAgo } from '@/lib/time'

interface CountryListItemProps {
  country: Country
  onCrawlStart: (code: string, name: string) => void
  docCount?: number
}

export function CountryListItem({
  country,
  onCrawlStart,
  docCount,
}: CountryListItemProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const statusColor =
    country.status === 'green'
      ? 'bg-green-500'
      : country.status === 'yellow'
        ? 'bg-yellow-500'
        : 'bg-red-500'

  const currentDocCount = docCount ?? country.legislation_count

  const handleRefresh = () => {
    setIsLoading(true)
    onCrawlStart(country.code, country.name)
  }

  return (
    <div className="space-y-0">
      <div className="flex items-center gap-3 rounded px-2 py-2 transition-all hover:bg-white/5">
        {/* Status dot */}
        <div className={`h-2 w-2 rounded-full ${statusColor} flex-shrink-0`} />

        {/* Flag */}
        <span className="text-lg">{country.flag_emoji}</span>

        {/* Country name + metadata */}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{country.name}</div>
          {country.last_crawled_at && (
            <div className="text-xs text-white/40">
              atualizado {timeAgo(country.last_crawled_at)}
            </div>
          )}
        </div>

        {/* Document count */}
        {currentDocCount > 0 && (
          <div className="flex-shrink-0 text-xs text-white/60">
            {currentDocCount}
            <span className="ml-1 text-white/40">{currentDocCount === 1 ? 'doc' : 'docs'}</span>
          </div>
        )}

        {/* Expand button if has legislations */}
        {currentDocCount > 0 && (
          <button
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className="p-1 text-white/40 transition-colors hover:text-white/60"
            title="View legislations"
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
          className="p-1 text-white/40 transition-colors hover:text-white/60 disabled:opacity-30"
          title="Refresh legislation"
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
  )
}
