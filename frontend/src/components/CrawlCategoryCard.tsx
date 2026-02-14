import { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Loader2, XCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { CategoryStatus } from './CategoriesPanel';

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  index: number;
  total: number;
}

interface CategoryState {
  id: string;
  name: string;
  description: string;
  status: CategoryStatus;
  phase: 'pending' | 'searching' | 'indexing' | 'completed';
  resultCount: number;
  searchQuery?: string;
  searchIndex?: number;
  searchTotal?: number;
  webSearchResults?: WebSearchResult[];
  itemsBeingDocumented?: number;
  webResultsCrawled?: boolean;
  legislationsParsed?: boolean;
}

interface CrawlCategoryCardProps {
  category: CategoryState;
}

export function CrawlCategoryCard({ category }: CrawlCategoryCardProps) {
  const { t } = useI18n();
  const isError = category.status === 'error';
  const [expanded, setExpanded] = useState(true);

  const borderClass = category.phase === 'searching'
    ? 'animate-agent-active border-blue-400/30'
    : category.phase === 'indexing'
      ? 'animate-agent-indexing border-purple-400/30'
      : category.phase === 'completed'
        ? 'animate-agent-complete border-green-400/15'
        : isError
          ? 'border-red-400/40'
          : 'border-white/10';

  const StatusIcon = category.phase === 'searching'
    ? Loader2
    : category.phase === 'indexing'
      ? Loader2
      : category.phase === 'completed'
        ? CheckCircle2
        : isError
          ? XCircle
          : null;

  const statusIconClass = category.phase === 'searching'
    ? 'h-4 w-4 animate-spin text-blue-400'
    : category.phase === 'indexing'
      ? 'h-4 w-4 animate-spin text-purple-400'
      : category.phase === 'completed'
        ? 'h-4 w-4 text-green-400'
        : isError
          ? 'h-4 w-4 text-red-400'
          : '';

  return (
    <div className={`rounded-lg border bg-white/5 backdrop-blur-sm ${borderClass}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs"
      >
        {StatusIcon && <StatusIcon className={statusIconClass} />}
        <div className="flex-1">
          <span className="truncate font-medium text-white/80">{category.name}</span>
          <p className="text-[10px] text-white/50">{category.description}</p>
        </div>
        {category.phase === 'searching' && (
          <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-400/70 whitespace-nowrap">
            {t('admin.crawl.searching')} {category.name}
          </span>
        )}
        {category.phase === 'indexing' && category.itemsBeingDocumented && category.itemsBeingDocumented > 0 && (
          <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-400/70 whitespace-nowrap">
            {category.itemsBeingDocumented} {t('admin.crawl.documents_indexed')}
          </span>
        )}
        {category.phase === 'completed' && (
          <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-400/70 whitespace-nowrap">
            {category.resultCount} {t('admin.crawl.documents_indexed')}
          </span>
        )}
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-white/30" />
        ) : (
          <ChevronRight className="h-3 w-3 text-white/30" />
        )}
      </button>

      {expanded && (
        <div className="space-y-1 border-t border-white/5 px-3 py-2">
          {category.searchQuery && (
            <p className="line-clamp-2 text-xs text-white/70">
              🔍 <span className="italic">{category.searchQuery}</span>
            </p>
          )}
          {category.webSearchResults && category.webSearchResults.length > 0 && (
            <div className="space-y-1">
              {category.webSearchResults.slice(0, 3).map((result, idx) => (
                <a
                  key={idx}
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-[10px] text-blue-300/80 hover:text-blue-300 hover:underline"
                  title={result.title}
                >
                  {result.title}
                </a>
              ))}
              {category.webSearchResults.length > 3 && (
                <p className="text-[10px] text-white/30">
                  +{category.webSearchResults.length - 3} more
                </p>
              )}
            </div>
          )}
          {!category.searchQuery && category.description && (
            <p className="text-[10px] text-white/50">{category.description}</p>
          )}
        </div>
      )}
    </div>
  );
}
