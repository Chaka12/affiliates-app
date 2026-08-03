import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { sanitizeText } from '@/lib/auth'
import { ok, fail } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/subjects?include_inactive=true
 * Returns all subjects (optionally including inactive ones).
 */
export async function GET(request: Request) {
  const admin = await requireAdmin()
  if (!admin) return fail('Unauthorized — admin access required', 401)

  const { searchParams } = new URL(request.url)
  const includeInactive = searchParams.get('include_inactive') === 'true'

  const where = includeInactive ? {} : { isActive: true }
  const subjects = await db.subject.findMany({
    where,
    orderBy: { sortOrder: 'asc' },
  })

  return ok({ subjects })
}

/**
 * POST /api/admin/subjects
 * Body: { name, price?, sortOrder? }
 * Creates a new subject.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin) return fail('Unauthorized — admin access required', 401)

  const body = await request.json().catch(() => ({}))
  const name = sanitizeText(body.name)
  if (!name) return fail('Subject name is required', 400)
  if (name.length > 100) return fail('Subject name is too long (max 100 chars)', 400)

  const existing = await db.subject.findUnique({ where: { name } })
  if (existing) {
    if (existing.isActive) {
      return fail(`Subject "${name}" already exists`, 409)
    }
    // Reactivate an inactive subject
    const reactivated = await db.subject.update({
      where: { name },
      data: { isActive: true },
    })
    return ok({ subject: reactivated, message: `Subject "${name}" reactivated` }, 201)
  }

  const price = Number(body.price)
  if (isNaN(price) || price < 0) return fail('Invalid price', 400)

  const maxSort = await db.subject.findFirst({
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })
  const sortOrder = body.sortOrder !== undefined
    ? parseInt(String(body.sortOrder), 10) || 0
    : (maxSort?.sortOrder ?? -1) + 1

  const subject = await db.subject.create({
    data: { name, price: Math.round(price * 100) / 100, sortOrder },
  })

  return ok({ subject, message: `Subject "${name}" created` }, 201)
}
