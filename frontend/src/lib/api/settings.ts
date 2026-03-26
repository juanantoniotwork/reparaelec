/**
 * lib/api/settings.ts — Capa API cliente para el módulo Configuración.
 *
 * Tipos duales:
 *   ApiSetting → snake_case, id: number  (backend)
 *   Setting    → camelCase, id: string   (frontend)
 *
 * El backend almacena todos los valores como strings.
 * PUT espera un array de { key, value } (ambos string).
 */

import { fetchWithAuth } from '@/lib/api/auth-redirect'
import type { ApiResult } from '@/lib/api/types'

// ── Tipos de la API (snake_case) ──────────────────────────────────────────────

export type SettingType = 'string' | 'integer' | 'float' | 'boolean'

interface ApiSetting {
  id: number
  key: string
  value: string
  description: string | null
  type: SettingType
  created_at: string
  updated_at: string
}

// ── Tipos del frontend (camelCase) ────────────────────────────────────────────

export interface Setting {
  id: string
  key: string
  value: string
  description: string
  type: SettingType
  updatedAt: string
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function mapApiToSetting(api: ApiSetting): Setting {
  return {
    id:          String(api.id),
    key:         api.key,
    value:       api.value,
    description: api.description ?? '',
    type:        api.type,
    updatedAt:   api.updated_at,
  }
}

// ── Base URL ──────────────────────────────────────────────────────────────────

const BASE = '/api/admin/settings'

// ── Funciones ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<ApiResult<Setting[]>> {
  try {
    const res  = await fetchWithAuth(BASE)
    const data = await res.json() as ApiSetting[] | { error?: string; message?: string }
    if (!res.ok) {
      const err = data as { error?: string; message?: string }
      return { success: false, error: err.error || err.message || 'Error al cargar la configuración' }
    }
    return { success: true, data: (data as ApiSetting[]).map(mapApiToSetting) }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}

export async function updateSettings(
  payload: { key: string; value: string }[],
): Promise<ApiResult<Setting[]>> {
  try {
    const res  = await fetchWithAuth(BASE, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json() as ApiSetting[] | { error?: string; message?: string; errors?: Record<string, string[]> }
    if (!res.ok) {
      const err = data as { error?: string; message?: string; errors?: Record<string, string[]> }
      return { success: false, error: err.error || err.message || 'Error al guardar', errors: err.errors }
    }
    return { success: true, data: (data as ApiSetting[]).map(mapApiToSetting) }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}
