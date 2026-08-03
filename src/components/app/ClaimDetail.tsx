'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  GraduationCap,
  School,
  StickyNote,
  Calendar,
  DollarSign,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  Banknote,
  Info,
  BookOpen,
  Receipt,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge, LoadingState, Field } from './common'
import { useAppStore } from '@/lib/store'
import { apiRequest } from '@/lib/api-client'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getCheckpointCountdown,
  countdownToneClass,
} from '@/lib/format'
import type { Claim } from '@/lib/types'

export function ClaimDetail() {
  const claimId = useAppStore((s) => s.currentClaimId)
  const user = useAppStore((s) => s.user)
  const navigate = useAppStore((s) => s.navigate)
  const [claim, setClaim] = useState<Claim | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    if (!claimId) {
      navigate(user?.role === 'admin' ? 'admin-claims' : 'my-claims')
      return
    }
    ;(async () => {
      setLoading(true)
      try {
        const data = await apiRequest<Claim>(`/api/claims/${claimId}`)
        if (!active) return
        setClaim(data)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load claim'
        toast.error(msg)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [claimId, navigate, user])

  if (loading) {
    return <LoadingState label="Loading claim…" />
  }
  if (!claim) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('my-claims')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <p className="text-center text-muted-foreground">Claim not found.</p>
      </div>
    )
  }

  const countdown = getCheckpointCountdown(claim.thirtyDayCheckpoint, claim.status)
  const subjectList = claim.subjects ? claim.subjects.split(',').filter(Boolean) : []

  // Build a status timeline from available timestamps
  const timeline: { label: string; date: string | null; icon: React.ComponentType<{ className?: string }>; tone: string }[] = [
    {
      label: 'Claim Submitted',
      date: claim.createdAt,
      icon: CheckCircle2,
      tone: 'text-primary',
    },
    {
      label: 'Approved',
      date: claim.status === 'Approved' || claim.status === 'Paid' ? claim.updatedAt : null,
      icon: CheckCircle2,
      tone: 'text-emerald-600',
    },
    {
      label: 'Rejected',
      date: claim.status === 'Rejected' ? claim.updatedAt : null,
      icon: XCircle,
      tone: 'text-red-600',
    },
    {
      label: 'Payment Completed',
      date: claim.datePaid,
      icon: Banknote,
      tone: 'text-blue-600',
    },
  ]

  return (
    <div className="space-y-4 animate-screen-in">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => navigate(user?.role === 'admin' ? 'admin-claims' : 'my-claims')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold font-mono">{claim.claimId}</h1>
          <StatusBadge status={claim.status} />
        </div>
      </div>

      {/* 30-day checkpoint banner */}
      {countdown.tone !== 'none' && (
        <Card
          className={
            countdown.tone === 'ready'
              ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30'
              : countdown.tone === 'red'
                ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
                : countdown.tone === 'yellow'
                  ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
                  : 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
          }
        >
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className={`h-8 w-8 ${countdownToneClass(countdown.tone)}`} />
            <div>
              <p className="text-sm font-semibold">{countdown.label}</p>
              {claim.thirtyDayCheckpoint && (
                <p className="text-xs text-muted-foreground">
                  Checkpoint: {formatDate(claim.thirtyDayCheckpoint)}
                  {claim.startDate && ` · Started: ${formatDate(claim.startDate)}`}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commission & fee highlight */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-primary text-primary-foreground border-0">
          <CardContent className="p-4 flex flex-col justify-center items-center gap-1">
            <DollarSign className="h-5 w-5 text-primary-foreground/60" />
            <p className="text-xs text-primary-foreground/80">Commission</p>
            <p className="text-xl font-bold">
              {formatCurrency(claim.commissionAmount)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-muted">
          <CardContent className="p-4 flex flex-col justify-center items-center gap-1">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Student Fee</p>
            <p className="text-xl font-bold">
              {formatCurrency(claim.totalStudentFee)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subjects */}
      {subjectList.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4.5 w-4.5 text-primary" />
              Subjects
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {claim.subjectCount} enrolled
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {subjectList.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  {s}
                </span>
              ))}
            </div>
            {claim.subjectCount > 0 && claim.totalStudentFee > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                {claim.subjectCount} subject{claim.subjectCount === 1 ? '' : 's'} · Total: {formatCurrency(claim.totalStudentFee)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Student info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4.5 w-4.5 text-primary" />
            Student
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Student Name">{claim.studentName}</Field>
          <Field label="Grade">{claim.studentGrade}</Field>
          <div className="sm:col-span-2">
            <Field label="School">
              <span className="inline-flex items-center gap-1.5">
                <School className="h-4 w-4 text-muted-foreground" />
                {claim.studentSchool}
              </span>
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Parent info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4.5 w-4.5 text-primary" />
            Parent / Guardian
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name">{claim.parentFullName}</Field>
          <Field label="Phone">
            <a
              href={`tel:${claim.parentPhone}`}
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              <Phone className="h-4 w-4" />
              {claim.parentPhone}
            </a>
          </Field>
          {claim.parentEmail && (
            <div className="sm:col-span-2">
              <Field label="Email">
                <a
                  href={`mailto:${claim.parentEmail}`}
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  {claim.parentEmail}
                </a>
              </Field>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {claim.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <StickyNote className="h-4.5 w-4.5 text-primary" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{claim.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Payment / admin info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4.5 w-4.5 text-primary" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Status"><StatusBadge status={claim.status} /></Field>
          <Field label="Payment Method">{claim.paymentMethod}</Field>
          <Field label="Start Date">{formatDate(claim.startDate)}</Field>
          <Field label="30-Day Checkpoint">{formatDate(claim.thirtyDayCheckpoint)}</Field>
          <Field label="Date Paid">{formatDate(claim.datePaid)}</Field>
          <Field label="Submitted">{formatDate(claim.createdAt)}</Field>
        </CardContent>
      </Card>

      {/* Admin notes */}
      {claim.adminNotes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4.5 w-4.5 text-primary" />
              Admin Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap rounded-lg bg-muted p-3">
              {claim.adminNotes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4.5 w-4.5 text-primary" />
            Status Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {timeline.map((item, i) => {
              const Icon = item.icon
              const done = !!item.date
              return (
                <li key={i} className="flex items-start gap-3">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      done ? item.tone + ' bg-current/10' : 'bg-muted text-muted-foreground'
                    }`}
                    style={done ? { backgroundColor: 'currentColor' } : undefined}
                  >
                    {done ? (
                      <Icon className="h-4 w-4 text-background" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="pt-0.5">
                    <p className={`text-sm font-medium ${done ? '' : 'text-muted-foreground'}`}>
                      {item.label}
                    </p>
                    {done && (
                      <p className="text-xs text-muted-foreground">
                        {item.label === 'Payment Completed'
                          ? formatDate(item.date)
                          : formatDateTime(item.date)}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
            </ol>
          </CardContent>
      </Card>

      {user?.role === 'admin' && (
        <Button
          variant="outline"
          className="w-full h-11"
          onClick={() => navigate('admin-claims')}
        >
          Back to All Claims
        </Button>
      )}
    </div>
  )
}