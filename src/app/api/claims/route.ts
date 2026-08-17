import { db } from '@/lib/db'
import { requireAuth } from '@/lib/session'
import {
  sanitizeText,
  generateClaimId,
  validateSubjects,
  getActiveSubjects,
  calculateTotalFeeFromSubjects,
  calculateCommissionFromTotal,
} from '@/lib/auth'
import {
  ok,
  fail,
  VALID_GRADES,
  isValidPhone,
  isValidEmail,
} from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/claims?status=&limit=&offset=
 * Returns claims belonging to the authenticated agent, newest first.
 */
export async function GET(request: Request) {
  const user = await requireAuth()
  if (!user) return fail('Unauthorized', 401)

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || undefined
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)

  if (status && !['Pending', 'Approved', 'Rejected', 'Paid'].includes(status)) {
    return fail('Invalid status filter', 400)
  }

  const where = {
    agentId: user.userId,
    ...(status ? { status } : {}),
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

/**
 * POST /api/claims
 * Body: { parentFullName, parentPhone, parentEmail?, studentName, studentGrade,
 *         studentSchool?, subjects: string[], notes? }
 * Validates subjects against the active subjects DB table.
 * Calculates totalStudentFee by summing each subject's individual price.
 * Calculates commission = totalStudentFee × agentCommissionRate%.
 */
export async function POST(request: Request) {
  const user = await requireAuth()
  if (!user) return fail('Unauthorized', 401)

  const body = await request.json().catch(() => ({}))

  const parentFullName = sanitizeText(body.parentFullName)
  const parentPhone = sanitizeText(body.parentPhone)
  const parentEmail = sanitizeText(body.parentEmail) || null
  const studentName = sanitizeText(body.studentName)
  const studentGrade = sanitizeText(body.studentGrade)
  const studentSchool = sanitizeText(body.studentSchool) || null
  const notes = sanitizeText(body.notes) || null

  if (!parentFullName) return fail('Parent full name is required', 400)
  if (!parentPhone) return fail('Parent phone is required', 400)
  if (!isValidPhone(parentPhone)) return fail('Invalid parent phone number', 400)
  if (!studentName) return fail('Student name is required', 400)
  if (!studentGrade) return fail('Student grade is required', 400)
  if (!VALID_GRADES.includes(studentGrade)) {
    return fail('Student grade must be between Grade 1 and Grade 8', 400)
  }
  if (parentEmail && !isValidEmail(parentEmail)) {
    return fail('Invalid parent email format', 400)
  }

  const subjectNames = await validateSubjects(body.subjects)
  if (!subjectNames) {
    return fail('Invalid subjects. Please select from the available subjects list.', 400)
  }

  const agent = await db.agent.findUnique({ where: { id: user.userId } })
  if (!agent) return fail('Agent not found', 404)
  if (agent.status !== 'Active') {
    return fail('Your account is inactive. Please contact the administrator.', 403)
  }

  const activeSubjects = await getActiveSubjects()
  const priceMap = new Map(activeSubjects.map((s) => [s.name, s.price]))
  const selectedPrices = subjectNames.map((name) => ({ name, price: priceMap.get(name) ?? 100 }))

  const totalStudentFee = calculateTotalFeeFromSubjects(selectedPrices)
  const commissionAmount = calculateCommissionFromTotal(totalStudentFee, agent.commissionRate)

  const claimId = await generateClaimId()

  const claim = await db.claim.create({
    data: {
      claimId,
      agentId: agent.id,
      agentName: agent.fullName,
      agentEmail: agent.email,
      parentFullName,
      parentPhone,
      parentEmail,
      studentName,
      studentGrade,
      studentSchool,
      subjects: subjectNames.join(','),
      subjectCount: subjectNames.length,
      totalStudentFee,
      notes,
      status: 'Pending',
      commissionAmount,
    },
  })

  console.log(
    `[claims] New claim ${claim.claimId} by ${agent.email} for ${studentName} (${studentGrade}) — ${subjectNames.length} subjects, fee M${totalStudentFee.toFixed(2)}, commission M${commissionAmount.toFixed(2)}`
  )

  return ok(
    {
      id: claim.id,
      claimId: claim.claimId,
      status: claim.status,
      subjects: claim.subjects,
      subjectCount: claim.subjectCount,
      totalStudentFee: claim.totalStudentFee,
      commissionAmount: claim.commissionAmount,
      createdAt: claim.createdAt,
      message: `Claim ${claim.claimId} submitted successfully`,
    },
    201
  )
}
