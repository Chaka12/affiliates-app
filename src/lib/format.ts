import type { ClaimStatus } from './types'

/** Currency formatter — Lesotho Loti/Maloti with "M" symbol */
export function formatCurrency(amount: number): string {
  const val = amount || 0
  return `M${val.toFixed(2)}`
}

/** Format an ISO date string (YYYY-MM-DD or full ISO) as e.g. "Jul 27, 2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Format an ISO datetime as "Jul 27, 2026, 1:31 PM" */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Tailwind classes for each claim-status badge */
export function statusBadgeClass(status: ClaimStatus): string {
  switch (status) {
    case 'Pending':
      return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700'
    case 'Approved':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700'
    case 'Rejected':
      return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700'
    case 'Paid':
      return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700'
  }
}

/** Solid dot color for status icon */
export function statusDotClass(status: ClaimStatus): string {
  switch (status) {
    case 'Pending':
      return 'bg-[#f39c12]'
    case 'Approved':
      return 'bg-[#27ae60]'
    case 'Rejected':
      return 'bg-[#e74c3c]'
    case 'Paid':
      return 'bg-[#2c3e8f]'
  }
}

export interface CountdownInfo {
  daysRemaining: number
  /** 'green' | 'yellow' | 'red' | 'ready' | 'none' */
  tone: 'green' | 'yellow' | 'red' | 'ready' | 'none'
  label: string
}

/**
 * Compute the 30-day checkpoint countdown.
 * - green: > 20 days remaining
 * - yellow: 10–20 days remaining
 * - red: < 10 days remaining
 * - ready: <= 0 days remaining (payment window reached)
 * - none: no checkpoint date set
 */
export function getCheckpointCountdown(
  checkpoint: string | null | undefined,
  status: ClaimStatus
): CountdownInfo {
  if (!checkpoint) {
    return { daysRemaining: 0, tone: 'none', label: 'Not started' }
  }
  const target = new Date(checkpoint + 'T00:00:00')
  if (isNaN(target.getTime())) {
    return { daysRemaining: 0, tone: 'none', label: 'Not started' }
  }
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diffMs = target.getTime() - now.getTime()
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (days <= 0) {
    return {
      daysRemaining: 0,
      tone: 'ready',
      label:
        status === 'Approved'
          ? 'Payment Ready'
          : status === 'Paid'
            ? 'Paid'
            : 'Checkpoint reached',
    }
  }
  if (days < 10) {
    return { daysRemaining: days, tone: 'red', label: `${days} day${days === 1 ? '' : 's'} left` }
  }
  if (days <= 20) {
    return { daysRemaining: days, tone: 'yellow', label: `${days} days left` }
  }
  return { daysRemaining: days, tone: 'green', label: `${days} days left` }
}

/** Tailwind text color for the countdown tone */
export function countdownToneClass(tone: CountdownInfo['tone']): string {
  switch (tone) {
    case 'green':
      return 'text-emerald-600'
    case 'yellow':
      return 'text-amber-600'
    case 'red':
      return 'text-red-600'
    case 'ready':
      return 'text-blue-600 font-semibold'
    default:
      return 'text-muted-foreground'
  }
}
