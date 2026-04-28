'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Appointment } from '@/types'

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchAppointments = useCallback(async () => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/appointments', { signal: abortRef.current.signal })
      if (!res.ok) throw new Error('Erro ao carregar citas')
      const json = await res.json()
      setAppointments(json.data ?? [])
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    void fetchAppointments()
    return () => abortRef.current?.abort()
  }, [fetchAppointments])

  return { appointments, loading, error, refetch: fetchAppointments }
}
