'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getInitials } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog } from '@/components/ui/Dialog'
import type { Employee } from '@/types'

const EmployeeSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  role: z.string().min(1, 'Função obrigatória'),
  avatar_url: z.string().url('URL invalida').or(z.literal('')).optional(),
  is_active: z.boolean(),
})
type EmployeeInput = z.infer<typeof EmployeeSchema>

const empColors = ['#34d399', '#60a5fa', '#f59e0b', '#a78bfa', '#f472b6']
function hashColor(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return empColors[Math.abs(h) % empColors.length]
}

function EmployeeForm({
  defaultValues,
  onSubmit,
  loading,
}: {
  defaultValues?: Partial<EmployeeInput>
  onSubmit: (data: EmployeeInput) => Promise<void>
  loading: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<EmployeeInput>({
    resolver: zodResolver(EmployeeSchema),
    defaultValues: { is_active: true, ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Nome completo" error={errors.name?.message} {...register('name')} />
      <Input label="Função / Cargo" placeholder="Ex: Barbeiro, Cabeleireira..." error={errors.role?.message} {...register('role')} />
      <Input
        label="Foto publica"
        type="url"
        placeholder="https://..."
        helper="Opcional. Aparece na pagina publica do negocio."
        error={errors.avatar_url?.message}
        {...register('avatar_url')}
      />
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" className="accent-emerald-500 w-4 h-4" {...register('is_active')} />
        <span className="text-sm text-zinc-300">Colaborador ativo</span>
      </label>
      <Button type="submit" loading={loading} className="w-full">Guardar</Button>
    </form>
  )
}

export default function TeamPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [deleting, setDeleting] = useState<Employee | null>(null)

  const maxSlots = 5

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/employees')
      const json = await res.json()
      if (res.status === 404) {
        router.replace('/dashboard/onboarding')
        return
      }
      if (!res.ok) {
        console.error('[Team] load failed', json.error)
        throw new Error(json.error ?? 'Nao foi possivel carregar colaboradores.')
      }
      setEmployees(json.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar colaboradores.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    void load()
  }, [load])

  async function handleCreate(data: EmployeeInput) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/employees', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const j = await res.json()
        console.error('[Team] create failed', j.error)
        throw new Error(j.error)
      }
      setShowCreate(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally { setSaving(false) }
  }

  async function handleEdit(data: EmployeeInput) {
    if (!editing) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/employees/${editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const j = await res.json()
        console.error('[Team] update failed', j.error)
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
      const res = await fetch(`/api/employees/${deleting.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json()
        console.error('[Team] delete failed', j.error)
        throw new Error(j.error)
      }
      setDeleting(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally { setSaving(false) }
  }

  const used = employees.length
  const canAdd = used < maxSlots

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
        <span className="text-xl">✨</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">Plano Plus: até {maxSlots} colaboradores</div>
          <div className="text-xs text-zinc-400">{used} de {maxSlots} utilizados</div>
        </div>
        {canAdd && <Button size="sm" onClick={() => setShowCreate(true)}>+ Adicionar</Button>}
        {!canAdd && <span className="text-xs text-zinc-500 px-3 py-2 bg-zinc-800 rounded-lg">Limite atingido</span>}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="text-zinc-500 text-sm py-8 text-center">A carregar...</div>
      ) : employees.length === 0 ? (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-10 text-center">
          <div className="text-3xl mb-3">👥</div>
          <p className="text-zinc-500 text-sm mb-4">Nenhum colaborador adicionado ainda</p>
          <Button onClick={() => setShowCreate(true)}>Adicionar primeiro colaborador</Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-3">
          {employees.map((emp) => {
            const color = hashColor(emp.name)
            return (
              <div key={emp.id} className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-emerald-500/30 transition">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center bg-cover bg-center font-bold text-lg"
                    style={{
                      background: emp.avatar_url ? `center / cover url("${emp.avatar_url}")` : color + '30',
                      color,
                    }}
                  >
                    {!emp.avatar_url && getInitials(emp.name)}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(emp)} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition text-xs" title="Editar">✏️</button>
                    <button onClick={() => setDeleting(emp)} className="p-1.5 hover:bg-zinc-800 rounded text-red-400 hover:text-red-300 transition text-xs" title="Eliminar">🗑</button>
                  </div>
                </div>
                <div className="font-semibold text-sm text-zinc-100 mb-0.5">{emp.name}</div>
                <div className="text-xs text-zinc-500 mb-4">{emp.role}</div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${emp.is_active ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                  <span className={`text-xs ${emp.is_active ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {emp.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Novo colaborador">
        <EmployeeForm onSubmit={handleCreate} loading={saving} />
      </Dialog>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Editar colaborador">
        {editing && (
          <EmployeeForm
            defaultValues={{
              name: editing.name,
              role: editing.role,
              avatar_url: editing.avatar_url ?? '',
              is_active: editing.is_active,
            }}
            onSubmit={handleEdit}
            loading={saving}
          />
        )}
      </Dialog>

      <Dialog open={!!deleting} onClose={() => setDeleting(null)} title="Remover colaborador">
        {deleting && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">
              Tens a certeza que queres remover <strong className="text-zinc-100">{deleting.name}</strong>?
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setDeleting(null)} className="flex-1">Cancelar</Button>
              <Button variant="danger" loading={saving} onClick={handleDelete} className="flex-1">Remover</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
