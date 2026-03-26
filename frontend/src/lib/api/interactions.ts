/**
 * lib/api/interactions.ts — Capa API cliente para el módulo Interacciones.
 *
 * Tipos duales:
 *   ApiInteraction       → snake_case, id: number  (backend, listado)
 *   ApiInteractionDetail → snake_case, id: number  (backend, detalle)
 *   Interaction          → camelCase, id: string   (frontend, listado)
 *   InteractionDetail    → camelCase, id: string   (frontend, detalle)
 */

import { fetchWithAuth } from '@/lib/api/auth-redirect'
import type { ApiResult } from '@/lib/api/types'

// ── Tipos de la API (snake_case) ──────────────────────────────────────────────

interface ApiInteractionUser {
  id: number
  name: string
  email?: string
}

interface ApiInteraction {
  id: number
  user_id: number
  query: string
  response: string
  feedback: 'positive' | 'negative' | null
  created_at: string
  response_time_ms: number | null
  from_cache: boolean
  user?: ApiInteractionUser | null
}

interface ApiInteractionDetail extends ApiInteraction {
  model: string | null
  tokens_input?: number | null
  tokens_output?: number | null
}

// ── Tipos del frontend (camelCase) ────────────────────────────────────────────

export type FeedbackValue = 'positive' | 'negative' | null

export interface Interaction {
  id: string
  userId: string
  query: string
  response: string
  feedback: FeedbackValue
  createdAt: string
  responseTimeMs: number | null
  fromCache: boolean
  user: { id: string; name: string } | null
}

export interface InteractionDetail extends Interaction {
  model: string | null
  tokensInput: number | null
  tokensOutput: number | null
  user: { id: string; name: string; email: string } | null
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapApiToInteraction(api: ApiInteraction): Interaction {
  return {
    id:             String(api.id),
    userId:         String(api.user_id),
    query:          api.query,
    response:       api.response,
    feedback:       api.feedback,
    createdAt:      api.created_at,
    responseTimeMs: api.response_time_ms ?? null,
    fromCache:      api.from_cache,
    user:           api.user ? { id: String(api.user.id), name: api.user.name } : null,
  }
}

function mapApiToInteractionDetail(api: ApiInteractionDetail): InteractionDetail {
  return {
    ...mapApiToInteraction(api),
    model:        api.model ?? null,
    tokensInput:  api.tokens_input ?? null,
    tokensOutput: api.tokens_output ?? null,
    user:         api.user
      ? { id: String(api.user.id), name: api.user.name, email: api.user.email ?? '' }
      : null,
  }
}

// ── Base URL ──────────────────────────────────────────────────────────────────

const BASE = '/api/admin/interactions'

// ── Funciones ─────────────────────────────────────────────────────────────────

export async function getInteractions(params?: {
  feedback?: string
  userId?: string
  dateFrom?: string
  dateTo?: string
}): Promise<ApiResult<Interaction[]>> {
  try {
    const qs = new URLSearchParams()
    if (params?.feedback) qs.set('feedback', params.feedback)
    if (params?.userId)   qs.set('user_id', params.userId)
    if (params?.dateFrom) qs.set('date_from', params.dateFrom)
    if (params?.dateTo)   qs.set('date_to', params.dateTo)
    const url = qs.toString() ? `${BASE}?${qs}` : BASE
    const res  = await fetchWithAuth(url)
    const data = await res.json() as ApiInteraction[] | { error?: string; message?: string }
    if (!res.ok) {
      const err = data as { error?: string; message?: string }
      return { success: false, error: err.error || err.message || 'Error al cargar interacciones' }
    }
    return { success: true, data: (data as ApiInteraction[]).map(mapApiToInteraction) }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}

export async function getInteraction(id: string): Promise<ApiResult<InteractionDetail>> {
  try {
    const res  = await fetchWithAuth(`${BASE}/${id}`)
    const data = await res.json() as ApiInteractionDetail | { error?: string; message?: string }
    if (!res.ok) {
      const err = data as { error?: string; message?: string }
      return { success: false, error: err.error || err.message || 'Error al cargar la interacción' }
    }
    return { success: true, data: mapApiToInteractionDetail(data as ApiInteractionDetail) }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}
