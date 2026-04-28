'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ServiceSelector } from '@/components/booking/ServiceSelector'
import { EmployeeSelector } from '@/components/booking/EmployeeSelector'
import { DateTimePicker } from '@/components/booking/DateTimePicker'
import { BookingForm } from '@/components/booking/BookingForm'
import { Button } from '@/components/ui/Button'
import { Particles } from '@/components/ui/Particles'
import type { Business, Service, Employee } from '@/types'

interface PageProps {
  params: Promise<{ slug: string }>
}

const STEPS = ['Serviço', 'Colaborador', 'Data & Hora', 'Dados']

export default function BookPage({ params }: PageProps) {
  const { slug } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState(0)
  const [business, setBusiness] = useState<Business | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)

  const [selectedService, setSelectedService] = useState<string | null>(
    searchParams.get('service')
  )
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [selectedDatetime, setSelectedDatetime] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .single()

      if (!biz) { router.push('/'); return }
      setBusiness(biz as Business)

      const [{ data: svcs }, { data: emps }] = await Promise.all([
        supabase.from('services').select('*').eq('business_id', biz.id).eq('is_active', true).order('name'),
        supabase.from('employees').select('*').eq('business_id', biz.id).eq('is_active', true).order('name'),
      ])

      setServices((svcs ?? []) as Service[])
      setEmployees((emps ?? []) as Employee[])
      setLoading(false)

      if (searchParams.get('service')) setStep(1)
    }
    load()
  }, [slug, router, searchParams])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500">A carregar...</p>
      </div>
    )
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto">
            <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-zinc-100">Agendamento confirmado!</h2>
          <p className="text-zinc-500">Receberá a confirmação em breve.</p>
          <Button onClick={() => router.push(`/b/${slug}`)} variant="secondary">
            Voltar ao perfil
          </Button>
        </div>
      </div>
    )
  }

  function canAdvance() {
    if (step === 0) return !!selectedService
    if (step === 1) return !!selectedEmployee
    if (step === 2) return !!selectedDatetime
    return false
  }

  return (
    <div className="min-h-screen bg-zinc-950 relative">
      <div className="pointer-events-none fixed inset-0" style={{ background: 'radial-gradient(ellipse at center, #052e1640 0%, #09090b 70%)' }}>
        <Particles count={14} />
      </div>
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="mb-8">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : router.push(`/b/${slug}`)}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-4"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {step === 0 ? business?.name : STEPS[step - 1]}
          </button>

          <div className="flex gap-1.5 mb-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-emerald-500' : 'bg-zinc-800'}`}
              />
            ))}
          </div>
          <p className="text-xs text-zinc-500">Passo {step + 1} de {STEPS.length}: {STEPS[step]}</p>
        </div>

        <div className="space-y-6">
          {step === 0 && (
            <ServiceSelector
              services={services}
              selected={selectedService}
              onSelect={(id) => { setSelectedService(id); setStep(1) }}
            />
          )}
          {step === 1 && (
            <EmployeeSelector
              employees={employees}
              selected={selectedEmployee}
              onSelect={(id) => { setSelectedEmployee(id); setStep(2) }}
            />
          )}
          {step === 2 && selectedService && selectedEmployee && business && (
            <DateTimePicker
              businessId={business.id}
              serviceId={selectedService}
              employeeId={selectedEmployee}
              selected={selectedDatetime}
              onSelect={(dt) => setSelectedDatetime(dt)}
            />
          )}
          {step === 3 && selectedService && selectedEmployee && selectedDatetime && business && (
            <BookingForm
              businessId={business.id}
              serviceId={selectedService}
              employeeId={selectedEmployee}
              startTime={selectedDatetime}
              onSuccess={() => setCompleted(true)}
            />
          )}

          {step < 3 && (
            <Button
              disabled={!canAdvance()}
              onClick={() => setStep(step + 1)}
              className="w-full"
            >
              Continuar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
