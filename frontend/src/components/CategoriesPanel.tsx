import { Loader2, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react'

export type CategoryStatus = 'pending' | 'searching' | 'done' | 'error'

interface Category {
  id: string
  name: string
  description: string
  status: CategoryStatus
  resultCount: number
}

interface CategoriesPanelProps {
  categories: Category[]
}

const CATEGORY_COLORS = {
  pending: 'text-white/50 bg-white/5',
  searching: 'text-blue-300 bg-blue-500/10',
  done: 'text-green-300 bg-green-500/10',
  error: 'text-red-300 bg-red-500/10',
}

const STATUS_ICONS = {
  pending: <div className="h-3 w-3 rounded-full border border-white/30" />,
  searching: <Loader2 className="h-3 w-3 animate-spin" />,
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
                <p className="truncate text-xs font-medium text-current">{category.name}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-current/70">
                  {category.description}
                </p>
              </div>

              {/* Result count or status indicator */}
              {category.status === 'done' && category.resultCount > 0 && (
                <div className="flex-shrink-0 rounded bg-current/20 px-1.5 py-0.5">
                  <p className="text-xs font-medium text-current">{category.resultCount}</p>
                </div>
              )}
              {category.status === 'searching' && (
                <ChevronRight className="h-3 w-3 flex-shrink-0 animate-pulse text-current" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
