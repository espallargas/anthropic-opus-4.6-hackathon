import { useEffect, useRef, useState } from 'react'
import type { Subscription } from '@rails/actioncable'
import consumer from '../lib/cable'

type CableStatus = 'connecting' | 'connected' | 'disconnected'

export function useCable() {
  const [status, setStatus] = useState<CableStatus>('connecting')
  const [roundTripMs, setRoundTripMs] = useState<number | null>(null)
  const subRef = useRef<Subscription | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const sendPing = () => {
    subRef.current?.perform('ping', { sent_at: Date.now() })
  }

  useEffect(() => {
    const subscription = consumer.subscriptions.create('PingChannel', {
      connected() {
        setStatus('connected')
        sendPing()
        intervalRef.current = setInterval(sendPing, 5000)
      },
      disconnected() {
        setStatus('disconnected')
        setRoundTripMs(null)
        if (intervalRef.current) clearInterval(intervalRef.current)
      },
      received(data: { type: string; client_sent_at: number }) {
        if (data.type === 'pong' && data.client_sent_at) {
          setRoundTripMs(Date.now() - data.client_sent_at)
        }
      },
    })

    subRef.current = subscription

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      subscription.unsubscribe()
    }
  }, [])

  return { status, roundTripMs, sendPing }
}
