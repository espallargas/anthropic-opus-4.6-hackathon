/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Pause } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getCountryNameLocalized } from '@/lib/countries';
import { CrawlAgentPanel } from './CrawlAgentPanel';
import { ClaudeOutputPanel } from './ClaudeOutputPanel';
import type { ThinkingBlock } from '@/lib/chatStore';
import type { CategoryStatus } from './CategoriesPanel';
import '../styles/crawler.css';

interface CrawlProgressBoxProps {
  countryCode: string;
  countryName: string;
  onComplete: () => void;
  onDocCountUpdate?: (count: number) => void;
}

interface SSEMessage {
  type: string;
  [key: string]: string | number | boolean | undefined;
}

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
  itemsBeingDocumented?: number; // Items found while parsing JSON in real-time
  webResultsCrawled?: boolean; // True when web results have been crawled
  legislationsParsed?: boolean; // True when legislations have been fully parsed
}

export function CrawlProgressBox({
  countryCode,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  countryName: _countryName,
  onComplete,
  onDocCountUpdate,
}: CrawlProgressBoxProps) {
  const { t } = useI18n();
  const localizedCountryName = getCountryNameLocalized(countryCode, t);
  const [thinkingText, setThinkingText] = useState('');
  const [thinkingType, setThinkingType] = useState<string | null>(null);
  const [claudeOutputText, setClaudeOutputText] = useState('');
  const [categories, setCategories] = useState<CategoryState[]>([
    {
      id: 'federal_laws',
      name: t('admin.category.federal_laws'),
      description: t('admin.category.federal_laws.description'),
      status: 'pending',
      phase: 'pending',
      resultCount: 0,
    },
    {
      id: 'regulations',
      name: t('admin.category.regulations'),
      description: t('admin.category.regulations.description'),
      status: 'pending',
      phase: 'pending',
      resultCount: 0,
    },
    {
      id: 'consular',
      name: t('admin.category.consular'),
      description: t('admin.category.consular.description'),
      status: 'pending',
      phase: 'pending',
      resultCount: 0,
    },
    {
      id: 'jurisdictional',
      name: t('admin.category.jurisdictional'),
      description: t('admin.category.jurisdictional.description'),
      status: 'pending',
      phase: 'pending',
      resultCount: 0,
    },
    {
      id: 'complementary',
      name: t('admin.category.complementary'),
      description: t('admin.category.complementary.description'),
      status: 'pending',
      phase: 'pending',
      resultCount: 0,
    },
    {
      id: 'auxiliary',
      name: t('admin.category.auxiliary'),
      description: t('admin.category.auxiliary.description'),
      status: 'pending',
      phase: 'pending',
      resultCount: 0,
    },
  ]);
  const [isComplete, setIsComplete] = useState(false);
  const [documentCount, setDocumentCount] = useState(0);
  const [inputTokens, setInputTokens] = useState(0);
  const [outputTokens, setOutputTokens] = useState(0);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string>('');

  const crawlStartedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const processMessageRef = useRef<(data: SSEMessage) => void | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // Helper function to count items in partial JSON by category
  const parsePartialJSONByCategory = useCallback((jsonText: string): Record<string, number> => {
    const categoryMap: Record<string, number> = {
      federal_laws: 0,
      regulations: 0,
      consular: 0,
      jurisdictional: 0,
      complementary: 0,
      auxiliary: 0,
    };

    try {
      // Try to find each category's array
      for (const key of Object.keys(categoryMap)) {
        // Match patterns like "federal_laws": [ ... items ... ]
        const pattern = new RegExp(`"${key}"\\s*:\\s*\\[`, 'i');
        if (pattern.test(jsonText)) {
          // Find the opening bracket
          const match = jsonText.match(pattern);
          if (match) {
            const startIdx = jsonText.indexOf(match[0]) + match[0].length;
            // Extract content until we hit a closing bracket (may be incomplete)
            let bracketCount = 1;
            let endIdx = startIdx;
            for (let i = startIdx; i < jsonText.length && bracketCount > 0; i++) {
              if (jsonText[i] === '[') bracketCount++;
              else if (jsonText[i] === ']') bracketCount--;
              endIdx = i;
            }

            const arrayContent = jsonText.substring(startIdx, endIdx);
            // Count objects with "title" field
            const itemCount = (arrayContent.match(/\{[^}]*"title"/g) || []).length;
            categoryMap[key] = itemCount;
          }
        }
      }
    } catch {
      // Silent fail
    }

    return categoryMap;
  }, []);

  // Update category names when language changes
  useEffect(() => {
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        name: t(`admin.category.${cat.id}`),
        description: t(`admin.category.${cat.id}.description`),
      })),
    );
  }, [t]);

  // Update refs whenever dependencies change
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Track doc count changes
  useEffect(() => {
    if (documentCount > 0 && onDocCountUpdate) {
      onDocCountUpdate(documentCount);
    }
  }, [documentCount, onDocCountUpdate]);

  // Count items in real-time as Claude output (JSON) arrives
  // Only update itemsBeingDocumented during indexing phase
  useEffect(() => {
    if (!claudeOutputText) return;

    const categoryCounts = parsePartialJSONByCategory(claudeOutputText);

    setCategories((prev) =>
      prev.map((cat) => {
        // Only update count during indexing phase
        if (cat.phase === 'indexing') {
          const categoryKey = cat.id as keyof typeof categoryCounts;
          const count = categoryCounts[categoryKey] || 0;
          return {
            ...cat,
            itemsBeingDocumented: count,
          };
        }
        return cat;
      }),
    );
  }, [claudeOutputText, parsePartialJSONByCategory]);

  // Process incoming SSE messages
  const processMessage = useCallback((data: SSEMessage) => {
    if (data.type === 'thinking') {
      const text = (data.text as string) || '';
      const type = (data.thinking_type as string) || null;
      if (text) {
        setThinkingText((prev) => prev + text);
      }
      if (type && !thinkingType) {
        setThinkingType(type);
      }
    } else if (data.type === 'claude_text') {
      const text = (data.text as string) || '';
      if (text) {
        setClaudeOutputText((prev) => prev + text);
      }
    } else if (data.type === 'search_started') {
      const categoryId = data.category as string;
      const query = (data.query as string) || '';
      const searchIndex = (data.index as number) || 0;
      const searchTotal = (data.total as number) || 6;

      setCategories((prev) =>
        prev.map((cat) => {
          if (cat.id === categoryId) {
            return {
              ...cat,
              status: 'searching' as CategoryStatus,
              phase: 'searching',
              searchQuery: query,
              searchIndex,
              searchTotal,
              hasWebSearched: true,
            };
          }
          return cat;
        }),
      );
    } else if (data.type === 'web_search_result') {
      const category = (data.category as string) || '';
      const title = (data.title as string) || '';
      const url = (data.url as string) || '';
      const snippet = (data.snippet as string) || '';
      const index = (data.index as number) || 0;
      const total = (data.total as number) || 0;

      setCategories((prev) =>
        prev.map((cat) => {
          if (cat.name === category) {
            const results = cat.webSearchResults || [];
            return {
              ...cat,
              webSearchResults: [
                ...results,
                {
                  title,
                  url,
                  snippet,
                  index,
                  total,
                },
              ],
            };
          }
          return cat;
        }),
      );
    } else if (data.type === 'search_result') {
      const categoryId = data.category as string;
      const resultCount = (data.result_count as number) || 0;

      setCategories((prev) =>
        prev.map((cat) => {
          if (cat.id === categoryId) {
            return {
              ...cat,
              status: 'searching' as CategoryStatus,
              phase: 'indexing',
              resultCount,
              searchQuery: undefined,
              webResultsCrawled: true,
            };
          }
          return cat;
        }),
      );
    } else if (data.type === 'phase') {
      const message = data.message as string;
      if (message) {
        setCurrentPhase(message);
      }
    } else if (data.type === 'tokens') {
      const inputTokens = (data.input_tokens as number) || 0;
      const outputTokens = (data.output_tokens as number) || 0;
      setInputTokens(inputTokens);
      setOutputTokens(outputTokens);
    } else if (data.type === 'complete') {
      const count = (data.document_count as number) || 0;
      setDocumentCount(count);
      setIsComplete(true);
      // Mark all legislations as fully parsed and completed
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          phase: 'completed',
          legislationsParsed: true,
        })),
      );
      setTimeout(() => onCompleteRef.current(), 1200);
    } else if (data.type === 'batch_saved') {
      const count = (data.total_saved as number) || 0;
      setDocumentCount(count);
    } else if (data.type === 'error') {
      const msg = data.message as string;
      setCurrentPhase(`Error: ${msg}`);
      setCategories((prev) =>
        prev.map((cat) =>
          cat.status === 'searching' ? { ...cat, status: 'error' as CategoryStatus } : cat,
        ),
      );
      setIsComplete(true);
      setTimeout(() => onCompleteRef.current(), 1500);
    }
  }, []);

  // Update processMessageRef after it's defined
  useEffect(() => {
    processMessageRef.current = processMessage;
  }, [processMessage]);

  useEffect(() => {
    if (crawlStartedRef.current) {
      return;
    }
    crawlStartedRef.current = true;

    const startCrawl = async () => {
      try {
        const controller = new AbortController();
        controllerRef.current = controller;
        const timeoutId = setTimeout(() => controller.abort(), 300000);

        const response = await fetch(`/api/v1/admin/crawl/${countryCode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          setCurrentPhase(`Error: ${response.statusText}`);
          setIsComplete(true);
          setTimeout(() => onCompleteRef.current(), 1200);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          setCurrentPhase('Error: No response stream');
          setIsComplete(true);
          setTimeout(() => onCompleteRef.current(), 1200);
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines[lines.length - 1];

          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim();
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6);
                const data = JSON.parse(jsonStr) as SSEMessage;
                if (processMessageRef.current) {
                  processMessageRef.current(data);
                }
              } catch {
                // Silent fail - SSE parsing error
              }
            }
          }
        }
      } catch {
        setCurrentPhase('Connection error');
        setIsComplete(true);
        setTimeout(() => onCompleteRef.current(), 1500);
      }
    };

    startCrawl();
  }, [countryCode]);

  const handlePause = () => {
    setShowPauseConfirm(true);
  };

  const handleConfirmStop = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    setShowPauseConfirm(false);
    setIsComplete(true);
    setTimeout(() => onCompleteRef.current(), 800);
  };

  const handleCancelPause = () => {
    setShowPauseConfirm(false);
  };

  // Construct ThinkingBlock for ClaudeOutputPanel
  const thinking: ThinkingBlock = {
    content: thinkingText,
    status: thinkingType === 'done' || isComplete ? 'done' : 'thinking',
    type: thinkingType || undefined,
  };

  return (
    <div className="flex h-[700px] w-[1200px] flex-col overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-black/98 via-black/95 to-black/98 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-white">
            {localizedCountryName}
          </h3>
          <div className="mt-1 flex gap-3">
            {documentCount > 0 && (
              <p className="text-xs font-medium text-emerald-400/80">
                📊 {documentCount} {t('admin.crawl.documents_saved')}
              </p>
            )}
            {(inputTokens > 0 || outputTokens > 0) && (
              <p className="text-xs font-medium text-blue-400/80">
                🔤 {inputTokens + outputTokens} {t('admin.crawl.tokens') || 'tokens'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isComplete && (
            <button
              onClick={handlePause}
              className="text-white/40 transition-colors hover:text-white/80"
              title={t('admin.crawl.pause')}
            >
              <Pause className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onComplete}
            className="text-white/40 transition-colors hover:text-white/80"
            title={t('admin.crawl.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main content - Left/Right sections */}
      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden">
        {/* Left panel: Categories (50%) */}
        <div className="flex min-h-0 w-1/2 flex-none flex-col gap-0 overflow-hidden border-r border-white/10">
          <div className="min-h-0 flex-1 overflow-hidden bg-black/30">
            <CrawlAgentPanel categories={categories} />
          </div>
        </div>

        {/* Right panel: Claude Output + Thinking integrated (50%) */}
        <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden">
          <ClaudeOutputPanel outputText={claudeOutputText} thinking={thinking} />
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex flex-none items-center justify-between border-t border-white/10 bg-white/[0.02] px-3 py-2.5">
        <div className="text-xs text-white/70">
          {currentPhase ? (
            <span>{currentPhase}</span>
          ) : isComplete ? (
            <span className="text-emerald-400/80">{t('admin.crawl.complete')}</span>
          ) : (
            <span>{t('admin.crawl.starting')}</span>
          )}
        </div>
      </div>

      {/* Pause Confirmation Modal */}
      {showPauseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="rounded-lg border border-white/20 bg-black/95 p-6 shadow-xl">
            <h3 className="mb-2 text-sm font-semibold text-white">
              {t('admin.crawl.stop_confirm')}
            </h3>
            <p className="mb-4 text-xs text-white/70">{t('admin.crawl.stop_description')}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelPause}
                className="rounded border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10"
              >
                {t('admin.crawl.stop_cancel')}
              </button>
              <button
                onClick={handleConfirmStop}
                className="rounded border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
              >
                {t('admin.crawl.stop_confirm_button')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
