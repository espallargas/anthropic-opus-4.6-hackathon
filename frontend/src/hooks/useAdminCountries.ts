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

    setPending((prev) => {
      const match = prev.find((c) => c.code === code);
      if (match) {
        const updated = updateCountry(match);
        setActive((a) => [updated, ...a]);
        return prev.filter((c) => c.code !== code);
      }
      return prev;
    });

    setActive((prev) => {
      const idx = prev.findIndex((c) => c.code === code);
      if (idx === -1) return prev;
      const updated = updateCountry(prev[idx]);
      return [updated, ...prev.filter((_, i) => i !== idx)];
    });
  }, []);

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
  };
}
