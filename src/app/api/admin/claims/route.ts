import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { ok, fail, isValidDate, VALID_STATUSES } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/claims?agent_id=&status=&date_from=&date_to=&limit=&offset=
 * Returns ALL claims from all agents, newest first.
 */
export async function GET(request: Request) {
  const admin = await requireAdmin()
  if (!admin) return fail('Unauthorized — admin access required', 401)

  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agent_id')
  const status = searchParams.get('status')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 500)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)

  if (status && !VALID_STATUSES.includes(status)) {
    return fail('Invalid status filter', 400)
  }
  if (dateFrom && !isValidDate(dateFrom)) return fail('Invalid date_from', 400)
  if (dateTo && !isValidDate(dateTo)) return fail('Invalid date_to', 400)

  const where: Record<string, unknown> = {}
  if (agentId) {
    const numericAgentId = parseInt(agentId, 10)
    if (!isNaN(numericAgentId)) where.agentId = numericAgentId
  }
  if (status) where.status = status

  // Date range filter on createdAt (stored as DateTime)
  if (dateFrom || dateTo) {
    const gte = dateFrom ? new Date(dateFrom + 'T00:00:00') : undefined
    const lt = dateTo ? new Date(dateTo + 'T23:59:59.999') : undefined
    where.createdAt = {}
    if (gte) (where.createdAt as { gte?: Date }).gte = gte
    if (lt) (where.createdAt as { lt?: Date }).lt = lt
  }

  const [claims, total] = await Promise.all([
    db.claim.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.claim.count({ where }),
  ])

  return ok({
    claims: claims.map((c) => ({
      id: c.id,
      claimId: c.claimId,
      agentId: c.agentId,
      agentName: c.agentName,
      agentEmail: c.agentEmail,
      parentFullName: c.parentFullName,
      parentPhone: c.parentPhone,
      parentEmail: c.parentEmail,
      studentName: c.studentName,
      studentGrade: c.studentGrade,
      studentSchool: c.studentSchool,
      subjects: c.subjects,
      subjectCount: c.subjectCount,
      totalStudentFee: c.totalStudentFee,
      notes: c.notes,
      status: c.status,
      commissionAmount: c.commissionAmount,
      startDate: c.startDate,
      thirtyDayCheckpoint: c.thirtyDayCheckpoint,
      paymentMethod: c.paymentMethod,
      datePaid: c.datePaid,
      adminNotes: c.adminNotes,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    total,
    limit,
    offset,
  })
}