import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { sanitizeText } from '@/lib/auth'
import { ok, fail, isValidPhone, VALID_AGENT_STATUSES } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/admin/agents/:id
 * Body: { commissionRate?, status?, phone? }
 * Admin can update an agent's commission rate, status, and/or phone.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) return fail('Unauthorized — admin access required', 401)

  const { id } = await params
  const numericId = parseInt(id, 10)
  if (isNaN(numericId)) return fail('Invalid agent id', 400)

  const existing = await db.agent.findUnique({ where: { id: numericId } })
  if (!existing) return fail('Agent not found', 404)

  const body = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}

  if (body.commissionRate !== undefined) {
    const rate = Number(body.commissionRate)
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return fail('Commission rate must be between 0 and 100', 400)
    }
    data.commissionRate = rate
  }

  if (body.status !== undefined) {
    const status = sanitizeText(body.status)
    if (!VALID_AGENT_STATUSES.includes(status)) {
      return fail('Invalid status', 400)
    }
    // Prevent self-deactivation / self-demotion to avoid locking out the last admin
    if (existing.id === admin.userId && status !== 'Active') {
      return fail('You cannot deactivate your own admin account', 400)
    }
    data.status = status
  }

  if (body.phone !== undefined) {
    const phone = sanitizeText(body.phone)
    if (phone && !isValidPhone(phone)) {
      return fail('Invalid phone number format', 400)
    }
    data.phone = phone
  }

  if (Object.keys(data).length === 0) {
    return fail('No fields to update', 400)
  }

  const updated = await db.agent.update({
    where: { id: numericId },
    data,
  })

  console.log(
    `[admin] Agent ${updated.agentId} updated by ${admin.email}: ${JSON.stringify(data)}`
  )

  return ok({
    id: updated.id,
    agentId: updated.agentId,
    fullName: updated.fullName,
    email: updated.email,
    phone: updated.phone || '',
    commissionRate: updated.commissionRate,
    status: updated.status,
    role: updated.role,
    updatedAt: updated.updatedAt,
    message: 'Agent updated successfully',
  })
}
