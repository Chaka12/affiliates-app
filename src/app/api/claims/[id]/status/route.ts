import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { sanitizeText, addThirtyDays, validateSubjects, getActiveSubjects, calculateTotalFeeFromSubjects, calculateCommissionFromTotal } from '@/lib/auth'
import {
  ok,
  fail,
  VALID_STATUSES,
  VALID_PAYMENT_METHODS,
  isValidDate,
} from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/claims/:id/status  (admin only)
 * Body: {
 *   status, adminNotes?, startDate?, paymentMethod?, datePaid?,
 *   commissionAmount?, subjects?
 * }
 * If subjects are updated, recalculates totalStudentFee and commissionAmount
 * using each subject's individual price from the Subject table.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) return fail('Unauthorized — admin access required', 401)

  const { id } = await params
  const numericId = parseInt(id, 10)
  if (isNaN(numericId)) return fail('Invalid claim id', 400)

  const existing = await db.claim.findUnique({ where: { id: numericId } })
  if (!existing) return fail('Claim not found', 404)

  const body = await request.json().catch(() => ({}))

  const data: Record<string, unknown> = {}

  if (body.status !== undefined) {
    const status = sanitizeText(body.status)
    if (!VALID_STATUSES.includes(status)) {
      return fail('Invalid status', 400)
    }
    data.status = status
  }

  if (body.adminNotes !== undefined) {
    data.adminNotes = sanitizeText(body.adminNotes) || null
  }

  if (body.startDate !== undefined) {
    const startDate = sanitizeText(body.startDate) || null
    if (startDate && !isValidDate(startDate)) {
      return fail('Invalid start date format (use YYYY-MM-DD)', 400)
    }
    data.startDate = startDate
    data.thirtyDayCheckpoint = startDate ? addThirtyDays(startDate) : null
  }

  if (body.paymentMethod !== undefined) {
    const pm = sanitizeText(body.paymentMethod) || null
    if (pm && !VALID_PAYMENT_METHODS.includes(pm)) {
      return fail('Invalid payment method', 400)
    }
    data.paymentMethod = pm
  }

  if (body.datePaid !== undefined) {
    const datePaid = sanitizeText(body.datePaid) || null
    if (datePaid && !isValidDate(datePaid)) {
      return fail('Invalid date_paid format (use YYYY-MM-DD)', 400)
    }
    data.datePaid = datePaid
  }

  // Handle subjects update — recalculates fee and commission per-subject
  if (body.subjects !== undefined) {
    const subjectNames = await validateSubjects(body.subjects)
    if (!subjectNames) {
      return fail('Invalid subjects.', 400)
    }
    const activeSubjects = await getActiveSubjects()
    const priceMap = new Map(activeSubjects.map((s) => [s.name, s.price]))
    const selectedPrices = subjectNames.map((name) => ({ name, price: priceMap.get(name) ?? 100 }))
    const totalStudentFee = calculateTotalFeeFromSubjects(selectedPrices)
    const agent = await db.agent.findUnique({ where: { id: existing.agentId } })
    const rate = agent?.commissionRate || 15
    const commissionAmount = calculateCommissionFromTotal(totalStudentFee, rate)

    data.subjects = subjectNames.join(',')
    data.subjectCount = subjectNames.length
    data.totalStudentFee = totalStudentFee
    data.commissionAmount = commissionAmount
  }

  // Allow manual commission override (only if subjects not being updated)
  if (body.commissionAmount !== undefined && body.subjects === undefined) {
    const amt = Number(body.commissionAmount)
    if (isNaN(amt) || amt < 0) {
      return fail('Invalid commission amount', 400)
    }
    data.commissionAmount = Math.round(amt * 100) / 100
  }

  const updated = await db.claim.update({
    where: { id: numericId },
    data,
  })

  console.log(
    `[admin] Claim ${updated.claimId} updated by ${admin.email}: status=${updated.status}`
  )

  return ok({
    id: updated.id,
    claimId: updated.claimId,
    status: updated.status,
    subjects: updated.subjects,
    subjectCount: updated.subjectCount,
    totalStudentFee: updated.totalStudentFee,
    commissionAmount: updated.commissionAmount,
    startDate: updated.startDate,
    thirtyDayCheckpoint: updated.thirtyDayCheckpoint,
    paymentMethod: updated.paymentMethod,
    datePaid: updated.datePaid,
    adminNotes: updated.adminNotes,
    updatedAt: updated.updatedAt,
    message: 'Claim updated successfully',
  })
}
