import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { ok, fail } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/stats
 * Returns dashboard statistics including total student fees.
 */
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return fail('Unauthorized — admin access required', 401)

  const [
    totalAgents,
    activeAgents,
    totalClaims,
    pendingClaims,
    approvedClaims,
    paidClaims,
    rejectedClaims,
    paidAgg,
    allCommissionAgg,
    allFeesAgg,
  ] = await Promise.all([
    db.agent.count(),
    db.agent.count({ where: { status: 'Active' } }),
    db.claim.count(),
    db.claim.count({ where: { status: 'Pending' } }),
    db.claim.count({ where: { status: 'Approved' } }),
    db.claim.count({ where: { status: 'Paid' } }),
    db.claim.count({ where: { status: 'Rejected' } }),
    db.claim.aggregate({ where: { status: 'Paid' }, _sum: { commissionAmount: true } }),
    db.claim.aggregate({ _sum: { commissionAmount: true } }),
    db.claim.aggregate({ _sum: { totalStudentFee: true } }),
  ])

  return ok({
    totalAgents,
    activeAgents,
    inactiveAgents: totalAgents - activeAgents,
    totalClaims,
    pendingClaims,
    approvedClaims,
    paidClaims,
    rejectedClaims,
    totalCommissionPaid: paidAgg._sum.commissionAmount || 0,
    totalCommissionAccrued: allCommissionAgg._sum.commissionAmount || 0,
    totalStudentFees: allFeesAgg._sum.totalStudentFee || 0,
  })
}
