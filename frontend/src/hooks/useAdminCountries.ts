import { useState, useEffect } from 'react';
import { apiFetch, type AdminCountriesResponse, type Country } from '@/lib/api';

export function useAdminCountries() {
  const [active, setActive] = useState<Country[]>([]);
  const [pending, setPending] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCountries = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<AdminCountriesResponse>('/admin/countries');
      setActive(data.active);
      setPending(data.pending);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch countries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  return {
    active,
    pending,
    loading,
    error,
    refetch: fetchCountries,
  };
}
