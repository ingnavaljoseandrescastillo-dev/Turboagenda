'use client'

import { useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Locale } from '@/i18n/translations'

export function DashboardPreferenceSync({ locale }: { locale?: Locale | null }) {
  const { locale: currentLocale, setLocale } = useLanguage()

  useEffect(() => {
    if (locale && locale !== currentLocale) setLocale(locale)
  }, [currentLocale, locale, setLocale])

  return null
}
