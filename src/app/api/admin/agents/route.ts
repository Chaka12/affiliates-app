import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import {
  sanitizeText,
  hashPin,
  generateAgentId,
  generateRandomPin,
  DEFAULT_COMMISSION_RATE,
} from '@/lib/auth'
import { ok, fail, isValidEmail, isValidPhone, VALID_AGENT_STATUSES } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/agents
 * Returns all agents with their (non-sensitive) details.
 */
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return fail('Unauthorized — admin access required', 401)

  const agents = await db.agent.findMany({
    orderBy: { createdAt: 'asc' },
  })

  return ok({
    agents: agents.map((a) => ({
      id: a.id,
      agentId: a.agentId,
      fullName: a.fullName,
      email: a.email,
      phone: a.phone || '',
      commissionRate: a.commissionRate,
      status: a.status,
      role: a.role,
      createdAt: a.createdAt,
      // stats per agent
    })),
  })
}

/**
 * POST /api/admin/agents
 * Body: { fullName, email, phone, commissionRate?, status?, role? }
 * Auto-generates agent_id and a random 4-digit PIN (returned ONCE in the response).
 */
export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin) return fail('Unauthorized — admin access required', 401)

  const body = await request.json().catch(() => ({}))
  const fullName = sanitizeText(body.fullName)
  const email = sanitizeText(body.email).toLowerCase()
  const phone = sanitizeText(body.phone)
  const commissionRate =
    body.commissionRate !== undefined && body.commissionRate !== null
      ? Number(body.commissionRate)
      : DEFAULT_COMMISSION_RATE
  const status = sanitizeText(body.status) || 'Active'
  const role = sanitizeText(body.role) || 'agent'

  if (!fullName) return fail('Full name is required', 400)
  if (!email) return fail('Email is required', 400)
  if (!isValidEmail(email)) return fail('Invalid email format', 400)
  if (!phone) return fail('Phone is required', 400)
  if (!isValidPhone(phone)) return fail('Invalid phone number', 400)
  if (isNaN(commissionRate) || commissionRate < 0 || commissionRate > 100) {
    return fail('Commission rate must be between 0 and 100', 400)
  }
  if (!VALID_AGENT_STATUSES.includes(status)) {
    return fail('Invalid status', 400)
  }
  if (role !== 'agent' && role !== 'admin') {
    return fail('Invalid role', 400)
  }

  const existing = await db.agent.findUnique({ where: { email } })
  if (existing) return fail('An agent with this email already exists', 409)

  // Enforce the 50-agent capacity
  const agentCount = await db.agent.count()
  if (agentCount >= 50) {
    return fail('Maximum agent capacity (50) has been reached', 400)
  }

  const agentId = await generateAgentId()
  const pin = generateRandomPin()
  const pinHash = await hashPin(pin)

  const agent = await db.agent.create({
    data: {
      agentId,
      fullName,
      email,
      phone,
      commissionRate,
      status,
      role,
      pinHash,
    },
  })

  console.log(
    `[admin] New agent created: ${agent.email} (${agent.agentId}) by ${admin.email}`
  )

  // IMPORTANT: PIN is returned exactly ONCE for sharing with the agent
  return ok(
    {
      id: agent.id,
      agentId: agent.agentId,
      fullName: agent.fullName,
      email: agent.email,
      phone: agent.phone || '',
      commissionRate: agent.commissionRate,
      status: agent.status,
      role: agent.role,
      pin, // one-time only
      createdAt: agent.createdAt,
      message: `Agent ${agent.agentId} created. Share this 4-digit PIN with the agent: ${pin}`,
    },
    201
  )
}
