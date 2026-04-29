'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [success, setSuccess] = useState(false)
  const [scheduleSuccess, setScheduleSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    phone: '',
    address: '',
    slug: '',
  })
  const [schedule, setSchedule] = useState({
    opening_time: '09:00',
    closing_time: '18:00',
    slot_duration_minutes: 30,
    working_days: [1, 2, 3, 4, 5],
    max_booking_months: 1,
  })

  useEffect(() => {
    async function loadBusiness() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/businesses')
        const json = await res.json()
        if (res.status === 404) {
          router.replace('/dashboard/onboarding')
          return
        }
        if (!res.ok) {
          console.error('[Settings] business load failed', json.error)
          throw new Error(json.error ?? 'Nao foi possivel carregar o negocio.')
        }

        const b = json.data.business
        const settings = json.data.settings
        setForm({
          name: b.name ?? '',
          description: b.description ?? '',
          phone: b.phone ?? '',
          address: b.address ?? '',
          slug: b.slug ?? '',
        })
        if (settings) {
          setSchedule({
            opening_time: String(settings.opening_time ?? '09:00').slice(0, 5),
            closing_time: String(settings.closing_time ?? '18:00').slice(0, 5),
            slot_duration_minutes: settings.slot_duration_minutes ?? 30,
            working_days: settings.working_days ?? [1, 2, 3, 4, 5],
            max_booking_months: Math.max(1, Math.ceil((settings.max_booking_days ?? 30) / 30)),
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nao foi possivel carregar o negocio.')
      } finally {
        setLoading(false)
      }
    }

    void loadBusiness()
  }, [router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    setError(null)
    try {
      const res = await fetch('/api/businesses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) {
        console.error('[Settings] business save failed', json.error)
        throw new Error(json.error ?? 'Nao foi possivel guardar as configuracoes.')
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel guardar as configuracoes.')
    } finally {
      setSaving(false)
    }
  }

  function toggleWorkingDay(day: number) {
    setSchedule((current) => ({
      ...current,
      working_days: current.working_days.includes(day)
        ? current.working_days.filter((d) => d !== day)
        : [...current.working_days, day].sort(),
    }))
  }

  async function handleScheduleSave(e: React.FormEvent) {
    e.preventDefault()
    setSavingSchedule(true)
    setScheduleSuccess(false)
    setScheduleError(null)
    try {
      const res = await fetch('/api/business-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opening_time: schedule.opening_time,
          closing_time: schedule.closing_time,
          slot_duration_minutes: schedule.slot_duration_minutes,
          working_days: schedule.working_days,
          max_booking_days: schedule.max_booking_months * 30,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        console.error('[Settings] schedule save failed', json.error)
        throw new Error(json.error ?? 'Nao foi possivel guardar o horario.')
      }
      setScheduleSuccess(true)
      setTimeout(() => setScheduleSuccess(false), 3000)
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Nao foi possivel guardar o horario.')
    } finally {
      setSavingSchedule(false)
    }
  }

  if (loading) return <div className="text-zinc-500 text-sm">A carregar...</div>

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100">Configuracoes</h2>
        <p className="text-sm text-zinc-500 mt-1">Perfil do seu negocio</p>
      </div>

      <Card>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nome do negocio"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Slug (URL publica)"
            value={form.slug}
            helper={`turboagenda.com/b/${form.slug}`}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
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
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">Descricao</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              placeholder="Descreva o seu negocio..."
            />
          </div>

          {success && (
            <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              Configuracoes guardadas com sucesso.
            </p>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" loading={saving}>
            Guardar alteracoes
          </Button>
        </form>
      </Card>

      <Card>
        <form onSubmit={handleScheduleSave} className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">Horario e reservas</h3>
            <p className="text-sm text-zinc-500 mt-1">Controle quando os clientes podem agendar.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Abertura"
              type="time"
              value={schedule.opening_time}
              onChange={(e) => setSchedule((s) => ({ ...s, opening_time: e.target.value }))}
            />
            <Input
              label="Fecho"
              type="time"
              value={schedule.closing_time}
              onChange={(e) => setSchedule((s) => ({ ...s, closing_time: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Duracao do slot (min)"
              type="number"
              min={5}
              max={240}
              value={schedule.slot_duration_minutes}
              onChange={(e) =>
                setSchedule((s) => ({ ...s, slot_duration_minutes: Number(e.target.value) || 30 }))
              }
            />
            <Input
              label="Meses abertos"
              type="number"
              min={1}
              max={12}
              helper={`${schedule.max_booking_months * 30} dias disponiveis para reserva`}
              value={schedule.max_booking_months}
              onChange={(e) =>
                setSchedule((s) => ({ ...s, max_booking_months: Number(e.target.value) || 1 }))
              }
            />
          </div>

          <div>
            <p className="text-sm font-medium text-zinc-300 mb-2">Dias de trabalho</p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day, index) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleWorkingDay(index)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    schedule.working_days.includes(index)
                      ? 'bg-emerald-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {scheduleSuccess && (
            <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              Horario guardado com sucesso.
            </p>
          )}

          {scheduleError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {scheduleError}
            </p>
          )}

          <Button type="submit" loading={savingSchedule}>
            Guardar horario
          </Button>
        </form>
      </Card>
    </div>
  )
}
