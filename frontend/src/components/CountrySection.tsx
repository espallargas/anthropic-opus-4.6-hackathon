import { CountryListItem } from './CountryListItem'
import type { Country } from '@/lib/api'

interface CountrySectionProps {
  title: string
  countries: Country[]
  selectedCountryCode: string | null
  onCrawlStart: (code: string, name: string) => void
  liveDocCount?: Record<string, number>
}

export function CountrySection({
  title,
  countries,
  selectedCountryCode,
  onCrawlStart,
  liveDocCount = {},
}: CountrySectionProps) {
  if (countries.length === 0) {
    return null
  }

  return (
    <div>
      <h2 className="mb-3 text-xs font-semibold tracking-wide text-white/50 uppercase">{title}</h2>
      <div className="space-y-0 divide-y divide-white/10 rounded border border-white/10">
        {countries.map((country) => (
          <CountryListItem
            key={country.code}
            country={country}
            isSelected={country.code === selectedCountryCode}
            onCrawlStart={onCrawlStart}
            docCount={liveDocCount[country.code]}
          />
        ))}
      </div>
    </div>
  )
}
