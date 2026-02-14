import { Loader2, CheckCircle2, AlertCircle, Globe } from 'lucide-react'

export type CategoryStatus = 'pending' | 'searching' | 'done' | 'error'

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
}

interface CategoriesPanelProps {
  categories: Category[]
}

const CATEGORY_COLORS = {
  pending: 'text-white/50 bg-white/5',
  searching: 'text-blue-300 bg-blue-500/20 border border-blue-400/30',
  done: 'text-green-300 bg-green-500/10',
  error: 'text-red-300 bg-red-500/10',
}

const STATUS_ICONS = {
  pending: <div className="h-3 w-3 rounded-full border border-white/30" />,
  searching: <Loader2 className="h-3 w-3 animate-spin text-blue-400" />,
  done: <CheckCircle2 className="h-3 w-3" />,
  error: <AlertCircle className="h-3 w-3" />,
}

export function CategoriesPanel({ categories }: CategoriesPanelProps) {
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
              {/* Status icon */}
              <div className="mt-0.5 flex-shrink-0 text-current">
                {STATUS_ICONS[category.status]}
              </div>

              {/* Category info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-xs font-medium text-current">{category.name}</p>
                  {category.searchIndex !== undefined && (
                    <span className="flex-shrink-0 rounded bg-current/30 px-1.5 py-0.5 text-xs font-medium text-current">
                      [{category.searchIndex}/{category.searchTotal || 6}]
                    </span>
                  )}
                </div>
                {category.searchQuery && category.status === 'searching' ? (
                  <p className="mt-0.5 line-clamp-2 text-xs text-current/70">
                    🔍 "{category.searchQuery}"
                  </p>
                ) : (
                  <p className="mt-0.5 line-clamp-2 text-xs text-current/70">
                    {category.description}
                  </p>
                )}
              </div>

              {/* Web search badge and status indicator */}
              <div className="flex flex-shrink-0 items-center gap-1.5">
                {category.status === 'searching' && (
                  <div className="flex items-center gap-1 rounded-full bg-blue-500/30 px-2 py-0.5">
                    <Globe className="h-2.5 w-2.5 text-blue-300" />
                    <span className="text-xs font-medium text-blue-200">Searching</span>
                  </div>
                )}
                {category.status === 'done' && category.resultCount > 0 && (
                  <div className="flex-shrink-0 rounded bg-current/20 px-1.5 py-0.5">
                    <p className="text-xs font-medium text-current">
                      {category.resultCount} results
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
