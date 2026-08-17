import type { User } from './types'

const TOKEN_KEY = 'rsa_token'
const USER_KEY = 'rsa_user'

/** Read the stored JWT token (or null) */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

/** Read the stored user object (or null) */
export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

/** Persist token + user to localStorage */
export function persistSession(token: string, user: User): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

/** Clear session data from localStorage */
export function clearSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

interface ApiOptions extends RequestInit {
  // If true, a 401 response will clear the session and throw — caller can handle.
  auth?: boolean
}

/**
 * Wrapper around fetch that:
 *  - prefixes the API base path
 *  - attaches the Bearer token (when present)
 *  - parses JSON responses
 *  - throws an Error with the server's `error` message on non-2xx
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { auth = true, headers, ...rest } = options
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  }

  if (auth) {
    const token = getToken()
    if (token) {
      finalHeaders['Authorization'] = `Bearer ${token}`
    }
  }

  const res = await fetch(path, {
    ...rest,
    headers: finalHeaders,
  })

  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : null) || `Request failed (${res.status})`
    if (res.status === 401 && auth) {
      clearSession()
    }
    throw new Error(message)
  }

  return data as T
}
