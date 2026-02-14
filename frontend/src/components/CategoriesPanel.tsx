import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export type CategoryStatus = 'pending' | 'searching' | 'done' | 'error';

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  index: number;
  total: number;
}

interface Category {
  id: string;
  name: string;
  description: string;
  status: CategoryStatus;
  resultCount: number;
  hasWebSearched?: boolean;
  searchQuery?: string;
  searchIndex?: number;
  searchTotal?: number;
  webSearchResults?: WebSearchResult[];
  itemsBeingDocumented?: number; // Items found while parsing JSON
  webResultsCrawled?: boolean; // True when web results have been crawled
  legislationsParsed?: boolean; // True when legislations have been fully parsed
}

interface CategoriesPanelProps {
  categories: Category[];
}

const CATEGORY_COLORS = {
  pending: 'text-muted-foreground',
  searching: 'text-primary/80 bg-primary/5 border border-primary/15',
  done: 'text-muted-foreground',
  error: 'text-destructive bg-destructive/10',
};

const STATUS_ICONS = {
  pending: <div className="border-muted-foreground/50 h-3 w-3 rounded-full border" />,
  searching: <Loader2 className="h-3 w-3 animate-spin text-blue-400" />,
  done: <CheckCircle2 className="h-3 w-3" />,
  error: <AlertCircle className="h-3 w-3" />,
};

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
    };
  }

  // Parsing in progress → cyan
  if (itemsBeingDocumented && itemsBeingDocumented > 0) {
    return {
      icon: 'text-cyan-500',
      text: 'text-cyan-300',
      spinner: 'text-cyan-500',
    };
  }

  // Web crawled but not parsing yet → purple
  if (webResultsCrawled) {
    return {
      icon: 'text-violet-400',
      text: 'text-violet-300',
      spinner: 'text-violet-400',
    };
  }

  // Default (pending/searching) - neutral
  return {
    icon: 'text-muted-foreground',
    text: 'text-muted-foreground',
    spinner: 'text-muted-foreground',
  };
}

export function CategoriesPanel({ categories }: CategoriesPanelProps) {
  const { t } = useI18n();

  return (
    <div className="bg-card/20 flex h-full flex-col">
      {/* Header */}
      <div className="border-border bg-card/30 border-b px-3 py-2.5">
        <p className="text-foreground text-xs font-semibold">{t('admin.categories.title')}</p>
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
                  );

                  if (
                    category.itemsBeingDocumented &&
                    category.itemsBeingDocumented > 0 &&
                    !category.legislationsParsed
                  ) {
                    // Loading while parsing - gradient yellow/amber
                    return <Loader2 className={`h-3 w-3 animate-spin ${colors.spinner}`} />;
                  } else if (category.legislationsParsed) {
                    // Green checkmark when legislations parsed
                    return <CheckCircle2 className={`h-3 w-3 ${colors.icon}`} />;
                  } else if (category.webResultsCrawled) {
                    // Purple checkmark when web results crawled
                    return <CheckCircle2 className={`h-3 w-3 ${colors.icon}`} />;
                  } else {
                    return STATUS_ICONS[category.status];
                  }
                })()}
              </div>

              {/* Category info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p
                    className={`truncate text-xs font-medium ${(() => {
                      const colors = getParsingColors(
                        category.itemsBeingDocumented,
                        category.legislationsParsed,
                        category.webResultsCrawled,
                      );
                      return colors.text;
                    })()}`}
                  >
                    {category.name}
                  </p>
                </div>
                {category.searchQuery && category.status === 'searching' ? (
                  <div className="mt-0.5 space-y-1">
                    <p className="line-clamp-2 text-xs text-current/70">
                      🔍 "{category.searchQuery}"
                    </p>
                    {category.webSearchResults && category.webSearchResults.length > 0 && (
                      <div className="bg-card/30 max-h-24 space-y-0.5 overflow-y-auto rounded p-1">
                        {category.webSearchResults.map((result, idx) => (
                          <a
                            key={idx}
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary/80 hover:text-primary block truncate text-xs hover:underline"
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
                  <span className="text-primary/80 text-xs font-medium">
                    {t('admin.categories.searching')}
                  </span>
                )}

                {/* Web results from search - only show if not parsing legislations yet */}
                {category.resultCount > 0 &&
                  (!category.itemsBeingDocumented || category.itemsBeingDocumented === 0) && (
                    <span
                      className={`text-xs font-medium ${
                        category.webResultsCrawled ? 'text-muted-foreground' : 'text-primary/80'
                      }`}
                    >
                      {category.resultCount} {t('admin.categories.results_crawled')}
                    </span>
                  )}

                {/* Show legislations being parsed - hide web results when parsing starts */}
                {category.itemsBeingDocumented && category.itemsBeingDocumented > 0 && (
                  <span
                    className={`text-xs font-medium ${(() => {
                      const colors = getParsingColors(
                        category.itemsBeingDocumented,
                        category.legislationsParsed,
                        category.webResultsCrawled,
                      );
                      return colors.text;
                    })()}`}
                  >
                    {category.legislationsParsed
                      ? `${category.itemsBeingDocumented} ${t('admin.units.legislations')}`
                      : `${category.itemsBeingDocumented} ${t('admin.categories.parsed')}`}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
