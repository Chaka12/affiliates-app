import { ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

/** POST /api/auth/logout — stateless JWT; client simply discards the token */
export async function POST() {
  return ok({ message: 'Logged out successfully' })
}
