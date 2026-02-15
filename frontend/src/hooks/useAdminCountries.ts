import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch, type AdminCountriesResponse, type Country } from '@/lib/api';

export function useAdminCountries() {
  const [active, setActive] = useState<Country[]>([]);
  const [pending, setPending] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  const fetchCountries = useCallback(async () => {
    try {
      if (!initialLoadDone.current) {
        setLoading(true);
      }
      const data = await apiFetch<AdminCountriesResponse>('/admin/countries');
      setActive(data.active);
      setPending(data.pending);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch countries');
    } finally {
      setLoading(false);
      initialLoadDone.current = true;
    }
  }, []);

  const markCrawled = useCallback((code: string, documentCount: number) => {
    const now = new Date().toISOString();
    const updateCountry = (c: Country): Country =>
      c.code === code
        ? { ...c, status: 'green', last_crawled_at: now, legislation_count: documentCount }
        : c;

    const insertSorted = (list: Country[], item: Country): Country[] => {
      const filtered = list.filter((c) => c.code !== item.code);
      const idx = filtered.findIndex((c) => c.name.localeCompare(item.name) > 0);
      if (idx === -1) return [...filtered, item];
      return [...filtered.slice(0, idx), item, ...filtered.slice(idx)];
    };

    setPending((prev) => {
      const match = prev.find((c) => c.code === code);
      if (match) {
        const updated = updateCountry(match);
        setActive((a) => insertSorted(a, updated));
        return prev.filter((c) => c.code !== code);
      }
      return prev;
    });

    setActive((prev) => {
      const idx = prev.findIndex((c) => c.code === code);
      if (idx === -1) return prev;
      const updated = updateCountry(prev[idx]);
      return insertSorted(prev, updated);
    });
  }, []);

  const updateExtraction = useCallback(
    (countryCode: string, status: string, tokenCount: number | null) => {
      const updater = (countries: Country[]) =>
        countries.map((c) => {
          if (c.code !== countryCode) return c;
          const completed = c.extraction_completed ?? 0;
          const processing = c.extraction_processing ?? 0;
          const tokens = c.token_count ?? 0;

          if (status === 'processing') {
            return { ...c, extraction_processing: processing + 1 };
          }
          if (status === 'completed') {
            return {
              ...c,
              extraction_completed: completed + 1,
              extraction_processing: Math.max(0, processing - 1),
              token_count: tokenCount ? tokens + tokenCount : tokens,
            };
          }
          if (status === 'failed') {
            return { ...c, extraction_processing: Math.max(0, processing - 1) };
          }
          return c;
        });

      setActive(updater);
      setPending(updater);
    },
    [],
  );

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  return {
    active,
    pending,
    loading,
    error,
    refetch: fetchCountries,
    markCrawled,
    updateExtraction,
  };
}
