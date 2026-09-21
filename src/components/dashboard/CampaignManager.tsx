'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { campaignPrice } from '@/lib/campaigns'
import { formatCurrency } from '@/lib/utils'
import type { Service, ServiceDiscountCampaign } from '@/types'

type Draft = Pick<ServiceDiscountCampaign,
  'name' | 'discount_percent' | 'starts_on' | 'ends_on' | 'is_active' | 'service_ids'>

const emptyDraft: Draft = {
  name: '',
  discount_percent: 20,
  starts_on: '',
  ends_on: '',
  is_active: true,
  service_ids: [],
}

export function CampaignManager({ services, currency }: { services: Service[]; currency: string }) {
  const [campaigns, setCampaigns] = useState<ServiceDiscountCampaign[]>([])
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const response = await fetch('/api/campaigns')
    const json = await response.json()
    if (!response.ok) throw new Error(json.error ?? 'Não foi possível carregar as campanhas')
    setCampaigns(json.data ?? [])
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((cause) => setError(cause instanceof Error ? cause.message : 'Erro ao carregar campanhas'))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  function openNew() {
    setEditingId(null)
    setDraft(emptyDraft)
    setError(null)
    setShowForm(true)
  }

  function openEdit(campaign: ServiceDiscountCampaign) {
    setEditingId(campaign.id)
    setDraft({
      name: campaign.name,
      discount_percent: campaign.discount_percent,
      starts_on: campaign.starts_on,
      ends_on: campaign.ends_on,
      is_active: campaign.is_active,
      service_ids: campaign.service_ids,
    })
    setError(null)
    setShowForm(true)
  }

  async function save(payload: Draft, id?: string) {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/campaigns', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { ...payload, id } : payload),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error ?? 'Não foi possível guardar a campanha')
      await load()
      setShowForm(false)
      setEditingId(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro ao guardar campanha')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-zinc-100">Campanhas de desconto</h2>
          <p className="mt-1 text-xs text-zinc-400">
            O desconto só se aplica a reservas com data dentro da campanha. Sem campanha, o preço não muda.
          </p>
        </div>
        <Button size="sm" onClick={openNew} disabled={services.length === 0}>Criar campanha</Button>
      </div>

      {campaigns.length > 0 && (
        <div className="mt-4 grid gap-3">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm text-zinc-100">{campaign.name}</strong>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${campaign.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-800 text-zinc-400'}`}>
                      {campaign.is_active ? 'Ativa' : 'Pausada'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    -{campaign.discount_percent}% · {campaign.starts_on} a {campaign.ends_on} ·{' '}
                    {campaign.service_ids.length} serviço(s)
                  </p>
                </div>
                <div className="flex gap-3 text-xs">
                  <button className="text-emerald-300 hover:text-emerald-200" onClick={() => openEdit(campaign)}>Editar</button>
                  <button
                    disabled={busy}
                    className="text-zinc-300 hover:text-white disabled:opacity-50"
                    onClick={() => void save({
                      name: campaign.name,
                      discount_percent: campaign.discount_percent,
                      starts_on: campaign.starts_on,
                      ends_on: campaign.ends_on,
                      is_active: !campaign.is_active,
                      service_ids: campaign.service_ids,
                    }, campaign.id)}
                  >
                    {campaign.is_active ? 'Pausar' : 'Ativar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <form
          className="mt-4 space-y-4 rounded-xl border border-zinc-700 bg-zinc-950/80 p-4"
          onSubmit={(event) => {
            event.preventDefault()
            void save(draft, editingId ?? undefined)
          }}
        >
          <h3 className="text-sm font-semibold text-zinc-100">{editingId ? 'Editar campanha' : 'Nova campanha'}</h3>
          <label className="block text-sm text-zinc-300">
            Nome da campanha
            <input required minLength={2} maxLength={100} value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
              placeholder="Ex.: Inauguração" />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm text-zinc-300">
              Desconto (%)
              <input required type="number" min={1} max={99} value={draft.discount_percent}
                onChange={(event) => setDraft({ ...draft, discount_percent: Number(event.target.value) })}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white" />
            </label>
            <label className="text-sm text-zinc-300">
              Início
              <input required type="date" value={draft.starts_on}
                onChange={(event) => setDraft({ ...draft, starts_on: event.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white" />
            </label>
            <label className="text-sm text-zinc-300">
              Fim
              <input required type="date" min={draft.starts_on} value={draft.ends_on}
                onChange={(event) => setDraft({ ...draft, ends_on: event.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white" />
            </label>
          </div>
          <fieldset>
            <legend className="text-sm text-zinc-300">Serviços incluídos</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {services.filter((service) => service.is_active && !service.deleted_at).map((service) => (
                <label key={service.id} className="flex items-center gap-2 rounded-lg border border-zinc-800 p-2 text-sm text-zinc-300">
                  <input type="checkbox" checked={draft.service_ids.includes(service.id)}
                    onChange={(event) => setDraft({
                      ...draft,
                      service_ids: event.target.checked
                        ? [...draft.service_ids, service.id]
                        : draft.service_ids.filter((id) => id !== service.id),
                    })} />
                  <span>{service.name} · {formatCurrency(service.price, currency)}
                    {draft.discount_percent > 0 && draft.discount_percent < 100 && (
                      <> → {formatCurrency(campaignPrice(service, draft.starts_on, [{
                        id: editingId ?? '',
                        business_id: service.business_id,
                        ...draft,
                        created_at: '',
                        updated_at: '',
                      }]), currency)}</>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={draft.is_active}
              onChange={(event) => setDraft({ ...draft, is_active: event.target.checked })} />
            Ativar automaticamente nas datas escolhidas
          </label>
          <div className="flex gap-2">
            <Button type="submit" loading={busy} disabled={draft.service_ids.length === 0}>Guardar campanha</Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </form>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
    </section>
  )
}
