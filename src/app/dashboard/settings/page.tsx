'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    phone: '',
    address: '',
    slug: '',
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
        setForm({
          name: b.name ?? '',
          description: b.description ?? '',
          phone: b.phone ?? '',
          address: b.address ?? '',
          slug: b.slug ?? '',
        })
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

  if (loading) return <div className="text-zinc-500 text-sm">A carregar...</div>

  return (
    <div className="max-w-xl space-y-6">
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
    </div>
  )
}
