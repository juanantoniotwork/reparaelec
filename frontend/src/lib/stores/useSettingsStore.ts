/**
 * lib/stores/useSettingsStore.ts — Caché global de settings RAG.
 *
 * Evita recargar los settings en cada visita a la página de Configuración.
 * TTL de 5 minutos: si los datos son más antiguos, se recargan automáticamente.
 * Persiste en localStorage con la clave "reparaelec-settings".
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Setting } from '@/lib/api/settings'

// ── Constantes ────────────────────────────────────────────────────────────────

const TTL_MS = 5 * 60 * 1_000 // 5 minutos

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface SettingsState {
  settings:    Setting[]
  lastFetched: number | null
}

interface SettingsActions {
  /** Almacena los settings y registra el timestamp actual. */
  setSettings: (settings: Setting[]) => void
  /** Elimina los settings cacheados (útil tras guardar cambios). */
  clearSettings: () => void
  /** True si no hay datos o han superado el TTL. */
  isStale: () => boolean
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set, get) => ({
      settings:    [],
      lastFetched: null,

      setSettings: (settings) => set({ settings, lastFetched: Date.now() }),

      clearSettings: () => set({ settings: [], lastFetched: null }),

      isStale: () => {
        const { lastFetched } = get()
        if (lastFetched === null) return true
        return Date.now() - lastFetched > TTL_MS
      },
    }),
    {
      name:    'reparaelec-settings',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : ({} as Storage),
      ),
      partialize: (state) => ({
        settings:    state.settings,
        lastFetched: state.lastFetched,
      }),
    },
  ),
)
