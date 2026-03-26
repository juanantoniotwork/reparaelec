/**
 * auth-simple.ts — Autenticación client-side para Reparaelec.
 *
 * El token Bearer se guarda en localStorage("access_token") y en cookie("access_token").
 * El rol se guarda en localStorage("role") y en cookie("role").
 * La info del usuario se guarda en localStorage("user") como JSON.
 *
 * Roles disponibles: "admin" | "tecnico"
 */

export type UserRole = 'admin' | 'tecnico'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  language?: string
  is_active?: boolean
}

// ── Lectura ──────────────────────────────────────────────────────────────────

/** Devuelve el usuario actual desde localStorage, o null si no hay sesión. */
export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return {
      id: String(parsed.id),
      name: parsed.name ?? '',
      email: parsed.email ?? '',
      role: parsed.role as UserRole,
      language: parsed.language,
      is_active: parsed.is_active,
    }
  } catch {
    return null
  }
}

/** Devuelve el token de acceso desde localStorage, o null. */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

/** Devuelve el rol del usuario actual, o null. */
export function getCurrentRole(): UserRole | null {
  if (typeof window === 'undefined') return null
  const role = localStorage.getItem('role')
  if (role === 'admin' || role === 'tecnico') return role
  return null
}

// ── Escritura ────────────────────────────────────────────────────────────────

const COOKIE_DAYS = 7

function setCookie(name: string, value: string): void {
  const maxAge = COOKIE_DAYS * 24 * 60 * 60
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${maxAge};SameSite=Lax`
}

function removeCookie(name: string): void {
  document.cookie = `${name}=;path=/;max-age=0`
}

/**
 * Persiste el token, el rol y el usuario tras un login exitoso.
 * Guarda en localStorage y en cookies (para el middleware de Next.js).
 */
export function saveAuthSession(token: string, role: UserRole, user: AuthUser): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('access_token', token)
  localStorage.setItem('role', role)
  localStorage.setItem('user', JSON.stringify(user))
  setCookie('access_token', token)
  setCookie('role', role)
}

/**
 * Elimina todos los datos de sesión del localStorage y las cookies.
 */
export function clearAuthSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('access_token')
  localStorage.removeItem('role')
  localStorage.removeItem('user')
  removeCookie('access_token')
  removeCookie('role')
}

// ── Guards ───────────────────────────────────────────────────────────────────

/** True si hay sesión activa. */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null
}

/** True si el usuario autenticado es admin. */
export function isAdmin(): boolean {
  return getCurrentRole() === 'admin'
}

/** True si el usuario autenticado es técnico. */
export function isTecnico(): boolean {
  return getCurrentRole() === 'tecnico'
}

/** True si el usuario tiene alguno de los roles indicados. */
export function hasRole(...roles: UserRole[]): boolean {
  const role = getCurrentRole()
  return role !== null && roles.includes(role)
}
