'use client'

import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ClaimStatus } from '@/lib/types'
import { statusBadgeClass, statusDotClass } from '@/lib/format'

/** Coloured status badge with a leading dot */
export function StatusBadge({ status, className }: { status: ClaimStatus; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn('gap-1.5 font-medium', statusBadgeClass(status), className)}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', statusDotClass(status))} />
      {status}
    </Badge>
  )
}

/** Reusable stat card for dashboards */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  subtitle,
}: {
  label: string
  value: string | number
  icon?: React.ComponentType<{ className?: string }>
  tone?: 'default' | 'primary' | 'green' | 'amber' | 'red' | 'blue'
  subtitle?: string
}) {
  const toneClasses: Record<string, string> = {
    default: 'bg-muted text-foreground',
    primary: 'bg-primary/10 text-primary',
    green: 'bg-emerald-500/10 text-emerald-600',
    amber: 'bg-amber-500/10 text-amber-600',
    red: 'bg-red-500/10 text-red-600',
    blue: 'bg-blue-500/10 text-blue-600',
  }
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums truncate">{value}</p>
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
          {Icon && (
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', toneClasses[tone])}>
              <Icon className="h-4.5 w-4.5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/** Full-card spinner */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

/** Empty-state placeholder */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

/** A labelled read-only field */
export function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <div className="text-sm font-medium break-words">{children || '—'}</div>
    </div>
  )
}
