import { NextResponse } from 'next/server'

/** Standard JSON success response */
export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

/** Standard JSON error response */
export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status })
}

export const VALID_GRADES = [
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
]

export const VALID_STATUSES = ['Pending', 'Approved', 'Rejected', 'Paid']
export const VALID_PAYMENT_METHODS = ['M-Pesa', 'EcoCash', 'Cash', 'Bank Transfer']
export const VALID_AGENT_STATUSES = ['Active', 'Inactive']

/** Validate email format */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** Validate PIN is exactly 4 digits */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}

/** Validate ISO date string (YYYY-MM-DD) */
export function isValidDate(date: string | null | undefined): boolean {
  if (!date) return false
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date))
}

/** Validate phone (basic: non-empty, reasonable length) */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()+]/g, '')
  return /^[0-9]{7,15}$/.test(cleaned)
}
