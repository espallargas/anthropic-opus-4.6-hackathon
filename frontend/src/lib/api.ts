const API_BASE = '/api/v1';

export interface Country {
  code: string;
  name: string;
  flag_emoji: string;
  status: 'red' | 'yellow' | 'green';
  last_crawled_at: string | null;
  legislation_count: number;
  extraction_completed?: number;
  extraction_processing?: number;
  content_size?: number;
  token_count?: number;
}

export interface AdminCountriesResponse {
  active: Country[];
  pending: Country[];
}

export interface Legislation {
  id: number;
  title: string;
  category: string;
  content: string;
  summary?: string;
  source_url: string;
  date_effective?: string;
  is_deprecated: boolean;
  replaced_by_id?: number;
  crawled_at: string;
  extraction_status?: string;
}

export interface CountryDetailsResponse {
  legislations: Record<string, Legislation[]>;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function healthCheck(): Promise<{ status: string; server_time?: string }> {
  const response = await apiFetch<{ status: string; server_time?: string }>('/health');
  return response;
}
