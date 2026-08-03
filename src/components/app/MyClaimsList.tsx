'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Plus,
  Search,
  Inbox,
  ClipboardList,
  Loader2,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge, LoadingState, EmptyState } from './common'
import { useAppStore } from '@/lib/store'
import { apiRequest } from '@/lib/api-client'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Claim, ClaimStatus } from '@/lib/types'

type FilterValue = 'All' | ClaimStatus

export function MyClaimsList() {
  const user = useAppStore((s) => s.user)
  const navigate = useAppStore((s) => s.navigate)
  const openClaim = useAppStore((s) => s.openClaim)
  const cachedClaims = useAppStore((s) => s.myClaims)
  const setMyClaims = useAppStore((s) => s.setMyClaims)

  const [claims, setClaims] = useState<Claim[]>(cachedClaims)
  const [loading, setLoading] = useState(cachedClaims.length === 0)
  const [filter, setFilter] = useState<FilterValue>('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const data = await apiRequest<{ claims: Claim[]; total: number }>(
          '/api/claims?limit=200'
        )
        if (!active) return
        setClaims(data.claims)
        setMyClaims(data.claims, data.total)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load claims'
        toast.error(msg)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [setMyClaims])

  const filtered = useMemo(() => {
    let list = claims
    if (filter !== 'All') {
      list = list.filter((c) => c.status === filter)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (c) =>
          c.parentFullName.toLowerCase().includes(q) ||
          c.studentName.toLowerCase().includes(q) ||
          c.claimId.toLowerCase().includes(q)
      )
    }
    return list
  }, [claims, filter, search])

  if (loading) {
    return <LoadingState label="Loading your claims…" />
  }

  return (
    <div className="space-y-4 animate-screen-in">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => navigate(user?.role === 'admin' ? 'admin-dashboard' : 'agent-dashboard')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">My Claims</h1>
        </div>
        <Button size="sm" className="h-9" onClick={() => navigate('new-claim')}>
          <Plus className="h-4 w-4" />
          New
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by parent, student, or claim ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Select
          value={filter}
          onValueChange={(v) => setFilter(v as FilterValue)}
        >
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {claims.length} claim{claims.length === 1 ? '' : 's'}
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={claims.length === 0 ? Inbox : ClipboardList}
          title={claims.length === 0 ? 'No claims yet' : 'No matching claims'}
          description={
            claims.length === 0
              ? 'Submit your first student referral to start earning commissions.'
              : 'Try adjusting your filters or search.'
          }
          action={
            claims.length === 0 ? (
              <Button onClick={() => navigate('new-claim')}>
                <Plus className="h-4 w-4" />
                Claim a Student
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <button
                onClick={() => openClaim(c.id)}
                className="w-full text-left hover:bg-muted/40 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-muted-foreground">
                          {c.claimId}
                        </span>
                        <StatusBadge status={c.status} />
                      </div>
                      <p className="font-semibold truncate">{c.studentName}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {c.studentGrade} · Parent: {c.parentFullName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(c.createdAt)}
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
                    </div>
                  </div>
                </CardContent>
              </button>
            </Card>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating…
        </div>
      )}
    </div>
  )
}
