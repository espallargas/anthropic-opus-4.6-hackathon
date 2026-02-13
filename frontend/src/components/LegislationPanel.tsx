import { useState, useEffect } from 'react'
import { apiFetch, type CountryDetailsResponse, type Legislation } from '@/lib/api'
import { ChevronDown } from 'lucide-react'

interface LegislationPanelProps {
  countryCode: string
  isOpen: boolean
  onToggle: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  federal_laws: 'Federal Laws',
  regulations: 'Regulations',
  consular: 'Consular Rules',
  jurisdictional: 'Jurisdictional Rules',
  complementary: 'Health & Complementary',
  auxiliary: 'Auxiliary Information',
}

export function LegislationPanel({
  countryCode,
  isOpen,
  onToggle,
}: LegislationPanelProps) {
  const [legislations, setLegislations] = useState<Record<string, Legislation[]>>({})
  const [loading, setLoading] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const fetchLegislations = async () => {
      try {
        setLoading(true)
        const data = await apiFetch<CountryDetailsResponse>(
          `/admin/countries/${countryCode}`
        )
        setLegislations(data.legislations)
      } catch (err) {
        console.error('Failed to fetch legislations:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchLegislations()
  }, [isOpen, countryCode])

  if (!isOpen) return null

  return (
    <div className="space-y-1 text-xs">
      {loading ? (
        <p className="text-white/40 px-2 py-1">Loading...</p>
      ) : Object.keys(legislations).length === 0 ? (
        <p className="text-white/40 px-2 py-1">No legislations</p>
      ) : (
        Object.entries(legislations).map(([category, laws]) => (
          <div key={category}>
            <button
              onClick={() =>
                setExpandedCategory(
                  expandedCategory === category ? null : category
                )
              }
              className="flex w-full items-center gap-2 px-2 py-1 text-white/60 hover:text-white/80 transition-colors"
            >
              <ChevronDown
                className={`h-3 w-3 transition-transform flex-shrink-0 ${expandedCategory === category ? 'rotate-180' : ''}`}
              />
              <span className="truncate">
                {CATEGORY_LABELS[category]} ({laws.length})
              </span>
            </button>

            {expandedCategory === category && (
              <div className="space-y-1 pl-4 py-1">
                {laws.map((law) => (
                  <div
                    key={law.id}
                    className="text-white/60 hover:text-white/80 transition-colors py-0.5"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-white/40">•</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/80 text-xs truncate">{law.title}</p>
                        {law.summary && (
                          <p className="text-white/50 text-xs line-clamp-2">
                            {law.summary}
                          </p>
                        )}
                        {law.source_url && (
                          <a
                            href={law.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-xs hover:underline"
                          >
                            source
                          </a>
                        )}
                      </div>
                      {law.is_deprecated && (
                        <span className="text-xs text-red-400 flex-shrink-0">
                          deprecated
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
  )
}
