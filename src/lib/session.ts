import { headers } from 'next/headers'
import { verifyToken, type JwtPayload } from './auth'
import { db } from './db'

/**
 * Extract & verify the JWT from the Authorization: Bearer <token> header.
 * Returns the decoded payload, or null if missing/invalid.
 */
export async function getAuthUser(): Promise<JwtPayload | null> {
  const headerList = await headers()
  const authHeader = headerList.get('authorization') || headerList.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  return verifyToken(token)
}

/**
 * Require authentication. Returns the user payload or throws a 401-style
 * sentinel by returning null; callers should check and respond.
 */
export async function requireAuth(): Promise<JwtPayload | null> {
  return getAuthUser()
}

/** Require an authenticated admin user. Re-checks role in DB for safety. */
export async function requireAdmin(): Promise<JwtPayload | null> {
  const user = await getAuthUser()
  if (!user) return null
  if (user.role !== 'admin') return null
  // Re-verify against DB to handle role changes after token issuance
  const dbAgent = await db.agent.findUnique({ where: { id: user.userId } })
  if (!dbAgent || dbAgent.role !== 'admin' || dbAgent.status !== 'Active') {
    return null
  }
  return user
}
