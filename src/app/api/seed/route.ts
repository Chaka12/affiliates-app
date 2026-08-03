import { seedDatabase } from '@/lib/seed'
import { ok, fail } from '@/lib/api'

export const dynamic = 'force-dynamic'

/** POST /api/seed — idempotently seeds default admin + settings */
export async function POST() {
  const success = await seedDatabase()
  if (!success) return fail('Seed failed', 500)
  return ok({ message: 'Database seeded successfully' })
}

/** GET /api/seed — same as POST, for convenience */
export async function GET() {
  const success = await seedDatabase()
  if (!success) return fail('Seed failed', 500)
  return ok({ message: 'Database seeded successfully' })
}
