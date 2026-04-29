'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ServiceSchema } from '@/lib/validators'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog } from '@/components/ui/Dialog'
import type { Service } from '@/types'
import { z } from 'zod'

type ServiceFormValues = z.infer<typeof ServiceSchema>

function ServiceForm({
  defaultValues,
  onSubmit,
  loading,
}: {
  defaultValues?: Partial<ServiceFormValues>
  onSubmit: (data: ServiceFormValues) => Promise<void>
  loading: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<ServiceFormValues>({
    resolver: zodResolver(ServiceSchema),
    defaultValues: { is_active: true, ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Nome do serviço" error={errors.name?.message} {...register('name')} />
      <Input label="Descrição (opcional)" error={errors.description?.message} {...register('description')} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Duração (min)" type="number" error={errors.duration_minutes?.message}
          {...register('duration_minutes', { valueAsNumber: true })} />
        <Input label="Preço (€)" type="number" step="0.01" error={errors.price?.message}
          {...register('price', { valueAsNumber: true })} />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" className="accent-emerald-500 w-4 h-4" {...register('is_active')} />
        <span className="text-sm text-zinc-300">Serviço ativo</span>
      </label>
      <Button type="submit" loading={loading} className="w-full">Guardar</Button>
    </form>
  )
}

export default function ServicesPage() {
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [deleting, setDeleting] = useState<Service | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/services')
      const json = await res.json()
      if (res.status === 404) {
        router.replace('/dashboard/onboarding')
        return
      }
      if (!res.ok) {
        console.error('[Services] load failed', json.error)
        throw new Error(json.error ?? 'Nao foi possivel carregar os servicos.')
      }
      setServices(json.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar os servicos.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    void load()
  }, [load])

  async function handleCreate(data: ServiceFormValues) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/services', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const j = await res.json()
        console.error('[Services] create failed', j.error)
        throw new Error(j.error)
      }
      setShowCreate(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally { setSaving(false) }
  }

  async function handleEdit(data: ServiceFormValues) {
    if (!editing) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/services/${editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const j = await res.json()
        console.error('[Services] update failed', j.error)
        throw new Error(j.error)
      }
      setEditing(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleting) return
    setSaving(true)
    try {
      const res = await fetch(`/api/services/${deleting.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json()
        console.error('[Services] delete failed', j.error)
        throw new Error(j.error)
      }
      setDeleting(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
        <span className="text-xl">✨</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">Plano Plus: serviços ilimitados</div>
          <div className="text-xs text-zinc-400">{services.length} configurados</div>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>+ Adicionar</Button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="text-zinc-500 text-sm py-8 text-center">A carregar...</div>
      ) : services.length === 0 ? (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-10 text-center">
          <div className="text-3xl mb-3">🛠️</div>
          <p className="text-zinc-500 text-sm mb-4">Nenhum serviço criado ainda</p>
          <Button onClick={() => setShowCreate(true)}>Criar primeiro serviço</Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {services.map((service) => (
            <div key={service.id} className="group p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-emerald-500/30 transition">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-zinc-100">{service.name}</h4>
                  {service.description && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{service.description}</p>}
                  <div className="flex gap-3 mt-2 text-xs text-zinc-500">
                    <span>⏱ {service.duration_minutes} min</span>
                    <span className="text-emerald-400 font-semibold">{formatCurrency(service.price)}</span>
                  </div>
                </div>
                <div className="flex gap-1 ml-3">
                  <button
                    onClick={() => setEditing(service)}
                    className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition text-xs"
                    title="Editar"
                  >✏️</button>
                  <button
                    onClick={() => setDeleting(service)}
                    className="p-1.5 hover:bg-zinc-800 rounded text-red-400 hover:text-red-300 transition text-xs"
                    title="Eliminar"
                  >🗑</button>
                </div>
              </div>
              <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg ${service.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${service.is_active ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                {service.is_active ? 'Ativo' : 'Inativo'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Novo serviço">
        <ServiceForm onSubmit={handleCreate} loading={saving} />
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Editar serviço">
        {editing && (
          <ServiceForm
            defaultValues={{
              name: editing.name,
              description: editing.description ?? '',
              duration_minutes: editing.duration_minutes,
              price: editing.price,
              is_active: editing.is_active,
            }}
            onSubmit={handleEdit}
            loading={saving}
          />
        )}
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleting} onClose={() => setDeleting(null)} title="Eliminar serviço">
        {deleting && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">
              Tens a certeza que queres eliminar <strong className="text-zinc-100">{deleting.name}</strong>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setDeleting(null)} className="flex-1">Cancelar</Button>
              <Button variant="danger" loading={saving} onClick={handleDelete} className="flex-1">Eliminar</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
