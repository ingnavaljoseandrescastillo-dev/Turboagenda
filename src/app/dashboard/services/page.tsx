'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ServiceCategorySchema, ServiceSchema } from '@/lib/validators'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Dialog } from '@/components/ui/Dialog'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Service, ServiceCategory } from '@/types'

type ServiceFormValues = z.infer<typeof ServiceSchema>
type CategoryFormValues = z.infer<typeof ServiceCategorySchema>

function ServiceForm({
  defaultValues,
  onSubmit,
  loading,
  currency,
  categories,
}: {
  defaultValues?: Partial<ServiceFormValues>
  onSubmit: (data: ServiceFormValues) => Promise<void>
  loading: boolean
  currency: string
  categories: ServiceCategory[]
}) {
  const { t } = useLanguage()
  const copy = t.dashboard.services
  const common = t.dashboard.common
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(ServiceSchema),
    defaultValues: { is_active: true, service_category_id: '', display_order: 0, ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label={copy.name} error={errors.name?.message} {...register('name')} />
      <Input label={copy.description} error={errors.description?.message} {...register('description')} />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label={copy.duration}
          type="number"
          error={errors.duration_minutes?.message}
          {...register('duration_minutes', { valueAsNumber: true })}
        />
        <Input
          label={`${copy.price} (${currency})`}
          type="number"
          step="0.01"
          error={errors.price?.message}
          {...register('price', { valueAsNumber: true })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Categoria"
          placeholder="Sem categoria"
          options={categories.map((category) => ({ value: category.id, label: category.name }))}
          error={errors.service_category_id?.message}
          {...register('service_category_id')}
        />
        <Input
          label="Ordem"
          type="number"
          error={errors.display_order?.message}
          {...register('display_order', { valueAsNumber: true })}
        />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" className="accent-emerald-500 w-4 h-4" {...register('is_active')} />
        <span className="text-sm text-zinc-300">{copy.activeToggle}</span>
      </label>
      <Button type="submit" loading={loading} className="w-full">{common.save}</Button>
    </form>
  )
}

function CategoryForm({
  defaultValues,
  onSubmit,
  loading,
}: {
  defaultValues?: Partial<CategoryFormValues>
  onSubmit: (data: CategoryFormValues) => Promise<void>
  loading: boolean
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(ServiceCategorySchema),
    defaultValues: { is_active: true, display_order: 0, ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Nome da categoria" placeholder="Ex: Destaques, Maos, Pes" error={errors.name?.message} {...register('name')} />
      <Input label="Descricao (opcional)" error={errors.description?.message} {...register('description')} />
      <Input label="Ordem" type="number" error={errors.display_order?.message} {...register('display_order', { valueAsNumber: true })} />
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" className="accent-emerald-500 w-4 h-4" {...register('is_active')} />
        <span className="text-sm text-zinc-300">Categoria ativa</span>
      </label>
      <Button type="submit" loading={loading} className="w-full">Guardar</Button>
    </form>
  )
}

export default function ServicesPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const copy = t.dashboard.services
  const common = t.dashboard.common
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [deleting, setDeleting] = useState<Service | null>(null)
  const [showCategoryCreate, setShowCategoryCreate] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<ServiceCategory | null>(null)
  const [currency, setCurrency] = useState('EUR')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [res, businessRes, categoriesRes] = await Promise.all([
        fetch('/api/services'),
        fetch('/api/businesses'),
        fetch('/api/service-categories'),
      ])
      const json = await res.json()
      const businessJson = businessRes.ok ? await businessRes.json() : null
      const categoriesJson = categoriesRes.ok ? await categoriesRes.json() : null
      if (res.status === 404) {
        router.replace('/dashboard/onboarding')
        return
      }
      if (!res.ok) {
        console.error('[Services] load failed', json.error)
        throw new Error(json.error ?? copy.loadError)
      }
      setCurrency(businessJson?.data?.business?.currency ?? 'EUR')
      setServices(json.data ?? [])
      setCategories(categoriesJson?.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.loadError)
    } finally {
      setLoading(false)
    }
  }, [copy.loadError, router])

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    void load()
  }, [load])

  async function handleCreate(data: ServiceFormValues) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setError(err instanceof Error ? err.message : common.error)
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(data: ServiceFormValues) {
    if (!editing) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/services/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
      setError(err instanceof Error ? err.message : common.error)
    } finally {
      setSaving(false)
    }
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
      setError(err instanceof Error ? err.message : common.error)
    } finally {
      setSaving(false)
    }
  }

  async function handleCategoryCreate(data: CategoryFormValues) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/service-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error)
      }
      setShowCategoryCreate(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : common.error)
    } finally {
      setSaving(false)
    }
  }

  async function handleCategoryEdit(data: CategoryFormValues) {
    if (!editingCategory) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/service-categories/${editingCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error)
      }
      setEditingCategory(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : common.error)
    } finally {
      setSaving(false)
    }
  }

  async function handleCategoryDelete() {
    if (!deletingCategory) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/service-categories/${deletingCategory.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error)
      }
      setDeletingCategory(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : common.error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
        <span className="text-xl">+</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{copy.planLine}</div>
          <div className="text-xs text-zinc-400">{services.length} {copy.configured}</div>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>{copy.add}</Button>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="mb-3 text-sm font-semibold text-zinc-100">Novidades da agenda online</div>
        <div className="grid gap-2 text-xs leading-5 text-zinc-400 sm:grid-cols-2">
          <div>1. O cliente pode escolher varios servicos na mesma marcacao.</div>
          <div>2. Se houver uma unica profissional, a escolha de equipa e saltada.</div>
          <div>3. O calendario abre no mes atual ou no proximo mes disponivel.</div>
          <div>4. Servicos podem ser separados por categorias com solapas publicas.</div>
          <div>5. Categorias sao opcionais: sem categorias, tudo continua como antes.</div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-zinc-100">Categorias de servicos</div>
            <div className="text-xs text-zinc-500">Crie solapas como Destaques, Maos, Pes ou Promocoes.</div>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setShowCategoryCreate(true)}>Nova categoria</Button>
        </div>
        {categories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-500">
            Nenhuma categoria criada. Os servicos continuam aparecendo todos juntos.
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <div key={category.id} className="min-w-44 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-zinc-100">{category.name}</div>
                    <div className="text-xs text-zinc-500">Ordem {category.display_order}</div>
                  </div>
                  <span className={`mt-1 h-2 w-2 rounded-full ${category.is_active ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="text-xs text-zinc-400 hover:text-white" onClick={() => setEditingCategory(category)}>Editar</button>
                  <button className="text-xs text-red-400 hover:text-red-300" onClick={() => setDeletingCategory(category)}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="text-zinc-500 text-sm py-8 text-center">{common.loading}</div>
      ) : services.length === 0 ? (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-10 text-center">
          <div className="text-3xl mb-3">[]</div>
          <p className="text-zinc-500 text-sm mb-4">{copy.empty}</p>
          <Button onClick={() => setShowCreate(true)}>{copy.createFirst}</Button>
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
                    <span>{service.duration_minutes} min</span>
                    <span className="text-emerald-400 font-semibold">{formatCurrency(service.price, currency)}</span>
                    {service.service_category?.name && <span>{service.service_category.name}</span>}
                  </div>
                </div>
                <div className="flex gap-1 ml-3">
                  <button
                    onClick={() => setEditing(service)}
                    className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition text-xs"
                    title={common.edit}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleting(service)}
                    className="p-1.5 hover:bg-zinc-800 rounded text-red-400 hover:text-red-300 transition text-xs"
                    title={common.delete}
                  >
                    Del
                  </button>
                </div>
              </div>
              <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg ${service.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${service.is_active ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                {service.is_active ? common.active : common.inactive}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title={copy.newTitle}>
        <ServiceForm onSubmit={handleCreate} loading={saving} currency={currency} categories={categories} />
      </Dialog>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title={copy.editTitle}>
        {editing && (
          <ServiceForm
            defaultValues={{
              name: editing.name,
              description: editing.description ?? '',
              duration_minutes: editing.duration_minutes,
              price: editing.price,
              service_category_id: editing.service_category_id ?? '',
              display_order: editing.display_order ?? 0,
              is_active: editing.is_active,
            }}
            onSubmit={handleEdit}
            loading={saving}
            currency={currency}
            categories={categories}
          />
        )}
      </Dialog>

      <Dialog open={showCategoryCreate} onClose={() => setShowCategoryCreate(false)} title="Nova categoria">
        <CategoryForm onSubmit={handleCategoryCreate} loading={saving} />
      </Dialog>

      <Dialog open={!!editingCategory} onClose={() => setEditingCategory(null)} title="Editar categoria">
        {editingCategory && (
          <CategoryForm
            defaultValues={{
              name: editingCategory.name,
              description: editingCategory.description ?? '',
              display_order: editingCategory.display_order,
              is_active: editingCategory.is_active,
            }}
            onSubmit={handleCategoryEdit}
            loading={saving}
          />
        )}
      </Dialog>

      <Dialog open={!!deletingCategory} onClose={() => setDeletingCategory(null)} title="Eliminar categoria">
        {deletingCategory && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">
              Eliminar <strong className="text-zinc-100">{deletingCategory.name}</strong>? Os servicos desta categoria ficarao sem categoria.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setDeletingCategory(null)} className="flex-1">{common.cancel}</Button>
              <Button variant="danger" loading={saving} onClick={handleCategoryDelete} className="flex-1">{common.delete}</Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={!!deleting} onClose={() => setDeleting(null)} title={copy.deleteTitle}>
        {deleting && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">
              {copy.deleteConfirm} <strong className="text-zinc-100">{deleting.name}</strong>? {copy.deleteHint}
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setDeleting(null)} className="flex-1">{common.cancel}</Button>
              <Button variant="danger" loading={saving} onClick={handleDelete} className="flex-1">{common.delete}</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
