'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface Props {
  businessId: string
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function OnboardingWizard({ businessId }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    address: '',
    opening_time: '09:00',
    closing_time: '18:00',
    working_days: [1, 2, 3, 4, 5],
  })

  function toggleDay(day: number) {
    setForm((f) => ({
      ...f,
      working_days: f.working_days.includes(day)
        ? f.working_days.filter((d) => d !== day)
        : [...f.working_days, day].sort(),
    }))
  }

  async function finish() {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('business_settings').upsert({
      business_id: businessId,
      opening_time: form.opening_time,
      closing_time: form.closing_time,
      working_days: form.working_days,
      slot_duration_minutes: 30,
    })
    if (form.address) {
      await supabase.from('businesses').update({ address: form.address }).eq('id', businessId)
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="flex gap-2 mb-6">
        {[1, 2].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-emerald-500' : 'bg-zinc-800'}`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-zinc-100">Onde fica o seu negócio?</h3>
          <Input
            label="Morada (opcional)"
            placeholder="Rua das Flores, 123, Lisboa"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />
          <Button className="w-full" onClick={() => setStep(2)}>
            Continuar
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-zinc-100">Horário de funcionamento</h3>
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
                  key={i}
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
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
              Voltar
            </Button>
            <Button loading={loading} onClick={finish} className="flex-1">
              Concluir configuração
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
