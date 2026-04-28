'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    phone: '',
    address: '',
    slug: '',
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: ownerData } = await supabase
        .from('business_owners')
        .select('business_id, businesses(*)')
        .eq('user_id', data.user.id)
        .single()
      if (ownerData?.businesses) {
        const b = ownerData.businesses as unknown as typeof form & { id: string }
        setBusinessId(b.id)
        setForm({
          name: b.name ?? '',
          description: b.description ?? '',
          phone: b.phone ?? '',
          address: b.address ?? '',
          slug: b.slug ?? '',
        })
      }
      setLoading(false)
    })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId) return
    setSaving(true)
    setSuccess(false)
    const supabase = createClient()
    await supabase.from('businesses').update(form).eq('id', businessId)
    setSaving(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  if (loading) return <div className="text-zinc-500 text-sm">A carregar...</div>

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100">Configurações</h2>
        <p className="text-sm text-zinc-500 mt-1">Perfil do seu negócio</p>
      </div>

      <Card>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nome do negócio"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Slug (URL pública)"
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
            <label className="text-sm font-medium text-zinc-300">Descrição</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              placeholder="Descreva o seu negócio..."
            />
          </div>

          {success && (
            <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              Configurações guardadas com sucesso!
            </p>
          )}

          <Button type="submit" loading={saving}>
            Guardar alterações
          </Button>
        </form>
      </Card>
    </div>
  )
}
