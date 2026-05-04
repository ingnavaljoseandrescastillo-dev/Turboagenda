'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { useLanguage } from '@/contexts/LanguageContext'

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

export default function SettingsPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const copy = t.dashboard.settings
  const common = t.dashboard.common
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [savingNotifications, setSavingNotifications] = useState(false)
  const [uploadingImage, setUploadingImage] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [scheduleSuccess, setScheduleSuccess] = useState(false)
  const [notificationSuccess, setNotificationSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [notificationError, setNotificationError] = useState<string | null>(null)
  const [subscriptionPlan, setSubscriptionPlan] = useState('trial')
  const [form, setForm] = useState({
    name: '',
    description: '',
    phone: '',
    address: '',
    slug: '',
    cover_image_url: '',
    logo_image_url: '',
    gallery_images: ['', '', '', ''],
    theme_primary_color: '#10b981',
    theme_background_color: '#09090b',
    theme_text_color: '#f4f4f5',
    theme_background_image_url: '',
  })
  const [schedule, setSchedule] = useState({
    opening_time: '09:00',
    closing_time: '18:00',
    slot_duration_minutes: 30,
    working_days: [1, 2, 3, 4, 5],
    max_booking_months: 1,
  })
  const [notifications, setNotifications] = useState({
    whatsapp_enabled: false,
    whatsapp_notify_client_on_booking: true,
    whatsapp_notify_business_on_booking: true,
    whatsapp_reminder_24h_enabled: true,
    whatsapp_birthday_enabled: false,
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
          throw new Error(json.error ?? copy.loadError)
        }

        const b = json.data.business
        const settings = json.data.settings
        const plan = json.data.subscription?.plan ?? 'trial'
        const whatsappAvailable = plan === 'plus'
        setSubscriptionPlan(plan)
        setForm({
          name: b.name ?? '',
          description: b.description ?? '',
          phone: b.phone ?? '',
          address: b.address ?? '',
          slug: b.slug ?? '',
          cover_image_url: b.cover_image_url ?? '',
          logo_image_url: b.logo_image_url ?? '',
          gallery_images: normalizeGalleryImages(b.gallery_images),
          theme_primary_color: b.theme_primary_color ?? '#10b981',
          theme_background_color: b.theme_background_color ?? '#09090b',
          theme_text_color: b.theme_text_color ?? '#f4f4f5',
          theme_background_image_url: b.theme_background_image_url ?? '',
        })
        if (settings) {
          setSchedule({
            opening_time: String(settings.opening_time ?? '09:00').slice(0, 5),
            closing_time: String(settings.closing_time ?? '18:00').slice(0, 5),
            slot_duration_minutes: settings.slot_duration_minutes ?? 30,
            working_days: settings.working_days ?? [1, 2, 3, 4, 5],
            max_booking_months: Math.max(1, Math.ceil((settings.max_booking_days ?? 30) / 30)),
          })
          setNotifications({
            whatsapp_enabled: whatsappAvailable ? Boolean(settings.whatsapp_enabled) : false,
            whatsapp_notify_client_on_booking: settings.whatsapp_notify_client_on_booking ?? true,
            whatsapp_notify_business_on_booking: settings.whatsapp_notify_business_on_booking ?? true,
            whatsapp_reminder_24h_enabled: settings.whatsapp_reminder_24h_enabled ?? true,
            whatsapp_birthday_enabled: settings.whatsapp_birthday_enabled ?? false,
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : copy.loadError)
      } finally {
        setLoading(false)
      }
    }

    void loadBusiness()
  }, [copy.loadError, router])

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
        throw new Error(json.error ?? copy.saveError)
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.saveError)
    } finally {
      setSaving(false)
    }
  }

  function updateGalleryImage(index: number, value: string) {
    setForm((current) => {
      const next = [...current.gallery_images]
      next[index] = value
      return { ...current, gallery_images: next }
    })
  }

  async function handleImageUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    kind: 'cover' | 'logo' | 'gallery' | 'background',
    index?: number
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const uploadKey = kind === 'gallery' ? `gallery-${index}` : kind
    setUploadingImage(uploadKey)
    setError(null)
    try {
      const payload = new FormData()
      payload.append('kind', kind)
      payload.append('file', file)

      const res = await fetch('/api/public-images', {
        method: 'POST',
        body: payload,
      })
      const json = await res.json()
      if (!res.ok) {
        console.error('[Settings] image upload failed', json.error)
        throw new Error(json.error ?? 'No fue posible subir la imagen.')
      }

      const url = json.data.url as string
      if (kind === 'cover') setForm((current) => ({ ...current, cover_image_url: url }))
      if (kind === 'logo') setForm((current) => ({ ...current, logo_image_url: url }))
      if (kind === 'background') setForm((current) => ({ ...current, theme_background_image_url: url }))
      if (kind === 'gallery' && typeof index === 'number') updateGalleryImage(index, url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible subir la imagen.')
    } finally {
      setUploadingImage(null)
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
        throw new Error(json.error ?? copy.scheduleSaveError)
      }
      setScheduleSuccess(true)
      setTimeout(() => setScheduleSuccess(false), 3000)
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : copy.scheduleSaveError)
    } finally {
      setSavingSchedule(false)
    }
  }

  async function handleNotificationSave(e: React.FormEvent) {
    e.preventDefault()
    setSavingNotifications(true)
    setNotificationSuccess(false)
    setNotificationError(null)
    try {
      const res = await fetch('/api/notification-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...notifications,
          whatsapp_enabled: subscriptionPlan === 'plus' ? notifications.whatsapp_enabled : false,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        console.error('[Settings] notification save failed', json.error)
        throw new Error(json.error ?? 'Nao foi possivel guardar as notificacoes.')
      }
      setNotificationSuccess(true)
      setTimeout(() => setNotificationSuccess(false), 3000)
    } catch (err) {
      setNotificationError(err instanceof Error ? err.message : 'Nao foi possivel guardar as notificacoes.')
    } finally {
      setSavingNotifications(false)
    }
  }

  if (loading) return <div className="text-zinc-500 text-sm">{common.loading}</div>
  const whatsappAvailable = subscriptionPlan === 'plus'

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100">{copy.title}</h2>
        <p className="text-sm text-zinc-500 mt-1">{copy.subtitle}</p>
      </div>

      <Card>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label={copy.businessName}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label={copy.publicSlug}
            value={form.slug}
            helper={`https://turboagenda.pt/b/${form.slug}`}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          />
          <Input
            label={copy.phone}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <Input
            label={copy.address}
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">{copy.description}</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              placeholder={copy.descriptionPlaceholder}
            />
          </div>

          {success && (
            <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              {copy.businessSaved}
            </p>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" loading={saving}>
            {copy.saveBusiness}
          </Button>
        </form>
      </Card>

      <Card>
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">{copy.publicPage}</h3>
            <p className="text-sm text-zinc-500 mt-1">
              {copy.publicPageDesc}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-4">
              <Input
                label={copy.cover}
                type="url"
                placeholder="https://..."
                helper={copy.coverHelper}
                value={form.cover_image_url}
                onChange={(e) => setForm((f) => ({ ...f, cover_image_url: e.target.value }))}
              />
              <ImageUploadButton
                label={uploadingImage === 'cover' ? 'Subiendo portada...' : 'Subir portada'}
                disabled={Boolean(uploadingImage)}
                onChange={(event) => handleImageUpload(event, 'cover')}
              />
              <Input
                label={copy.logo}
                type="url"
                placeholder="https://..."
                helper={copy.logoHelper}
                value={form.logo_image_url}
                onChange={(e) => setForm((f) => ({ ...f, logo_image_url: e.target.value }))}
              />
              <ImageUploadButton
                label={uploadingImage === 'logo' ? 'Subiendo logo...' : 'Subir logo'}
                disabled={Boolean(uploadingImage)}
                onChange={(event) => handleImageUpload(event, 'logo')}
              />
            </div>

            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
              {form.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.cover_image_url} alt="Preview da capa" className="h-48 w-full object-cover" />
              ) : (
                <div className="flex h-48 items-center justify-center bg-zinc-900 text-sm text-zinc-600">
                  {copy.coverPreview}
                </div>
              )}
              <div className="flex items-center gap-3 p-4">
                <div className="h-14 w-14 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                  {form.logo_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.logo_image_url} alt="Preview do logo" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div>
                  <p className="font-semibold text-zinc-100">{form.name || copy.businessName}</p>
                  <p className="text-sm text-zinc-500">{copy.publicPreview}</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-zinc-300">{copy.gallery}</p>
            <div className="grid gap-3 md:grid-cols-2">
              {form.gallery_images.map((imageUrl, index) => (
                <div key={index} className="grid gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <div className="aspect-video overflow-hidden rounded-lg bg-zinc-900">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt={`Galeria ${index + 1}`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-600">
                        {copy.photo} {index + 1}
                      </div>
                    )}
                  </div>
                  <Input
                    aria-label={`URL da foto ${index + 1}`}
                    type="url"
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={(e) => updateGalleryImage(index, e.target.value)}
                  />
                  <ImageUploadButton
                    label={uploadingImage === `gallery-${index}` ? 'Subiendo foto...' : `Subir foto ${index + 1}`}
                    disabled={Boolean(uploadingImage)}
                    onChange={(event) => handleImageUpload(event, 'gallery', index)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div>
              <h4 className="font-semibold text-zinc-100">Apariencia publica</h4>
              <p className="mt-1 text-sm text-zinc-500">
                Personaliza colores y fondo del link publico sin romper la experiencia de reserva.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <ColorField
                label="Color principal"
                value={form.theme_primary_color}
                onChange={(value) => setForm((f) => ({ ...f, theme_primary_color: value }))}
              />
              <ColorField
                label="Color de fondo"
                value={form.theme_background_color}
                onChange={(value) => setForm((f) => ({ ...f, theme_background_color: value }))}
              />
              <ColorField
                label="Color de texto"
                value={form.theme_text_color}
                onChange={(value) => setForm((f) => ({ ...f, theme_text_color: value }))}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <div className="space-y-3">
                <Input
                  label="Imagen de fondo"
                  type="url"
                  placeholder="https://..."
                  helper="Opcional. Se usa como fondo suave en la pagina publica."
                  value={form.theme_background_image_url}
                  onChange={(e) => setForm((f) => ({ ...f, theme_background_image_url: e.target.value }))}
                />
                <ImageUploadButton
                  label={uploadingImage === 'background' ? 'Subiendo fondo...' : 'Subir fondo'}
                  disabled={Boolean(uploadingImage)}
                  onChange={(event) => handleImageUpload(event, 'background')}
                />
              </div>

              <div
                className="overflow-hidden rounded-xl border border-zinc-800 p-4"
                style={{
                  color: form.theme_text_color,
                  backgroundColor: form.theme_background_color,
                  backgroundImage: form.theme_background_image_url
                    ? `linear-gradient(135deg, ${form.theme_background_color}ee, ${form.theme_background_color}bb), url("${form.theme_background_image_url}")`
                    : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: form.theme_primary_color }}>
                  Preview
                </p>
                <h5 className="mt-2 text-xl font-black">{form.name || copy.businessName}</h5>
                <p className="mt-2 text-sm opacity-75">Asi se sentira el perfil publico para tus clientes.</p>
                <div
                  className="mt-4 inline-flex rounded-lg px-3 py-2 text-xs font-bold"
                  style={{ backgroundColor: form.theme_primary_color, color: readableTextColor(form.theme_primary_color) }}
                >
                  Reservar ahora
                </div>
              </div>
            </div>
          </div>

          {success && (
            <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              {copy.imagesSaved}
            </p>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" loading={saving}>
            {copy.saveImages}
          </Button>
        </form>
      </Card>

      <Card>
        <form onSubmit={handleScheduleSave} className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">{copy.scheduleTitle}</h3>
            <p className="text-sm text-zinc-500 mt-1">{copy.scheduleDesc}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={copy.opening}
              type="time"
              value={schedule.opening_time}
              onChange={(e) => setSchedule((s) => ({ ...s, opening_time: e.target.value }))}
            />
            <Input
              label={copy.closing}
              type="time"
              value={schedule.closing_time}
              onChange={(e) => setSchedule((s) => ({ ...s, closing_time: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={copy.slotDuration}
              type="number"
              min={5}
              max={240}
              value={schedule.slot_duration_minutes}
              onChange={(e) =>
                setSchedule((s) => ({ ...s, slot_duration_minutes: Number(e.target.value) || 30 }))
              }
            />
            <Input
              label={copy.openMonths}
              type="number"
              min={1}
              max={12}
              helper={copy.bookingDays.replace('{{days}}', String(schedule.max_booking_months * 30))}
              value={schedule.max_booking_months}
              onChange={(e) =>
                setSchedule((s) => ({ ...s, max_booking_months: Number(e.target.value) || 1 }))
              }
            />
          </div>

          <div>
            <p className="text-sm font-medium text-zinc-300 mb-2">{copy.workingDays}</p>
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
              {copy.scheduleSaved}
            </p>
          )}

          {scheduleError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {scheduleError}
            </p>
          )}

          <Button type="submit" loading={savingSchedule}>
            {copy.saveSchedule}
          </Button>
        </form>
      </Card>

      <Card>
        <form onSubmit={handleNotificationSave} className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">WhatsApp e notificacoes</h3>
            <p className="text-sm text-zinc-500 mt-1">
              Basic mantiene recordatorios por email. WhatsApp queda reservado para el Plan Plus.
            </p>
          </div>
          {!whatsappAvailable && (
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              Tu plan actual es {subscriptionPlan}. Cambia a Plus para activar mensajes automaticos por WhatsApp.
            </p>
          )}

          <div className="space-y-3">
            <ToggleRow
              label="Ativar WhatsApp"
              description="Permite registrar mensagens para clientes e negocio."
              checked={notifications.whatsapp_enabled}
              disabled={!whatsappAvailable}
              onChange={(value) => setNotifications((current) => ({ ...current, whatsapp_enabled: value }))}
            />
            <ToggleRow
              label="Mensagem ao cliente quando cria cita"
              description="Fila uma mensagem de confirmacao para o telefone do cliente."
              checked={notifications.whatsapp_notify_client_on_booking}
              disabled={!whatsappAvailable}
              onChange={(value) =>
                setNotifications((current) => ({ ...current, whatsapp_notify_client_on_booking: value }))
              }
            />
            <ToggleRow
              label="Mensagem ao negocio quando cria cita"
              description="Fila um aviso para o telefone cadastrado no negocio."
              checked={notifications.whatsapp_notify_business_on_booking}
              disabled={!whatsappAvailable}
              onChange={(value) =>
                setNotifications((current) => ({ ...current, whatsapp_notify_business_on_booking: value }))
              }
            />
            <ToggleRow
              label="Recordatorio 24 horas antes"
              description="Fila uma mensagem pedindo confirmacao de asistencia."
              checked={notifications.whatsapp_reminder_24h_enabled}
              disabled={!whatsappAvailable}
              onChange={(value) =>
                setNotifications((current) => ({ ...current, whatsapp_reminder_24h_enabled: value }))
              }
            />
            <ToggleRow
              label="Feliz cumpleanos"
              description="Preparado para clientes con cita en los ultimos 3 meses y fecha de nacimiento."
              checked={notifications.whatsapp_birthday_enabled}
              disabled={!whatsappAvailable}
              onChange={(value) => setNotifications((current) => ({ ...current, whatsapp_birthday_enabled: value }))}
            />
          </div>

          {notificationSuccess && (
            <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              Notificacoes guardadas com sucesso.
            </p>
          )}

          {notificationError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {notificationError}
            </p>
          )}

          <Button type="submit" loading={savingNotifications}>
            Guardar notificacoes
          </Button>
        </form>
      </Card>
    </div>
  )
}

function ImageUploadButton({
  label,
  disabled,
  onChange,
}: {
  label: string
  disabled: boolean
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <label
      className={`inline-flex w-fit items-center justify-center rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 transition ${
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-emerald-500 hover:text-emerald-300'
      }`}
    >
      {label}
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={disabled} onChange={onChange} className="sr-only" />
    </label>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const colorValue = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#10b981'
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-zinc-300">{label}</span>
      <span className="grid grid-cols-[44px_1fr] gap-2">
        <input
          type="color"
          value={colorValue}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-11 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 p-1"
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          pattern="^#[0-9a-fA-F]{6}$"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500"
        />
      </span>
    </label>
  )
}

function readableTextColor(hex: string) {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.slice(1) : '10b981'
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#09090b' : '#ffffff'
}

function ToggleRow({
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className={`flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 ${disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'}`}>
      <span>
        <span className="block text-sm font-semibold text-zinc-100">{label}</span>
        <span className="mt-1 block text-xs text-zinc-500">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-emerald-500"
      />
    </label>
  )
}

function normalizeGalleryImages(value: unknown) {
  const images = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  return [...images.slice(0, 4), '', '', '', ''].slice(0, 4)
}
