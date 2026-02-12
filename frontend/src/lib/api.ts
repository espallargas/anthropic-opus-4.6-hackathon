const API_BASE = '/api/v1'

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}

export async function healthCheck(): Promise<{ status: string; server_time?: string }> {
  const startMs = Date.now()

  try {
    const response = await apiFetch<{ status: string; server_time?: string }>('/health')
    const endMs = Date.now()
    const rtt = endMs - startMs

    console.log(
      `[Health Check] Status: ${response.status}, RTT: ${rtt}ms, Server time: ${response.server_time}`,
    )
    return response
  } catch (e) {
    const endMs = Date.now()
    const rtt = endMs - startMs
    console.error(`[Health Check] Failed after ${rtt}ms`)
    throw e
  }
}
