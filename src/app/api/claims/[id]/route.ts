import { db } from '@/lib/db'
import { requireAuth } from '@/lib/session'
import { ok, fail } from '@/lib/api'

export const dynamic = 'force-dynamic'

/** GET /api/claims/:id — full details of a claim owned by the authenticated agent */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (!user) return fail('Unauthorized', 401)

  const { id } = await params
  const numericId = parseInt(id, 10)
  if (isNaN(numericId)) return fail('Invalid claim id', 400)

  const claim = await db.claim.findUnique({ where: { id: numericId } })
  if (!claim) return fail('Claim not found', 404)

  // Agents may only view their own claims; admins may view any
  if (user.role !== 'admin' && claim.agentId !== user.userId) {
    return fail('Claim not found', 404)
  }

  return ok({
    id: claim.id,
    claimId: claim.claimId,
    agentId: claim.agentId,
    agentName: claim.agentName,
    agentEmail: claim.agentEmail,
    parentFullName: claim.parentFullName,
    parentPhone: claim.parentPhone,
    parentEmail: claim.parentEmail,
    studentName: claim.studentName,
    studentGrade: claim.studentGrade,
    studentSchool: claim.studentSchool,
    subjects: claim.subjects,
    subjectCount: claim.subjectCount,
    totalStudentFee: claim.totalStudentFee,
    notes: claim.notes,
    status: claim.status,
    commissionAmount: claim.commissionAmount,
    startDate: claim.startDate,
    thirtyDayCheckpoint: claim.thirtyDayCheckpoint,
    paymentMethod: claim.paymentMethod,
    datePaid: claim.datePaid,
    adminNotes: claim.adminNotes,
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt,
  })
}
