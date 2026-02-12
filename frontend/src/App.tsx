import { Chat } from '@/components/Chat'
import { SetupForm } from '@/components/SetupForm'
import { useEffect, useState } from 'react'
import { useCable } from './hooks/useCable'
import type { SystemVars } from './hooks/useChat'

const CONFIG_KEY = 'chat_config'

function loadConfig(): SystemVars | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SystemVars
  } catch {
    return null
  }
}

function saveConfig(config: SystemVars) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  } catch {
    // ignore
  }
}

function App() {
  const [health, setHealth] = useState<string | null>(null)
  const [config, setConfig] = useState<SystemVars | null>(loadConfig)
  const { status, roundTripMs } = useCable()

  useEffect(() => {
    fetch('/api/v1/health')
      .then((res) => res.json())
      .then((data) => setHealth(data.status))
      .catch(() => setHealth('error'))
  }, [])

  const handleSetup = (vars: SystemVars) => {
    saveConfig(vars)
    setConfig(vars)
  }

  const handleReconfigure = () => {
    setConfig(null)
  }

  if (!config) {
    return <SetupForm onSubmit={handleSetup} defaultValues={loadConfig() ?? undefined} />
  }

  const wsDot =
    status === 'connected'
      ? 'bg-green-400'
      : status === 'disconnected'
        ? 'bg-red-400'
        : 'animate-pulse bg-yellow-400'

  const wsLabel =
    status === 'connected' && roundTripMs !== null ? `connected (${roundTripMs}ms)` : status

  return (
    <div className="bg-background flex h-screen">
      {/* Left panel – info */}
      <div className="hidden w-100 flex-col items-center justify-center gap-6 border-r p-8 md:flex">
        <h1 className="text-3xl font-bold">Assistente de Imigração</h1>
        <p className="text-muted-foreground text-center text-sm">
          {config.origin_country} → {config.destination_country}
        </p>
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-gray-800 px-3 py-1.5 text-xs">
            <span
              className={`inline-block h-2 w-2 rounded-full ${health === 'ok' ? 'bg-green-400' : health === 'error' ? 'bg-red-400' : 'animate-pulse bg-yellow-400'}`}
            />
            API: {health ?? 'connecting...'}
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-gray-800 px-3 py-1.5 text-xs">
            <span className={`inline-block h-2 w-2 rounded-full ${wsDot}`} />
            WS: {wsLabel}
          </div>
        </div>
        <button
          onClick={handleReconfigure}
          className="text-muted-foreground hover:text-foreground text-xs underline transition-colors"
        >
          Reconfigurar dados
        </button>
      </div>

      {/* Right panel – chat (full height) */}
      <div className="flex min-h-0 flex-1 flex-col">
        <Chat systemVars={config} onReconfigure={handleReconfigure} />
      </div>
    </div>
  )
}

export default App
