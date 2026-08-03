'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  DollarSign,
  Plus,
  ListChecks,
  LogOut,
  User as UserIcon,
  Phone,
  TrendingUp,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard, LoadingState } from './common'
import { useAppStore } from '@/lib/store'
import { apiRequest } from '@/lib/api-client'
import { formatCurrency } from '@/lib/format'
import type { AgentProfile, Claim } from '@/lib/types'

export function AgentDashboard() {
  const user = useAppStore((s) => s.user)
  const navigate = useAppStore((s) => s.navigate)
  const openClaim = useAppStore((s) => s.openClaim)
  const setMyClaims = useAppStore((s) => s.setMyClaims)
  const logout = useAppStore((s) => s.logout)
  const [profile, setProfile] = useState<AgentProfile | null>(null)
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const [p, c] = await Promise.all([
          apiRequest<AgentProfile>('/api/agents/me'),
          apiRequest<{ claims: Claim[]; total: number }>('/api/claims?limit=200'),
        ])
        if (!active) return
        setProfile(p)
        setClaims(c.claims)
        setMyClaims(c.claims, c.total)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load dashboard'
        toast.error(msg)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [setMyClaims])

  if (loading || !user) {
    return <LoadingState label="Loading your dashboard…" />
  }

  const totalClaims = claims.length
  const pending = claims.filter((c) => c.status === 'Pending').length
  const approved = claims.filter((c) => c.status === 'Approved').length
  const paid = claims.filter((c) => c.status === 'Paid').length
  const rejected = claims.filter((c) => c.status === 'Rejected').length
  const totalEarned = claims
    .filter((c) => c.status === 'Paid')
    .reduce((sum, c) => sum + c.commissionAmount, 0)
  const totalPending = claims
    .filter((c) => c.status === 'Pending' || c.status === 'Approved')
    .reduce((sum, c) => sum + c.commissionAmount, 0)

  const recent = claims.slice(0, 4)

  return (
    <div className="space-y-6 animate-screen-in">
      {/* Welcome header */}
      <Card className="bg-primary text-primary-foreground border-0 shadow-lg">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-foreground/15">
              <UserIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-primary-foreground/80">Welcome back,</p>
              <p className="text-lg font-bold truncate">{user.name}</p>
              <p className="text-xs text-primary-foreground/80">
                {user.agentId} · {user.email}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-primary-foreground/10 p-3">
              <p className="text-xs text-primary-foreground/80">Commission Rate</p>
              <p className="text-lg font-bold">{user.commissionRate}%</p>
            </div>
            <div className="rounded-lg bg-primary-foreground/10 p-3">
              <p className="text-xs text-primary-foreground/80">Per Subject</p>
              <p className="text-lg font-bold">
                {formatCurrency(profile?.estimatedCommissionPerSubject ?? 0)}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-primary-foreground/60 text-center">
            <BookOpen className="inline h-3 w-3 mr-1" />
            Prices vary per subject
          </p>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Claims" value={totalClaims} icon={ClipboardList} tone="primary" />
        <StatCard label="Pending" value={pending} icon={Clock} tone="amber" />
        <StatCard label="Approved" value={approved} icon={CheckCircle2} tone="green" />
        <StatCard label="Paid" value={paid} icon={DollarSign} tone="blue" />
      </div>

      {/* Commission summary */}
      <div className="grid grid-cols-1 gap-3">
        <StatCard
          label="Total Commission Earned"
          value={formatCurrency(totalEarned)}
          icon={TrendingUp}
          tone="green"
          subtitle={`${paid} paid claim${paid === 1 ? '' : 's'}`}
        />
        {totalPending > 0 && (
          <StatCard
            label="Pending Commission"
            value={formatCurrency(totalPending)}
            icon={Clock}
            tone="amber"
            subtitle="Awaiting approval/payment"
          />
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          size="lg"
          className="h-14 text-base"
          onClick={() => navigate('new-claim')}
        >
          <Plus className="h-5 w-5" />
          Claim a Student
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-14 text-base"
          onClick={() => navigate('my-claims')}
        >
          <ListChecks className="h-5 w-5" />
          My Claims
        </Button>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Recent Claims</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => navigate('my-claims')}
            >
              View all
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div className="px-5 pb-5 pt-1 text-sm text-muted-foreground text-center">
              No claims yet. Tap &ldquo;Claim a Student&rdquo; to get started.
            </div>
          ) : (
            <ul className="divide-y">
              {recent.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => openClaim(c.id)}
                    className="w-full flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.studentName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.claimId} · {c.studentGrade}
                        {c.subjectCount > 0 && ` · ${c.subjectCount} subj.`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">
                        {formatCurrency(c.commissionAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">{c.status}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {rejected > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {rejected} rejected claim{rejected === 1 ? '' : 's'} — tap a claim for details.
        </p>
      )}

      {/* Account + logout */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Phone:</span>
            <span className="font-medium">{user.phone || 'Not set'}</span>
          </div>
          <Button
            variant="outline"
            className="w-full h-11"
            onClick={() => {
              logout()
              toast.success('Logged out successfully')
            }}
          >
            <LogOut className="h-4.5 w-4.5" />
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
