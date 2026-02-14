import { CrawlCategoryCard } from '@/components/CrawlCategoryCard';
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

interface CrawlAgentPanelProps {
  categories: CategoryState[];
}

export function CrawlAgentPanel({ categories }: CrawlAgentPanelProps) {
  return (
    <div className="my-2 space-y-2 border-l-2 border-white/10 pl-3">
      {categories.map((category) => (
        <CrawlCategoryCard key={category.id} category={category} />
      ))}
    </div>
  );
}
