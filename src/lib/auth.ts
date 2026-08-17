import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'remedial-school-dev-secret-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'
const BCRYPT_ROUNDS = 10

export interface JwtPayload {
  userId: number
  email: string
  role: 'agent' | 'admin'
  agentId: string
  fullName: string
}

/** Hash a 4-digit PIN using bcrypt */
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_ROUNDS)
}

/** Compare a plaintext PIN against a hash */
export async function comparePin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

/** Sign a JWT for an authenticated agent */
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any })
}

/** Verify a JWT and return the payload (or null) */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}

/** Generate a random 4-digit PIN string */
export function generateRandomPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

/**
 * Auto-generate the next agent_id in the format AGENT001, AGENT002, ...
 */
export async function generateAgentId(): Promise<string> {
  const lastAgent = await db.agent.findFirst({
    orderBy: { id: 'desc' },
  })
  let nextNum = 1
  if (lastAgent && lastAgent.agentId) {
    const match = lastAgent.agentId.match(/AGENT(\d+)/)
    if (match) {
      nextNum = parseInt(match[1], 10) + 1
    }
  }
  return `AGENT${String(nextNum).padStart(3, '0')}`
}

/**
 * Auto-generate the next claim_id in the format CLAIM001, CLAIM002, ...
 */
export async function generateClaimId(): Promise<string> {
  const lastClaim = await db.claim.findFirst({
    orderBy: { id: 'desc' },
  })
  let nextNum = 1
  if (lastClaim && lastClaim.claimId) {
    const match = lastClaim.claimId.match(/CLAIM(\d+)/)
    if (match) {
      nextNum = parseInt(match[1], 10) + 1
    }
  }
  return `CLAIM${String(nextNum).padStart(3, '0')}`
}

/** Default price per subject (Loti) — used as fallback and for new subjects */
export const DEFAULT_PRICE_PER_SUBJECT = 100

/** Default commission rate (%) used when creating new agents */
export const DEFAULT_COMMISSION_RATE = 15.0

/**
 * Get all active subjects from the database, ordered by sortOrder.
 * Returns array of { name, price }.
 */
export async function getActiveSubjects(): Promise<{ name: string; price: number }[]> {
  const rows = await db.subject.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { name: true, price: true },
  })
  return rows.map((r) => ({ name: r.name, price: r.price }))
}

/**
 * Calculate total student fee by summing individual subject prices.
 * subjectPrices is an array of { name, price } for the selected subjects.
 */
export function calculateTotalFeeFromSubjects(
  subjectPrices: { name: string; price: number }[]
): number {
  const total = subjectPrices.reduce((sum, s) => sum + s.price, 0)
  return Math.round(total * 100) / 100
}

/**
 * Calculate commission = totalStudentFee × (rate / 100)
 */
export function calculateCommissionFromTotal(
  totalStudentFee: number,
  commissionRate: number
): number {
  return Math.round(totalStudentFee * (commissionRate / 100) * 100) / 100
}

/**
 * Legacy convenience: get a single default price (for agents/me endpoint).
 */
export async function getDefaultSubjectPrice(): Promise<number> {
  const setting = await db.adminSetting.findUnique({
    where: { settingKey: 'price_per_subject' },
  })
  if (setting?.settingValue) {
    const parsed = parseFloat(setting.settingValue)
    if (!isNaN(parsed) && parsed >= 0) return parsed
  }
  return DEFAULT_PRICE_PER_SUBJECT
}

/** Add 30 days to an ISO date string (YYYY-MM-DD) and return YYYY-MM-DD */
export function addThirtyDays(startDate: string): string {
  const d = new Date(startDate + 'T00:00:00')
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

/** Escape HTML to mitigate stored XSS in plain-text fields */
export function sanitizeText(input: unknown): string {
  if (input === null || input === undefined) return ''
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim()
}

/**
 * Validate subjects array against active subjects in the database.
 * Returns the validated subject names (deduplicated) or null if invalid.
 */
export async function validateSubjects(
  subjects: unknown
): Promise<string[] | null> {
  if (!Array.isArray(subjects) || subjects.length === 0) return null
  const unique = [...new Set(subjects.map((s: unknown) => String(s).trim()).filter(Boolean))]
  if (unique.length === 0) return null

  const activeSubjects = await db.subject.findMany({
    where: { isActive: true },
    select: { name: true },
  })
  const validNames = new Set(activeSubjects.map((s) => s.name))

  for (const name of unique) {
    if (!validNames.has(name)) return null
  }
  return unique
}

