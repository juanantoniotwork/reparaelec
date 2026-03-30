/**
 * lib/api/chat.ts — Capa API cliente para el módulo Chat (técnico).
 *
 * streamChat  → usa fetch() directo con Authorization manual.
 *               NO usa fetchWithAuth para evitar cualquier buffering
 *               que pueda romper el stream SSE.
 *
 * El resto de operaciones (feedback, historial, sesiones) usan fetchWithAuth.
 */

import { fetchWithAuth } from '@/lib/api/auth-redirect'
import type { ApiResult } from '@/lib/api/types'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface ChatSource {
  title: string
  preview: string
  page?: number | null
}

export interface ChatStreamParams {
  question:   string
  categoryIds: string[]
  advanced?:   boolean
  sessionId?:  number | null
}

export interface ChatStreamHandlers {
  onChunk: (chunk: string) => void
  onMeta:  (
    sources:           ChatSource[],
    interactionId:     number,
    detectedCategory:  string | null,
    sessionId:         number | null,
  ) => void
  onDone:  () => void
}

export interface HistoryItem {
  id:          number
  session_id:  number
  query:       string
  response:    string
  feedback:    'positive' | 'negative' | null
  created_at:  string
}

export interface MyInteraction {
  id:          number
  session_id:  number
  query:       string
  response:    string
  feedback:    'positive' | 'negative' | null
  created_at:  string
}

// ── streamChat ────────────────────────────────────────────────────────────────

/**
 * Envía una pregunta al endpoint SSE /api/chat/stream y parsea el stream.
 * Usa fetch() con token inyectado manualmente (igual que el código original).
 * Lanza Error si la respuesta no es 2xx.
 */
export async function streamChat(
  params:   ChatStreamParams,
  handlers: ChatStreamHandlers,
): Promise<void> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('access_token') : null

  const res = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept:         'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      question:     params.question,
      category_ids: params.categoryIds,
      ...(params.advanced ? { advanced: true } : {}),
      ...(params.sessionId != null ? { session_id: params.sessionId } : {}),
    }),
  })

  if (!res.ok)   throw new Error(`HTTP ${res.status}`)
  if (!res.body) throw new Error('Response body is null')

  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer    = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6)

        if (raw === '[DONE]') {
          handlers.onDone()
          return
        }

        try {
          const parsed = JSON.parse(raw) as Record<string, unknown>
          if (typeof parsed.chunk === 'string') {
            handlers.onChunk(parsed.chunk)
          } else if (Array.isArray(parsed.sources)) {
            handlers.onMeta(
              parsed.sources as ChatSource[],
              parsed.interaction_id as number,
              typeof parsed.detected_category === 'string'
                ? parsed.detected_category
                : null,
              typeof parsed.session_id === 'number' ? parsed.session_id : null,
            )
          }
        } catch {
          // línea SSE malformada — ignorar
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// ── sendFeedback ──────────────────────────────────────────────────────────────

export async function sendFeedback(
  interactionId: number,
  value: 'positive' | 'negative',
): Promise<void> {
  try {
    await fetchWithAuth(`/api/interactions/${interactionId}/feedback`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body:    JSON.stringify({ feedback: value }),
    })
  } catch {
    // ignorar silenciosamente (no crítico)
  }
}

// ── getHistory ────────────────────────────────────────────────────────────────

export async function getHistory(
  sessionId: string,
): Promise<ApiResult<HistoryItem[]>> {
  try {
    const res  = await fetchWithAuth(`/api/interactions?session_id=${sessionId}`)
    const data = await res.json() as HistoryItem[] | { error?: string; message?: string }
    if (!res.ok) {
      const err = data as { error?: string; message?: string }
      return { success: false, error: err.error || err.message || 'Error al cargar conversación' }
    }
    return { success: true, data: data as HistoryItem[] }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}

// ── getSuggestions ────────────────────────────────────────────────────────────

export async function getSuggestions(): Promise<string[]> {
  try {
    const res = await fetchWithAuth('/api/chat/suggestions')
    if (!res.ok) return []
    const data = await res.json() as { query: string }[]
    return data.map(s => s.query)
  } catch {
    return []
  }
}

// ── getMyInteractions ─────────────────────────────────────────────────────────

export async function getMyInteractions(): Promise<ApiResult<MyInteraction[]>> {
  try {
    const res  = await fetchWithAuth('/api/interactions')
    const data = await res.json() as MyInteraction[] | { error?: string; message?: string }
    if (!res.ok) {
      const err = data as { error?: string; message?: string }
      return { success: false, error: err.error || err.message || 'Error al cargar historial' }
    }
    return { success: true, data: data as MyInteraction[] }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}

// ── deleteSession ─────────────────────────────────────────────────────────────

export async function deleteSession(
  sessionId: string | number,
): Promise<ApiResult> {
  try {
    const res = await fetchWithAuth(`/api/sessions/${sessionId}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json() as { error?: string; message?: string }
      return { success: false, error: data.error || data.message || 'Error al eliminar sesión' }
    }
    return { success: true }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}
