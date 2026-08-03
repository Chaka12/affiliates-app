import { ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

/** GET /api — health check */
export async function GET() {
  return ok({ status: 'ok', service: 'remedial-school-affiliate', version: '1.0.0' })
}
