/**
 * lib/api/auth.ts — Capa API cliente para autenticación.
 *
 * loginUser  → POST /api/login  (Laravel Sanctum token-based)
 * logoutUser → POST /api/logout
 *
 * Tras el login exitoso, delega en saveAuthSession (auth-simple.ts)
 * para persistir token, rol y usuario en localStorage + cookies.
 */

import { fetchWithAuth } from '@/lib/api/auth-redirect'
import type { ApiResult } from '@/lib/api/types'
import type { UserRole, AuthUser } from '@/lib/auth-simple'
import { saveAuthSession, clearAuthSession } from '@/lib/auth-simple'

// ── Tipos de la API ───────────────────────────────────────────────────────────

interface ApiLoginResponse {
  access_token: string
  role: UserRole
  user: {
    id: number
    name: string
    email: string
    role: string
    language?: string
    is_active?: boolean
  }
}

// ── loginUser ─────────────────────────────────────────────────────────────────

export async function loginUser(
  email: string,
  password: string,
): Promise<ApiResult<{ role: UserRole; token: string; user: AuthUser }>> {
  try {
    const res = await fetchWithAuth('/api/login', {
      method:            'POST',
      headers:           { 'Content-Type': 'application/json', Accept: 'application/json' },
      body:              JSON.stringify({ email, password }),
      skipAuthRedirect:  true,
    })

    const data = await res.json() as ApiLoginResponse | { error?: string; message?: string }

    if (!res.ok) {
      const err = data as { error?: string; message?: string }
      // 401 / 422 → credenciales incorrectas
      if (res.status === 401 || res.status === 422) {
        return { success: false, error: 'Credenciales incorrectas. Revisa tu email y contraseña.' }
      }
      return { success: false, error: err.message || err.error || 'Error al iniciar sesión.' }
    }

    const { access_token, role, user } = data as ApiLoginResponse

    const authUser: AuthUser = {
      id:        String(user.id),
      name:      user.name,
      email:     user.email,
      role:      user.role as UserRole,
      language:  user.language,
      is_active: user.is_active,
    }

    saveAuthSession(access_token, role, authUser)

    return { success: true, data: { role, token: access_token, user: authUser } }
  } catch {
    return { success: false, error: 'No se pudo conectar con el servidor.' }
  }
}

// ── logoutUser ────────────────────────────────────────────────────────────────

export async function logoutUser(): Promise<void> {
  try {
    await fetchWithAuth('/api/logout', { method: 'POST' })
  } catch {
    // Ignorar errores de red en logout
  } finally {
    clearAuthSession()
  }
}
