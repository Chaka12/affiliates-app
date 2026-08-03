'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Users,
  ClipboardList,
  Clock,
  DollarSign,
  ListChecks,
  UserCog,
  LogOut,
  Shield,
  TrendingUp,
  Receipt,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard, LoadingState, StatusBadge } from './common'
import { useAppStore } from '@/lib/store'
import { apiRequest } from '@/lib/api-client'
import { formatCurrency, formatDate } from '@/lib/format'
import type { AdminStats, Claim } from '@/lib/types'

export function AdminDashboard() {
  const user = useAppStore((s) => s.user)
  const navigate = useAppStore((s) => s.navigate)
  const setStats = useAppStore((s) => s.setStats)
  const logout = useAppStore((s) => s.logout)
  const [stats, setStatsState] = useState<AdminStats | null>(null)
  const [recent, setRecent] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const [s, c] = await Promise.all([
          apiRequest<AdminStats>('/api/admin/stats'),
          apiRequest<{ claims: Claim[] }>('/api/admin/claims?limit=5'),
        ])
        if (!active) return
        setStatsState(s)
        setStats(s)
        setRecent(c.claims)
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
  }, [setStats])

  if (loading || !stats) {
    return <LoadingState label="Loading admin dashboard…" />
  }

  return (
    <div className="space-y-6 animate-screen-in">
      {/* Admin header */}
      <Card className="bg-primary text-primary-foreground border-0 shadow-lg">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-foreground/15">
              <Shield className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-primary-foreground/80">Administrator</p>
              <p className="text-lg font-bold truncate">{user?.name}</p>
              <p className="text-xs text-primary-foreground/80">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Total Agents"
          value={stats.totalAgents}
          icon={Users}
          tone="primary"
          subtitle={`${stats.activeAgents} active`}
        />
        <StatCard
          label="Total Claims"
          value={stats.totalClaims}
          icon={ClipboardList}
          tone="blue"
        />
        <StatCard
          label="Pending"
          value={stats.pendingClaims}
          icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Commission Paid"
          value={formatCurrency(stats.totalCommissionPaid)}
          icon={DollarSign}
          tone="green"
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Approved" value={stats.approvedClaims} tone="green" />
        <StatCard label="Paid" value={stats.paidClaims} tone="blue" />
        <StatCard label="Rejected" value={stats.rejectedClaims} tone="red" />
        <StatCard
          label="Student Fees"
          value={formatCurrency(stats.totalStudentFees)}
          icon={Receipt}
          tone="amber"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button size="lg" className="h-14 text-base" onClick={() => navigate('admin-claims')}>
          <ListChecks className="h-5 w-5" />
          View All Claims
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-14 text-base"
          onClick={() => navigate('admin-agents')}
        >
          <UserCog className="h-5 w-5" />
          Manage Agents
        </Button>
      </div>

      <Button
        variant="outline"
        className="w-full h-11 justify-start"
        onClick={() => navigate('admin-subjects')}
      >
        <BookOpen className="h-4 w-4" />
        Manage Subjects & Pricing
      </Button>

      {/* Recent activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-primary" />
              Recent Activity
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => navigate('admin-claims')}
            >
              View all
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div className="px-5 pb-5 pt-1 text-sm text-muted-foreground text-center">
              No claims submitted yet.
            </div>
          ) : (
            <ul className="divide-y">
              {recent.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => {
                      useAppStore.getState().openClaim(c.id)
                    }}
                    className="w-full flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {c.claimId}
                        </span>
                        <StatusBadge status={c.status} />
                      </div>
                      <p className="font-medium truncate mt-0.5">
                        {c.studentName} · {c.studentGrade}
                        {c.subjectCount > 0 && ` · ${c.subjectCount} subj.`}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.agentName} · {formatDate(c.createdAt)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">
                        {formatCurrency(c.commissionAmount)}
                      </p>
                      {c.totalStudentFee > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          Fee: {formatCurrency(c.totalStudentFee)}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

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
    </div>
  )
}
