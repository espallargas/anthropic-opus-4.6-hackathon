import { Chat } from '@/components/Chat'
import { SetupForm } from '@/components/SetupForm'
import { Globe } from '@/components/Globe'
import { AdminPage } from '@/components/AdminPage'
import { useEffect, useState } from 'react'
import { useCable } from './hooks/useCable'
import { healthCheck } from './lib/api'
import type { SystemVars } from './hooks/useChat'
import { useLocation } from 'react-router-dom'

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
  const location = useLocation()
  const [health, setHealth] = useState<string | null>(null)
  const [healthRtt, setHealthRtt] = useState<number | null>(null)
  const [config, setConfig] = useState<SystemVars | null>(loadConfig)
  const { status, roundTripMs } = useCable()

  if (location.pathname === '/admin') {
    return <AdminPage />
  }

  useEffect(() => {
    const startMs = Date.now()
    healthCheck()
      .then((data) => {
        const rtt = Date.now() - startMs
        setHealth(data.status)
        setHealthRtt(rtt)
      })
      .catch(() => {
        const rtt = Date.now() - startMs
        setHealth('error')
        setHealthRtt(rtt)
      })
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
    <div className="flex h-screen w-full bg-black">
      {/* Left panel – info section */}
      <div className="hidden w-100 flex-col items-center justify-center gap-4 border-r border-white/10 bg-black p-8 md:flex">
        <h1 className="text-3xl font-bold">Assistente de Imigração</h1>
        <p className="text-muted-foreground text-center text-sm">
          {config.origin_country} → {config.destination_country}
        </p>
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs">
            <span
              className={`inline-block h-2 w-2 rounded-full ${health === 'ok' ? 'bg-green-400' : health === 'error' ? 'bg-red-400' : 'animate-pulse bg-yellow-400'}`}
            />
            API:{' '}
            {health && healthRtt !== null
              ? `${health} (${healthRtt}ms)`
              : (health ?? 'connecting...')}
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs">
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

      {/* Right panel – chat with globe behind */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Globe background - positioned behind chat */}
        <div className="absolute inset-0 z-0 opacity-80">
          <Globe
            origin={config.origin_country}
            destination={config.destination_country}
            className="h-full w-full"
          />
        </div>

        {/* Chat overlay - fully opaque */}
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <Chat systemVars={config} onReconfigure={handleReconfigure} />
        </div>
      </div>
    </div>
  )
}

export default App
