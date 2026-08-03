'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  BookOpen,
  GripVertical,
  Check,
  X,
  Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LoadingState, EmptyState } from './common'
import { useAppStore } from '@/lib/store'
import { apiRequest } from '@/lib/api-client'
import { formatCurrency } from '@/lib/format'
import type { SubjectItem } from '@/lib/types'

interface SubjectWithPrices extends SubjectItem {
  commissionAt15?: number
}

export function AdminSubjects() {
  const navigate = useAppStore((s) => s.navigate)
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Add/edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SubjectItem | null>(null)
  const [formName, setFormName] = useState('')
  const [formPrice, setFormPrice] = useState('100')
  const [formError, setFormError] = useState('')

  // Delete confirm dialog
  const [deleteTarget, setDeleteTarget] = useState<SubjectItem | null>(null)

  const loadSubjects = async () => {
    setLoading(true)
    try {
      const data = await apiRequest<{ subjects: SubjectItem[] }>(
        '/api/admin/subjects?include_inactive=true'
      )
      setSubjects(data.subjects)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load subjects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubjects()
  }, [])

  const openAdd = () => {
    setEditing(null)
    setFormName('')
    setFormPrice('100')
    setFormError('')
    setDialogOpen(true)
  }

  const openEdit = (subject: SubjectItem) => {
    setEditing(subject)
    setFormName(subject.name)
    setFormPrice(String(subject.price))
    setFormError('')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const name = formName.trim()
    const price = parseFloat(formPrice)

    if (!name) { setFormError('Subject name is required'); return }
    if (name.length > 100) { setFormError('Name is too long (max 100 chars)'); return }
    if (isNaN(price) || price < 0) { setFormError('Enter a valid price'); return }

    setSaving(true)
    try {
      if (editing) {
        await apiRequest(`/api/admin/subjects/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name, price }),
        })
        toast.success(`Subject "${name}" updated`)
      } else {
        await apiRequest('/api/admin/subjects', {
          method: 'POST',
          body: JSON.stringify({ name, price }),
        })
        toast.success(`Subject "${name}" added`)
      }
      setDialogOpen(false)
      loadSubjects()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save subject'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await apiRequest(`/api/admin/subjects/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      toast.success(`Subject "${deleteTarget.name}" deactivated`)
      setDeleteTarget(null)
      loadSubjects()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to deactivate subject')
    } finally {
      setSaving(false)
    }
  }

  const handleReactivate = async (subject: SubjectItem) => {
    try {
      await apiRequest(`/api/admin/subjects/${subject.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: true }),
      })
      toast.success(`Subject "${subject.name}" reactivated`)
      loadSubjects()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reactivate')
    }
  }

  const activeSubjects = subjects.filter((s) => s.isActive)
  const inactiveSubjects = subjects.filter((s) => !s.isActive)

  if (loading) {
    return <LoadingState label="Loading subjects…" />
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
        <h1 className="text-lg font-bold">Manage Subjects</h1>
      </div>

      {/* Summary card */}
      <Card className="bg-muted/50">
        <CardContent className="p-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            <BookOpen className="inline h-4 w-4 mr-1.5" />
            {activeSubjects.length} active{inactiveSubjects.length > 0 && ` · ${inactiveSubjects.length} inactive`}
          </span>
          <span className="text-xs text-muted-foreground">
            Each subject can have its own price
          </span>
        </CardContent>
      </Card>

      {/* Active subjects list */}
      {activeSubjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No subjects yet"
          description="Add your first subject to get started."
          action={
            <Button onClick={openAdd} size="sm">
              <Plus className="h-4 w-4" />
              Add Subject
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {activeSubjects.map((s) => (
            <Card key={s.id} className="overflow-hidden">
              <CardContent className="p-4 flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    15% agent commission: {formatCurrency(s.price * 0.15)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">{formatCurrency(s.price)}</p>
                  <p className="text-[10px] text-muted-foreground">per subject</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(s)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                    onClick={() => setDeleteTarget(s)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Inactive subjects */}
      {inactiveSubjects.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Inactive Subjects ({inactiveSubjects.length})
          </h2>
          <div className="space-y-2">
            {inactiveSubjects.map((s) => (
              <Card key={s.id} className="opacity-60">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium line-through">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Was {formatCurrency(s.price)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleReactivate(s)}
                  >
                    Reactivate
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add button */}
      <Button className="w-full h-12" onClick={openAdd}>
        <Plus className="h-5 w-5" />
        Add New Subject
      </Button>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit "${editing.name}"` : 'Add New Subject'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Change the name or price of this subject.'
                : 'Add a new subject that agents can select when claiming students.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="subj-name">Subject Name</Label>
              <Input
                id="subj-name"
                value={formName}
                onChange={(e) => { setFormName(e.target.value); setFormError('') }}
                placeholder="e.g. Mathematics"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subj-price">Price per Subject (Loti)</Label>
              <Input
                id="subj-price"
                type="number"
                step="0.01"
                min="0"
                value={formPrice}
                onChange={(e) => { setFormPrice(e.target.value); setFormError('') }}
                placeholder="100"
                className="h-11"
              />
              {formPrice && !isNaN(parseFloat(formPrice)) && parseFloat(formPrice) > 0 && (
                <p className="text-xs text-muted-foreground">
                  15% commission: {formatCurrency(parseFloat(formPrice) * 0.15)}
                </p>
              )}
            </div>
            {formError && (
              <p className="text-xs text-red-500">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              ) : (
                <><Save className="h-4 w-4" /> {editing ? 'Update' : 'Add Subject'}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Deactivate Subject</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate &ldquo;{deleteTarget?.name}&rdquo;?
              This will hide it from the claim form. Existing claims that
              include this subject will still display it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Removing…</>
              ) : (
                <><Trash2 className="h-4 w-4" /> Deactivate</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
