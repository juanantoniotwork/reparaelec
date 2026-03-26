/**
 * lib/api/dashboard.ts — Estadísticas del panel de administración.
 */

import { fetchWithAuth } from '@/lib/api/auth-redirect'
import type { ApiResult } from '@/lib/api/types'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totals: {
    interactions: number
    users:        number
    documents:    number
    chunks:       number
  }
  feedback: {
    positive:     number
    negative:     number
    total:        number
    positive_pct: number | null
  }
  cache: {
    entries:  number
    hits:     number
    hit_rate: number
  }
  tokens: {
    input:              number
    output:             number
    estimated_cost_eur: number
  }
  interactions_by_day: Record<string, number>
  top_questions:       { query: string; total: number }[]
}

// ── getStats ──────────────────────────────────────────────────────────────────

export async function getStats(): Promise<ApiResult<DashboardStats>> {
  try {
    const res  = await fetchWithAuth('/api/admin/stats')
    const data = await res.json() as DashboardStats | { error?: string; message?: string }
    if (!res.ok) {
      const err = data as { error?: string; message?: string }
      return { success: false, error: err.error || err.message || 'Error al cargar estadísticas' }
    }
    return { success: true, data: data as DashboardStats }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}
