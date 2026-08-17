'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft,
  UserPlus,
  Pencil,
  Users,
  Mail,
  Phone,
  Copy,
  Check,
  Loader2,
  Save,
  BadgeCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { LoadingState, EmptyState } from './common'
import { useAppStore } from '@/lib/store'
import { apiRequest } from '@/lib/api-client'
import { formatDate } from '@/lib/format'
import type { AgentListItem } from '@/lib/types'

interface NewAgentResponse extends AgentListItem {
  pin: string
  message: string
}

export function AdminAgents() {
  const navigate = useAppStore((s) => s.navigate)
  const [agents, setAgents] = useState<AgentListItem[]>([])
  const [loading, setLoading] = useState(true)

  // Add-agent modal
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    commissionRate: '15',
  })
  const [addErrors, setAddErrors] = useState<Record<string, string>>({})
  const [adding, setAdding] = useState(false)
  const [createdPin, setCreatedPin] = useState<{ agent: AgentListItem; pin: string } | null>(null)

  // Edit modal
  const [editing, setEditing] = useState<AgentListItem | null>(null)
  const [editForm, setEditForm] = useState<{ commissionRate: string; status: string; phone: string } | null>(null)
  const [saving, setSaving] = useState(false)

  // PIN copy confirmation
  const [copied, setCopied] = useState(false)

  const loadAgents = async () => {
    setLoading(true)
    try {
      const data = await apiRequest<{ agents: AgentListItem[] }>('/api/admin/agents')
      setAgents(data.agents)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAgents()
  }, [])

  const validateAdd = () => {
    const e: Record<string, string> = {}
    if (!addForm.fullName.trim()) e.fullName = 'Full name is required'
    if (!addForm.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email.trim()))
      e.email = 'Invalid email format'
    if (!addForm.phone.trim()) e.phone = 'Phone is required'
    else if (!/^[0-9+\-\s()]{7,20}$/.test(addForm.phone.trim()))
      e.phone = 'Invalid phone number'
    const rate = Number(addForm.commissionRate)
    if (isNaN(rate) || rate < 0 || rate > 100)
      e.commissionRate = 'Must be between 0 and 100'
    setAddErrors(e)
    return Object.keys(e).length === 0
  }

  const handleAdd = async () => {
    if (!validateAdd()) return
    setAdding(true)
    try {
      const res = await apiRequest<NewAgentResponse>('/api/admin/agents', {
        method: 'POST',
        body: JSON.stringify({
          fullName: addForm.fullName.trim(),
          email: addForm.email.trim().toLowerCase(),
          phone: addForm.phone.trim(),
          commissionRate: Number(addForm.commissionRate),
        }),
      })
      toast.success(`Agent ${res.agentId} created`)
      await loadAgents()
      setCreatedPin({ agent: res, pin: res.pin })
      setShowAdd(false)
      setAddForm({ fullName: '', email: '', phone: '', commissionRate: '15' })
      setAddErrors({})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create agent')
    } finally {
      setAdding(false)
    }
  }

  const openEdit = (agent: AgentListItem) => {
    setEditing(agent)
    setEditForm({
      commissionRate: String(agent.commissionRate),
      status: agent.status,
      phone: agent.phone,
    })
  }

  const handleSave = async () => {
    if (!editing || !editForm) return
    setSaving(true)
    try {
      await apiRequest(`/api/admin/agents/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          commissionRate: Number(editForm.commissionRate),
          status: editForm.status,
          phone: editForm.phone,
        }),
      })
      toast.success(`${editing.fullName} updated`)
      await loadAgents()
      setEditing(null)
      setEditForm(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update agent')
    } finally {
      setSaving(false)
    }
  }

  const copyPin = () => {
    if (!createdPin) return
    navigator.clipboard?.writeText(createdPin.pin)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4 animate-screen-in">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => navigate('admin-dashboard')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Manage Agents</h1>
        </div>
        <Button size="sm" className="h-9" onClick={() => setShowAdd(true)}>
          <UserPlus className="h-4 w-4" />
          Add Agent
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {agents.length} agent{agents.length === 1 ? '' : 's'} ·{' '}
        {agents.filter((a) => a.status === 'Active').length} active · Max 50
      </p>

      {/* Agents list */}
      {loading ? (
        <LoadingState label="Loading agents…" />
      ) : agents.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No agents yet"
          description="Add your first agent to get started."
          action={
            <Button onClick={() => setShowAdd(true)}>
              <UserPlus className="h-4 w-4" />
              Add Agent
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {agents.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs text-muted-foreground">
                        {a.agentId}
                      </span>
                      {a.role === 'admin' && (
                        <Badge variant="secondary" className="text-[10px] h-5 gap-1">
                          <BadgeCheck className="h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={
                          a.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px] h-5'
                            : 'bg-red-100 text-red-700 border-red-300 text-[10px] h-5'
                        }
                      >
                        {a.status}
                      </Badge>
                    </div>
                    <p className="font-semibold truncate">{a.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {a.email}
                    </p>
                    {a.phone && (
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {a.phone}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Commission: <span className="font-medium text-foreground">{a.commissionRate}%</span>
                      {' · '}Joined {formatDate(a.createdAt)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => openEdit(a)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add agent modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add New Agent
            </DialogTitle>
            <DialogDescription>
              A random 4-digit PIN will be generated and shown once. Share it securely with
              the agent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name <span className="text-red-500">*</span></Label>
              <Input
                value={addForm.fullName}
                onChange={(e) => {
                  setAddForm((f) => ({ ...f, fullName: e.target.value }))
                  setAddErrors((er) => ({ ...er, fullName: '' }))
                }}
                className="h-10"
                placeholder="Jane Doe"
              />
              {addErrors.fullName && <p className="text-xs text-red-500">{addErrors.fullName}</p>}
            </div>
            <div className="space-y-2">
              <Label>Email <span className="text-red-500">*</span></Label>
              <Input
                type="email"
                value={addForm.email}
                onChange={(e) => {
                  setAddForm((f) => ({ ...f, email: e.target.value }))
                  setAddErrors((er) => ({ ...er, email: '' }))
                }}
                className="h-10"
                placeholder="jane@example.com"
              />
              {addErrors.email && <p className="text-xs text-red-500">{addErrors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label>Phone <span className="text-red-500">*</span></Label>
              <Input
                type="tel"
                value={addForm.phone}
                onChange={(e) => {
                  setAddForm((f) => ({ ...f, phone: e.target.value }))
                  setAddErrors((er) => ({ ...er, phone: '' }))
                }}
                className="h-10"
                placeholder="+263 77 123 4567"
              />
              {addErrors.phone && <p className="text-xs text-red-500">{addErrors.phone}</p>}
            </div>
            <div className="space-y-2">
              <Label>Commission Rate (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={addForm.commissionRate}
                onChange={(e) => setAddForm((f) => ({ ...f, commissionRate: e.target.value }))}
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                Default 15%. Commission per student = 1000 × rate%.
              </p>
              {addErrors.commissionRate && (
                <p className="text-xs text-red-500">{addErrors.commissionRate}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)} disabled={adding}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={adding}>
              {adding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create Agent
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit agent modal */}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null)
            setEditForm(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Agent
            </DialogTitle>
            <DialogDescription>
              {editing && (
                <span>
                  {editing.fullName} · <span className="font-mono">{editing.agentId}</span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {editForm && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Commission Rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={editForm.commissionRate}
                  onChange={(e) =>
                    setEditForm((f) => (f ? { ...f, commissionRate: e.target.value } : f))
                  }
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v) =>
                    setEditForm((f) => (f ? { ...f, status: v } : f))
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Inactive agents cannot log in.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((f) => (f ? { ...f, phone: e.target.value } : f))
                  }
                  className="h-10"
                />
              </div>
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

      {/* One-time PIN reveal */}
      <AlertDialog open={!!createdPin} onOpenChange={(open) => !open && setCreatedPin(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-emerald-600" />
              Agent Created — Save This PIN
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  <strong>{createdPin?.agent.fullName}</strong> ({createdPin?.agent.agentId})
                  has been created. Share this 4-digit PIN with the agent so they can log in.
                  It will <strong>not</strong> be shown again.
                </p>
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Agent PIN
                  </p>
                  <p className="text-4xl font-bold font-mono tracking-[0.3em] text-primary">
                    {createdPin?.pin}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-200">
                  <p>
                    <strong>Important:</strong> This PIN is shown only once. If lost, the
                    admin must delete and recreate the agent, or reset it server-side.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={copyPin}>
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy PIN
                </>
              )}
            </Button>
            <AlertDialogAction onClick={() => setCreatedPin(null)}>Done</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
