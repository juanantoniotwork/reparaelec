/**
 * lib/stores/useAuthStore.ts — Estado global de autenticación.
 *
 * Persiste en localStorage con la clave "reparaelec-auth".
 * Sincroniza con auth-simple.ts (localStorage + cookies) para mantener
 * compatibilidad con el middleware de Next.js y fetchWithAuth.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AuthUser, UserRole } from '@/lib/auth-simple'
import { saveAuthSession, clearAuthSession } from '@/lib/auth-simple'
import { logoutUser } from '@/lib/api/auth'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface AuthState {
  user:            AuthUser | null
  token:           string | null
  role:            UserRole | null
  isAuthenticated: boolean
}

interface AuthActions {
  /** Persiste sesión tras login exitoso. */
  setSession: (token: string, role: UserRole, user: AuthUser) => void
  /** Cierra sesión: llama al endpoint + limpia estado y storage. */
  logout: () => Promise<void>
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      user:            null,
      token:           null,
      role:            null,
      isAuthenticated: false,

      setSession: (token, role, user) => {
        saveAuthSession(token, role, user)
        set({ user, token, role, isAuthenticated: true })
      },

      logout: async () => {
        try { await logoutUser() } catch { /* ignorar errores de red */ }
        set({ user: null, token: null, role: null, isAuthenticated: false })
      },
    }),
    {
      name:    'reparaelec-auth',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : ({} as Storage),
      ),
      // Solo persiste los campos de estado, no las acciones
      partialize: (state) => ({
        user:            state.user,
        token:           state.token,
        role:            state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
