import type { Service, ServiceDiscountCampaign } from '@/types'

export function businessDate(instant: string | Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(instant))
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function campaignForService(
  serviceId: string,
  date: string,
  campaigns: ServiceDiscountCampaign[]
): ServiceDiscountCampaign | null {
  return campaigns.find((campaign) =>
    campaign.is_active &&
    campaign.service_ids.includes(serviceId) &&
    date >= campaign.starts_on &&
    date <= campaign.ends_on
  ) ?? null
}

export function campaignPrice(
  service: Service,
  date: string,
  campaigns: ServiceDiscountCampaign[]
): number {
  const discount = campaignForService(service.id, date, campaigns)?.discount_percent ?? 0
  return Math.round(Number(service.price) * (100 - discount)) / 100
}
