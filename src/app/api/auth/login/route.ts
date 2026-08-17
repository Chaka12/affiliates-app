import { db } from '@/lib/db'
import { comparePin, signToken, sanitizeText, hashPin } from '@/lib/auth'
import { seedDatabase } from '@/lib/seed'
import { ok, fail, isValidEmail, isValidPin } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/login
 * Body: { email, pin }
 * Returns: { token, user: { id, agentId, name, email, role, commissionRate, status } }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = sanitizeText(body.email).toLowerCase()
    const pin = sanitizeText(body.pin)

    if (!email || !pin) return fail('Email and PIN are required', 400)
    if (!isValidEmail(email)) return fail('Invalid email format', 400)
    if (!isValidPin(pin)) return fail('PIN must be exactly 4 digits', 400)

    // Ensure the admin account exists on first run
    await seedDatabase()

    const agent = await db.agent.findUnique({ where: { email } })
    if (!agent) return fail('Invalid email or PIN', 401)

    const pinMatches = await comparePin(pin, agent.pinHash)
    if (!pinMatches) return fail('Invalid email or PIN', 401)

    if (agent.status !== 'Active') {
      return fail('Your account is inactive. Please contact the administrator.', 403)
    }

    // Rotate PIN hash to a fresh bcrypt hash on successful login (defensive)
    // (kept lightweight — only re-hash if needed; here we just trust bcrypt compare)
    void hashPin

    const token = signToken({
      userId: agent.id,
      email: agent.email,
      role: agent.role as 'agent' | 'admin',
      agentId: agent.agentId,
      fullName: agent.fullName,
    })

    console.log(`[auth] Login success: ${agent.email} (${agent.role})`)

    return ok({
      token,
      user: {
        id: agent.id,
        agentId: agent.agentId,
        name: agent.fullName,
        email: agent.email,
        phone: agent.phone || '',
        role: agent.role,
        commissionRate: agent.commissionRate,
        status: agent.status,
      },
    })
  } catch (err) {
    console.error('[auth/login] Error:', err)
    return fail('Login failed. Please try again.', 500)
  }
}
