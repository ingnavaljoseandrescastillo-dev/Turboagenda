'use client'

import { useState, useCallback } from 'react'

interface AvailabilityParams {
  business_id: string
  service_id: string
  employee_id: string
  date: string
}

export function useAvailability() {
  const [slots, setSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSlots = useCallback(async (params: AvailabilityParams) => {
    setLoading(true)
    setError(null)
    setSlots([])
    try {
      const query = new URLSearchParams(params as unknown as Record<string, string>).toString()
      const res = await fetch(`/api/availability?${query}`)
      if (!res.ok) throw new Error('Erro ao carregar horários')
      const json = await res.json()
      setSlots(json.data?.slots ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  return { slots, loading, error, fetchSlots }
}
