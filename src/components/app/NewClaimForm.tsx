'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, CheckCircle2, GraduationCap, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/lib/store'
import { apiRequest } from '@/lib/api-client'
import { formatCurrency } from '@/lib/format'
import { VALID_GRADES } from '@/lib/types'
import type { AgentProfile, SubjectItem } from '@/lib/types'

interface ClaimSubmitResponse {
  claimId: string
  status: string
  subjects: string
  subjectCount: number
  totalStudentFee: number
  commissionAmount: number
  message: string
}

export function NewClaimForm() {
  const user = useAppStore((s) => s.user)
  const navigate = useAppStore((s) => s.navigate)

  const [form, setForm] = useState({
    parentFullName: '',
    parentPhone: '',
    parentEmail: '',
    studentName: '',
    studentGrade: '',
    studentSchool: '',
    notes: '',
  })
  const [availableSubjects, setAvailableSubjects] = useState<SubjectItem[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [subjectsLoading, setSubjectsLoading] = useState(true)
  const [success, setSuccess] = useState<{
    claimId: string
    amount: number
    totalFee: number
    subjectCount: number
    subjects: string
  } | null>(null)
  const [profile, setProfile] = useState<AgentProfile | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const data = await apiRequest<{ subjects: SubjectItem[] }>('/api/subjects')
        if (active) {
          setAvailableSubjects(data.subjects)
          setSubjectsLoading(false)
        }
      } catch {
        if (active) setSubjectsLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const p = await apiRequest<AgentProfile>('/api/agents/me')
        if (active) setProfile(p)
      } catch { /* non-fatal */ }
    })()
    return () => { active = false }
  }, [])

  const commissionRate = user?.commissionRate ?? 15
  const priceMap = new Map(availableSubjects.map((s) => [s.name, s.price]))
  const totalStudentFee = selectedSubjects.reduce((sum, name) => sum + (priceMap.get(name) ?? 0), 0)
  const estimatedCommission = Math.round(totalStudentFee * (commissionRate / 100) * 100) / 100

  const toggleSubject = (name: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    )
    setErrors((e) => ({ ...e, subjects: '' }))
  }

  const set = (field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: '' }))
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.parentFullName.trim()) e.parentFullName = 'Parent full name is required'
    if (!form.parentPhone.trim()) e.parentPhone = 'Parent phone is required'
    else if (!/^[0-9+\-\s()]{7,20}$/.test(form.parentPhone.trim()))
      e.parentPhone = 'Invalid phone number'
    if (form.parentEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.parentEmail.trim()))
      e.parentEmail = 'Invalid email format'
    if (!form.studentName.trim()) e.studentName = 'Student name is required'
    if (!form.studentGrade) e.studentGrade = 'Please select a grade'
    if (selectedSubjects.length === 0) e.subjects = 'Select at least one subject'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault()
    if (!validate()) { toast.error('Please fix the errors before submitting'); return }
    setLoading(true)
    try {
      const res = await apiRequest<ClaimSubmitResponse>('/api/claims', {
        method: 'POST',
        body: JSON.stringify({
          parentFullName: form.parentFullName.trim(),
          parentPhone: form.parentPhone.trim(),
          parentEmail: form.parentEmail.trim() || undefined,
          studentName: form.studentName.trim(),
          studentGrade: form.studentGrade,
          studentSchool: form.studentSchool.trim() || undefined,
          subjects: selectedSubjects,
          notes: form.notes.trim() || undefined,
        }),
      })
      setSuccess({
        claimId: res.claimId,
        amount: res.commissionAmount,
        totalFee: res.totalStudentFee,
        subjectCount: res.subjectCount,
        subjects: res.subjects,
      })
      toast.success(`Claim ${res.claimId} submitted!`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit claim')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-6 animate-screen-in">
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30">
          <CardContent className="p-6 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Claim Submitted!</h2>
              <p className="text-sm text-muted-foreground mt-1">Your referral has been recorded and is now pending review.</p>
            </div>
            <div className="rounded-lg bg-background p-4 space-y-2 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Claim ID</span>
                <span className="font-bold font-mono">{success.claimId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subjects</span>
                <span className="font-medium">{success.subjectCount} selected</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Student Fee</span>
                <span className="font-bold">{formatCurrency(success.totalFee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your Commission</span>
                <span className="font-bold text-emerald-600">{formatCurrency(success.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">Pending</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-12" onClick={() => {
            setSuccess(null)
            setForm({ parentFullName: '', parentPhone: '', parentEmail: '', studentName: '', studentGrade: '', studentSchool: '', notes: '' })
            setSelectedSubjects([])
          }}>
            <GraduationCap className="h-4.5 w-4.5" /> New Claim
          </Button>
          <Button className="h-12" onClick={() => navigate('my-claims')}>View My Claims</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-screen-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate('agent-dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Claim a Student</h1>
      </div>

      <Card className="bg-muted/50">
        <CardContent className="p-3 text-xs space-y-1">
          <p><span className="text-muted-foreground">Agent:</span> <span className="font-medium">{user?.name}</span> ({user?.agentId})</p>
          <p><span className="text-muted-foreground">Commission rate:</span> <span className="font-bold">{commissionRate}%</span></p>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Parent / Guardian Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="parentFullName">Parent Full Name <span className="text-red-500">*</span></Label>
              <Input id="parentFullName" value={form.parentFullName} onChange={(e) => set('parentFullName', e.target.value)} disabled={loading} placeholder="Jane Doe" className="h-11" />
              {errors.parentFullName && <p className="text-xs text-red-500">{errors.parentFullName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentPhone">Parent Phone <span className="text-red-500">*</span></Label>
              <Input id="parentPhone" type="tel" value={form.parentPhone} onChange={(e) => set('parentPhone', e.target.value)} disabled={loading} placeholder="+266 77 123 4567" className="h-11" />
              {errors.parentPhone && <p className="text-xs text-red-500">{errors.parentPhone}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentEmail">Parent Email (optional)</Label>
              <Input id="parentEmail" type="email" value={form.parentEmail} onChange={(e) => set('parentEmail', e.target.value)} disabled={loading} placeholder="parent@example.com" className="h-11" />
              {errors.parentEmail && <p className="text-xs text-red-500">{errors.parentEmail}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Student Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="studentName">Student Name <span className="text-red-500">*</span></Label>
              <Input id="studentName" value={form.studentName} onChange={(e) => set('studentName', e.target.value)} disabled={loading} placeholder="John Doe" className="h-11" />
              {errors.studentName && <p className="text-xs text-red-500">{errors.studentName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentGrade">Student Grade <span className="text-red-500">*</span></Label>
              <Select value={form.studentGrade} onValueChange={(v) => set('studentGrade', v)} disabled={loading}>
                <SelectTrigger id="studentGrade" className="h-11"><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>{VALID_GRADES.map((g) => (<SelectItem key={g} value={g}>{g}</SelectItem>))}</SelectContent>
              </Select>
              {errors.studentGrade && <p className="text-xs text-red-500">{errors.studentGrade}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentSchool">Student School (optional)</Label>
              <Input id="studentSchool" value={form.studentSchool} onChange={(e) => set('studentSchool', e.target.value)} disabled={loading} placeholder="Current school name" className="h-11" />
            </div>
          </CardContent>
        </Card>

        {/* Subjects */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4.5 w-4.5 text-primary" />
              Subjects <span className="text-red-500">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subjectsLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading subjects…
              </div>
            ) : availableSubjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No subjects available. Contact the administrator.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableSubjects.map((subject) => {
                  const sel = selectedSubjects.includes(subject.name)
                  return (
                    <button
                      key={subject.id}
                      type="button"
                      disabled={loading}
                      onClick={() => toggleSubject(subject.name)}
                      className={[
                        'flex items-center gap-2.5 rounded-lg border p-3 text-left text-sm transition-colors',
                        sel ? 'border-primary bg-primary/5 text-primary' : 'border-muted hover:border-primary/40 hover:bg-muted/50',
                        'disabled:opacity-50',
                      ].join(' ')}
                    >
                      <div className={[
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
                        sel ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30',
                      ].join(' ')}
                      >
                        {sel && <span className="text-xs font-bold leading-none">✓</span>}
                      </div>
                      <span className={sel ? 'font-medium flex-1' : 'flex-1'}>{subject.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{formatCurrency(subject.price)}</span>
                    </button>
                  )
                })}
              </div>
            )}
            {errors.subjects && <p className="text-xs text-red-500">{errors.subjects}</p>}
            {selectedSubjects.length > 0 && (
              <div className="rounded-lg bg-muted p-3 space-y-2 text-sm">
                {selectedSubjects.map((name) => (
                  <div key={name} className="flex justify-between">
                    <span className="text-muted-foreground">{name}</span>
                    <span>{formatCurrency(priceMap.get(name) ?? 0)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Total ({selectedSubjects.length} subject{selectedSubjects.length === 1 ? '' : 's'})</span>
                  <span>{formatCurrency(totalStudentFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your commission ({commissionRate}%)</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(estimatedCommission)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Additional Notes</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} disabled={loading} placeholder="Preferred session times, subjects of concern, etc." rows={4} />
          </CardContent>
        </Card>

        <div className="sticky bottom-0 bg-background/95 backdrop-blur pt-2 pb-1 -mx-4 px-4 border-t">
          <Button type="submit" className="w-full h-12 text-base" disabled={loading || selectedSubjects.length === 0}>
            {loading ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Submitting…</>
            ) : (
              <><Save className="h-5 w-5" /> Submit Claim{selectedSubjects.length > 0 ? ` (${formatCurrency(estimatedCommission)} commission)` : ''}</>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
