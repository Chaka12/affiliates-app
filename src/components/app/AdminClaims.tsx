'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Filter,
  Inbox,
  Save,
  Loader2,
  Calendar,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusBadge, LoadingState, EmptyState } from './common'
import { useAppStore } from '@/lib/store'
import { apiRequest } from '@/lib/api-client'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Claim, AgentListItem, ClaimStatus } from '@/lib/types'
import { CLAIM_STATUSES, VALID_PAYMENT_METHODS } from '@/lib/types'

export function AdminClaims() {
  const navigate = useAppStore((s) => s.navigate)
  const openClaim = useAppStore((s) => s.openClaim)
  const setAdminClaims = useAppStore((s) => s.setAdminClaims)

  const [claims, setClaims] = useState<Claim[]>([])
  const [total, setTotal] = useState(0)
  const [agents, setAgents] = useState<AgentListItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [agentFilter, setAgentFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Edit modal
  const [editing, setEditing] = useState<Claim | null>(null)
  const [editForm, setEditForm] = useState<{
    status: ClaimStatus
    startDate: string
    paymentMethod: string
    datePaid: string
    commissionAmount: string
    adminNotes: string
  } | null>(null)
  const [saving, setSaving] = useState(false)

  const loadClaims = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '500' })
      if (agentFilter !== 'all') params.set('agent_id', agentFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      const data = await apiRequest<{ claims: Claim[]; total: number }>(
        `/api/admin/claims?${params.toString()}`
      )
      setClaims(data.claims)
      setTotal(data.total)
      setAdminClaims(data.claims, data.total)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load claims')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClaims()
  }, [agentFilter, statusFilter, dateFrom, dateTo])

  useEffect(() => {
    ;(async () => {
      try {
        const data = await apiRequest<{ agents: AgentListItem[] }>('/api/admin/agents')
        setAgents(data.agents)
      } catch {
        // non-fatal
      }
    })()
  }, [])

  const totalCommission = useMemo(
    () => claims.reduce((s, c) => s + c.commissionAmount, 0),
    [claims]
  )
  const totalFees = useMemo(
    () => claims.reduce((s, c) => s + c.totalStudentFee, 0),
    [claims]
  )

  const openEdit = (claim: Claim) => {
    setEditing(claim)
    setEditForm({
      status: claim.status,
      startDate: claim.startDate || '',
      paymentMethod: claim.paymentMethod || '',
      datePaid: claim.datePaid || '',
      commissionAmount: String(claim.commissionAmount),
      adminNotes: claim.adminNotes || '',
    })
  }

  const handleSave = async () => {
    if (!editing || !editForm) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        status: editForm.status,
        adminNotes: editForm.adminNotes,
        commissionAmount: Number(editForm.commissionAmount),
      }
      if (editForm.startDate) body.startDate = editForm.startDate
      else body.startDate = null
      if (editForm.paymentMethod) body.paymentMethod = editForm.paymentMethod
      else body.paymentMethod = null
      if (editForm.datePaid) body.datePaid = editForm.datePaid
      else body.datePaid = null

      const updated = await apiRequest<Claim>(
        `/api/claims/${editing.id}/status`,
        {
          method: 'PUT',
          body: JSON.stringify(body),
        }
      )
      toast.success(`Claim ${editing.claimId} updated`)
      // Update local list
      setClaims((prev) =>
        prev.map((c) => (c.id === editing.id ? { ...c, ...updated } : c))
      )
      setEditing(null)
      setEditForm(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update claim')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 animate-screen-in">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => navigate('admin-dashboard')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">All Claims</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filters
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Agent</Label>
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="All agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All agents</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.fullName} ({a.agentId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {CLAIM_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-10"
              />
            </div>
          </div>
          {(agentFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setAgentFilter('all')
                setStatusFilter('all')
                setDateFrom('')
                setDateTo('')
              }}
            >
              Clear filters
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center justify-between rounded-lg bg-muted p-3">
          <span className="text-muted-foreground">Total Fees</span>
          <span className="font-medium">{formatCurrency(totalFees)}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-muted p-3">
          <span className="text-muted-foreground">Total Commission</span>
          <span className="font-medium text-emerald-600">{formatCurrency(totalCommission)}</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {claims.length} claim{claims.length === 1 ? '' : 's'}
        {total !== claims.length && ` of ${total}`}
      </p>

      {/* List */}
      {loading ? (
        <LoadingState label="Loading claims…" />
      ) : claims.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No claims found"
          description="No claims match your current filters. Try adjusting them."
        />
      ) : (
        <div className="space-y-2">
          {claims.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <button
                onClick={() => openEdit(c)}
                className="w-full text-left hover:bg-muted/40 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">
                          {c.claimId}
                        </span>
                        <StatusBadge status={c.status} />
                      </div>
                      <p className="font-semibold truncate">{c.studentName}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {c.studentGrade} · {c.parentFullName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        Agent: {c.agentName} · {formatDate(c.createdAt)}
                        {c.subjectCount > 0 && (
                          <span className="ml-1.5 inline-flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {c.subjectCount} subject{c.subjectCount === 1 ? '' : 's'}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-emerald-600">
                        {formatCurrency(c.commissionAmount)}
                      </p>
                      {c.totalStudentFee > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          Fee: {formatCurrency(c.totalStudentFee)}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">Tap to edit</p>
                    </div>
                  </div>
                </CardContent>
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* Edit modal */}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null)
            setEditForm(null)
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Edit Claim
              {editing && (
                <span className="font-mono text-sm text-muted-foreground">
                  {editing.claimId}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Update status, dates, and payment information. The 30-day checkpoint is
              auto-calculated when a start date is set.
            </DialogDescription>
          </DialogHeader>

          {editing && editForm && (
            <div className="space-y-4 py-2">
              {/* Read-only summary */}
              <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student</span>
                  <span className="font-medium">
                    {editing.studentName} ({editing.studentGrade})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parent</span>
                  <span className="font-medium">{editing.parentFullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agent</span>
                  <span className="font-medium">{editing.agentName}</span>
                </div>
                {editing.subjectCount > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subjects</span>
                      <span className="font-medium">{editing.subjectCount} selected</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Student Fee</span>
                      <span className="font-medium">{formatCurrency(editing.totalStudentFee)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Subjects chips (read-only in edit modal) */}
              {editing.subjects && (
                <div>
                  <Label className="text-xs text-muted-foreground">Enrolled Subjects</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {editing.subjects.split(',').filter(Boolean).map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v) =>
                    setEditForm((f) => (f ? { ...f, status: v as ClaimStatus } : f))
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLAIM_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) =>
                      setEditForm((f) => (f ? { ...f, startDate: e.target.value } : f))
                    }
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date Paid</Label>
                  <Input
                    type="date"
                    value={editForm.datePaid}
                    onChange={(e) =>
                      setEditForm((f) => (f ? { ...f, datePaid: e.target.value } : f))
                    }
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={editForm.paymentMethod}
                  onValueChange={(v) =>
                    setEditForm((f) => (f ? { ...f, paymentMethod: v } : f))
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {VALID_PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Commission Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.commissionAmount}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f ? { ...f, commissionAmount: e.target.value } : f
                    )
                  }
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  rows={3}
                  value={editForm.adminNotes}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f ? { ...f, adminNotes: e.target.value } : f
                    )
                  }
                  placeholder="Internal notes about this claim…"
                />
              </div>

              {/* Computed checkpoint preview */}
              {editForm.startDate && (
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 text-sm">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-700 dark:text-blue-300">
                    30-day checkpoint will be{' '}
                    <strong>
                      {formatDate(
                        new Date(
                          new Date(editForm.startDate + 'T00:00:00').getTime() +
                            30 * 24 * 60 * 60 * 1000
                        )
                          .toISOString()
                          .slice(0, 10)
                      )}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(null)
                setEditForm(null)
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Also allow opening detail view */}
      {editing && (
        <Button
          variant="link"
          className="w-full text-xs"
          onClick={() => openClaim(editing.id)}
        >
          View full claim details
        </Button>
      )}
    </div>
  )
}