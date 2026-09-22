export const TRIAL_SMS_TOTAL_LIMIT = 20
export const PAID_SMS_MONTHLY_LIMIT = 150

type SmsSubscription = {
  plan?: string | null
  status?: string | null
  trial_ends_at?: string | null
}

export function smsReminderAllowance(
  subscription: SmsSubscription | null | undefined,
  overrideUntil?: string | null,
  now = new Date()
) {
  if (subscription?.plan === 'basic' || subscription?.plan === 'plus') {
    return { available: true, limit: PAID_SMS_MONTHLY_LIMIT, period: 'month' as const }
  }

  // An administrator can still grant temporary full SMS access to a trial.
  if (overrideUntil && new Date(overrideUntil).getTime() > now.getTime()) {
    return { available: true, limit: PAID_SMS_MONTHLY_LIMIT, period: 'month' as const }
  }

  if (
    subscription?.plan === 'trial' &&
    subscription.status === 'trial' &&
    subscription.trial_ends_at &&
    new Date(subscription.trial_ends_at).getTime() > now.getTime()
  ) {
    return { available: true, limit: TRIAL_SMS_TOTAL_LIMIT, period: 'trial' as const }
  }

  return { available: false, limit: 0, period: 'trial' as const }
}
