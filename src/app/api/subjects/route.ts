import { db } from '@/lib/db'
import { ok, fail } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/subjects
 * Returns all active subjects with their prices (for agents to use when claiming).
 */
export async function GET() {
  const subjects = await db.subject.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, price: true, sortOrder: true },
  })
  return ok({ subjects })
}
