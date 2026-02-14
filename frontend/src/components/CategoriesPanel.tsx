import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export type CategoryStatus = 'pending' | 'searching' | 'done' | 'error'

interface WebSearchResult {
  title: string
  url: string
  snippet: string
  index: number
  total: number
}

interface Category {
  id: string
  name: string
  description: string
  status: CategoryStatus
  resultCount: number
  hasWebSearched?: boolean
  searchQuery?: string
  searchIndex?: number
  searchTotal?: number
  webSearchResults?: WebSearchResult[]
  itemsBeingDocumented?: number // Items found while parsing JSON
  webResultsCrawled?: boolean // True when web results have been crawled
  legislationsParsed?: boolean // True when legislations have been fully parsed
}

interface CategoriesPanelProps {
  categories: Category[]
}

const CATEGORY_COLORS = {
  pending: 'text-white/50',
  searching: 'text-blue-300 bg-blue-500/10 border border-blue-400/20',
  done: 'text-white/70',
  error: 'text-red-300 bg-red-500/10',
}

const STATUS_ICONS = {
  pending: <div className="h-3 w-3 rounded-full border border-white/30" />,
  searching: <Loader2 className="h-3 w-3 animate-spin text-blue-400" />,
  done: <CheckCircle2 className="h-3 w-3" />,
  error: <AlertCircle className="h-3 w-3" />,
}

// Get color based on parsing state
function getParsingColors(
  itemsBeingDocumented?: number,
  legislationsParsed?: boolean,
  webResultsCrawled?: boolean,
): { icon: string; text: string; spinner: string } {
  // Parsing complete → vibrant green
  if (legislationsParsed) {
    return {
      icon: 'text-green-500',
      text: 'text-green-400',
      spinner: 'text-green-500',
    }
  }

  // Parsing in progress → cyan
  if (itemsBeingDocumented && itemsBeingDocumented > 0) {
    return {
      icon: 'text-cyan-500',
      text: 'text-cyan-300',
      spinner: 'text-cyan-500',
    }
  }

  // Web crawled but not parsing yet → purple
  if (webResultsCrawled) {
    return {
      icon: 'text-violet-400',
      text: 'text-violet-300',
      spinner: 'text-violet-400',
    }
  }

  // Default (pending/searching) - neutral
  return {
    icon: 'text-white/50',
    text: 'text-white/50',
    spinner: 'text-white/50',
  }
}

export function CategoriesPanel({ categories }: CategoriesPanelProps) {
  // Debug: log all categories state
  console.log(
    '%c[CATEGORIES_STATE]',
    'color: #f59e0b; font-weight: bold',
    categories.map((c) => ({
      name: c.name,
      itemsBeingDocumented: c.itemsBeingDocumented,
      legislationsParsed: c.legislationsParsed,
      webResultsCrawled: c.webResultsCrawled,
    })),
  )

  return (
    <div className="flex h-full flex-col bg-black/30">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/[0.02] px-3 py-2.5">
        <p className="text-xs font-semibold text-white">Categories</p>
      </div>

      {/* Categories list */}
      <div className="flex-1 space-y-1.5 overflow-y-auto px-2 py-2.5">
        {categories.map((category) => (
          <div
            key={category.id}
            className={`rounded px-2.5 py-2 transition-colors ${CATEGORY_COLORS[category.status]}`}
          >
            <div className="flex items-start gap-2.5">
              {/* Status icon - color changes based on what's been completed */}
              <div className="mt-0.5 flex-shrink-0 text-current">
                {(() => {
                  const colors = getParsingColors(
                    category.itemsBeingDocumented,
                    category.legislationsParsed,
                    category.webResultsCrawled,
                  )

                  if (category.itemsBeingDocumented && category.itemsBeingDocumented > 0 && !category.legislationsParsed) {
                    // Loading while parsing - gradient yellow/amber
                    return <Loader2 className={`h-3 w-3 animate-spin ${colors.spinner}`} />
                  } else if (category.legislationsParsed) {
                    // Green checkmark when legislations parsed
                    return <CheckCircle2 className={`h-3 w-3 ${colors.icon}`} />
                  } else if (category.webResultsCrawled) {
                    // Purple checkmark when web results crawled
                    return <CheckCircle2 className={`h-3 w-3 ${colors.icon}`} />
                  } else {
                    return STATUS_ICONS[category.status]
                  }
                })()}
              </div>

              {/* Category info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p
                    className={`truncate text-xs font-medium ${
                      (() => {
                        const colors = getParsingColors(
                          category.itemsBeingDocumented,
                          category.legislationsParsed,
                          category.webResultsCrawled,
                        )
                        return colors.text
                      })()
                    }`}
                  >
                    {category.name}
                  </p>
                  {category.searchIndex !== undefined && (
                    <span className="flex-shrink-0 rounded bg-current/30 px-1.5 py-0.5 text-xs font-medium text-current">
                      [{category.searchIndex}/{category.searchTotal || 6}]
                    </span>
                  )}
                </div>
                {category.searchQuery && category.status === 'searching' ? (
                  <div className="mt-0.5 space-y-1">
                    <p className="line-clamp-2 text-xs text-current/70">
                      🔍 "{category.searchQuery}"
                    </p>
                    {category.webSearchResults && category.webSearchResults.length > 0 && (
                      <div className="max-h-24 space-y-0.5 overflow-y-auto rounded bg-black/30 p-1">
                        {category.webSearchResults.map((result, idx) => (
                          <a
                            key={idx}
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate text-xs text-blue-300 hover:text-blue-100 hover:underline"
                            title={result.title}
                          >
                            {result.index}/{result.total}: {result.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-0.5 line-clamp-2 text-xs text-current/70">
                    {category.description}
                  </p>
                )}
              </div>

              {/* Status indicators - stacked right column */}
              <div className="flex flex-shrink-0 flex-col items-end gap-1">
                {category.status === 'searching' && (
                  <span className="text-xs font-medium text-blue-300">Searching...</span>
                )}

                {/* Web results from search - only show if not parsing legislations yet */}
                {category.resultCount > 0 &&
                  (!category.itemsBeingDocumented || category.itemsBeingDocumented === 0) && (
                    <span
                      className={`text-xs font-medium ${
                        category.webResultsCrawled ? 'text-violet-300' : 'text-blue-300'
                      }`}
                    >
                      {category.resultCount} web results crawled
                    </span>
                  )}

                {/* Show legislations being parsed - hide web results when parsing starts */}
                {category.itemsBeingDocumented && category.itemsBeingDocumented > 0 && (
                  <span
                    className={`text-xs font-medium ${
                      (() => {
                        const colors = getParsingColors(
                          category.itemsBeingDocumented,
                          category.legislationsParsed,
                          category.webResultsCrawled,
                        )
                        return colors.text
                      })()
                    }`}
                  >
                    {category.legislationsParsed
                      ? `${category.itemsBeingDocumented} legislations`
                      : `${category.itemsBeingDocumented} legislations parsed`}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
