import { useState } from 'react'
import { RefreshCw, ChevronDown } from 'lucide-react'
import type { Country } from '@/lib/api'
import { LegislationPanel } from './LegislationPanel'
import { timeAgo } from '@/lib/time'

interface CountryListItemProps {
  country: Country
  isSelected: boolean
  onCrawlStart: () => void
}

export function CountryListItem({
  country,
  isSelected,
  onCrawlStart,
}: CountryListItemProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const statusColor =
    country.status === 'green'
      ? 'bg-green-500'
      : country.status === 'yellow'
        ? 'bg-yellow-500'
        : 'bg-red-500'

  const handleRefresh = () => {
    setIsLoading(true)
    onCrawlStart()
  }

  return (
    <div className="space-y-0">
      <div className="flex items-center gap-3 px-2 py-2 transition-all hover:bg-white/5 rounded">
        {/* Status dot */}
        <div className={`h-2 w-2 rounded-full ${statusColor} flex-shrink-0`} />

        {/* Flag */}
        <span className="text-lg">{country.flag_emoji}</span>

        {/* Country name + metadata */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{country.name}</div>
          {country.last_crawled_at && (
            <div className="text-xs text-white/40">
              atualizado {timeAgo(country.last_crawled_at)}
            </div>
          )}
        </div>

        {/* Document count */}
        {country.legislation_count > 0 && (
          <div className="text-xs text-white/60 flex-shrink-0">
            {country.legislation_count}
            <span className="text-white/40 ml-1">
              {country.legislation_count === 1 ? 'doc' : 'docs'}
            </span>
          </div>
        )}

        {/* Expand button if has legislations */}
        {country.legislation_count > 0 && (
          <button
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className="text-white/40 hover:text-white/60 transition-colors p-1"
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
          className="text-white/40 hover:text-white/60 transition-colors p-1 disabled:opacity-30"
          title="Refresh legislation"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Legislation panel - more compact */}
      {isPanelOpen && country.legislation_count > 0 && (
        <div className="pl-8 pr-2 pb-2">
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
