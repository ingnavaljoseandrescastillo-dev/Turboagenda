'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

export function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    opening_time: '09:00',
    closing_time: '18:00',
    working_days: [1, 2, 3, 4, 5],
    max_booking_months: 1,
  })

  function toggleDay(day: number) {
    setForm((f) => ({
      ...f,
      working_days: f.working_days.includes(day)
        ? f.working_days.filter((d) => d !== day)
        : [...f.working_days, day].sort(),
    }))
  }

  async function createBusiness() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || undefined,
          address: form.address || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        console.error('[Onboarding] create business failed', json.error)
        throw new Error(json.error ?? 'Nao foi possivel criar o negocio.')
      }
      setBusinessId(json.data.id)
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel criar o negocio.')
    } finally {
      setLoading(false)
    }
  }

  async function finish() {
    if (!businessId) return
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const settingsPayload = {
        business_id: businessId,
        opening_time: form.opening_time,
        closing_time: form.closing_time,
        working_days: form.working_days,
        slot_duration_minutes: 30,
        max_booking_days: form.max_booking_months * 30,
      }

      const { error: updateError } = await supabase
        .from('business_settings')
        .update(settingsPayload)
        .eq('business_id', businessId)

      if (updateError) {
        console.error('[Onboarding] settings update failed', updateError)
        const { error: insertError } = await supabase.from('business_settings').insert(settingsPayload)

        if (insertError) {
          console.error('[Onboarding] settings insert failed', insertError)
          throw new Error(insertError.message ?? 'O negocio foi criado, mas nao foi possivel guardar o horario.')
        }
      }

      router.push('/dashboard/settings')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel concluir o onboarding.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="flex gap-2 mb-6">
        {[1, 2].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s <= step ? 'bg-emerald-500' : 'bg-zinc-800'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-100">Criar negocio</h2>
            <p className="text-sm text-zinc-500 mt-1">Este negocio ficara ligado a sua conta.</p>
          </div>
          <Input
            label="Nome do negocio"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Telefone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <Input
            label="Morada"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />
          <Button className="w-full" loading={loading} disabled={form.name.trim().length < 2} onClick={createBusiness}>
            Criar negocio
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-100">Horario de funcionamento</h2>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Abertura"
              type="time"
              value={form.opening_time}
              onChange={(e) => setForm((f) => ({ ...f, opening_time: e.target.value }))}
            />
            <Input
              label="Fecho"
              type="time"
              value={form.closing_time}
              onChange={(e) => setForm((f) => ({ ...f, closing_time: e.target.value }))}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-300 mb-2">Dias de trabalho</p>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((day, i) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    form.working_days.includes(i)
                      ? 'bg-emerald-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Meses abertos para reserva"
            type="number"
            min={1}
            max={12}
            helper={`${form.max_booking_months * 30} dias disponiveis para clientes`}
            value={form.max_booking_months}
            onChange={(e) => setForm((f) => ({ ...f, max_booking_months: Number(e.target.value) || 1 }))}
          />
          <Button loading={loading} onClick={finish} className="w-full">
            Concluir configuracao
          </Button>
        </div>
      )}
    </div>
  )
}
