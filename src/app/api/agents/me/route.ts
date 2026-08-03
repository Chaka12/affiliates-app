import { db } from '@/lib/db'
import { requireAuth } from '@/lib/session'
import { sanitizeText, getDefaultSubjectPrice, calculateCommissionFromTotal } from '@/lib/auth'
import { ok, fail, isValidPhone } from '@/lib/api'

export const dynamic = 'force-dynamic'

/** GET /api/agents/me — full profile of the authenticated agent */
export async function GET() {
  const user = await requireAuth()
  if (!user) return fail('Unauthorized', 401)

  const agent = await db.agent.findUnique({ where: { id: user.userId } })
  if (!agent) return fail('Agent not found', 404)

  const defaultSubjectPrice = await getDefaultSubjectPrice()
  const estimatedCommissionPerSubject = calculateCommissionFromTotal(defaultSubjectPrice, agent.commissionRate)

  return ok({
    id: agent.id,
    agentId: agent.agentId,
    fullName: agent.fullName,
    email: agent.email,
    phone: agent.phone || '',
    commissionRate: agent.commissionRate,
    status: agent.status,
    role: agent.role,
    createdAt: agent.createdAt,
    defaultSubjectPrice,
    estimatedCommissionPerSubject,
  })
}

/** PUT /api/agents/me — agents can update their own phone number only */
export async function PUT(request: Request) {
  const user = await requireAuth()
  if (!user) return fail('Unauthorized', 401)

  const body = await request.json().catch(() => ({}))
  const phone = sanitizeText(body.phone)

  if (!phone) return fail('Phone is required', 400)
  if (!isValidPhone(phone)) return fail('Invalid phone number format', 400)

  const updated = await db.agent.update({
    where: { id: user.userId },
    data: { phone },
  })

  return ok({
    id: updated.id,
    agentId: updated.agentId,
    fullName: updated.fullName,
    email: updated.email,
    phone: updated.phone || '',
    commissionRate: updated.commissionRate,
    status: updated.status,
    role: updated.role,
  })
}
