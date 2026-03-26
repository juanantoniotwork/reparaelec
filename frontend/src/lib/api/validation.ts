/**
 * validation.ts — Helpers para Next.js API Routes.
 *
 * Uso típico en una API route de Next.js que actúa como proxy a Laravel:
 *
 *   const token = getAuthToken(request)
 *   if (!token) return unauthorizedResponse()
 *
 *   const validation = await validateBody(request, miSchema)
 *   if (validation.error) return validation.error
 *
 *   const res = await fetch(`${API_URL}/...`, {
 *     headers: getProxyHeaders(request, token),
 *     body: JSON.stringify(validation.data),
 *   })
 *
 * Reparaelec usa la cookie "access_token" (Bearer, Sanctum token-based).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// ── Token ────────────────────────────────────────────────────────────────────

/**
 * Extrae el Bearer token de la request.
 * Prioridad: Authorization header (enviado por fetchWithAuth) > cookie access_token.
 */
export function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7)
  return request.cookies.get('access_token')?.value ?? null
}

// ── Headers ──────────────────────────────────────────────────────────────────

/**
 * Construye los headers para el proxy a Laravel.
 * Incluye Authorization Bearer, Accept JSON y, opcionalmente, Content-Type.
 */
export function getProxyHeaders(
  request: NextRequest,
  token: string,
  includeContentType = true,
): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'User-Agent': request.headers.get('user-agent') ?? 'Reparaelec/1.0',
  }
  if (includeContentType) {
    headers['Content-Type'] = 'application/json'
  }
  return headers
}

// ── Body validation ───────────────────────────────────────────────────────────

type ValidationSuccess<T> = { data: T; error: null }
type ValidationFailure  = { data: null; error: NextResponse }

/**
 * Parsea el body JSON de la request y lo valida con el schema Zod indicado.
 * Retorna { data } si es válido o { error: NextResponse } con 400 si no.
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
): Promise<ValidationSuccess<T> | ValidationFailure> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return {
      data: null,
      error: NextResponse.json(
        { success: false, error: 'Body JSON inválido' },
        { status: 400 },
      ),
    }
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors as Record<string, string[]>
    return {
      data: null,
      error: NextResponse.json(
        { success: false, error: 'Error de validación', errors },
        { status: 400 },
      ),
    }
  }

  return { data: result.data, error: null }
}

// ── JSON parse seguro ─────────────────────────────────────────────────────────

/**
 * Parsea la respuesta JSON del backend sin lanzar excepciones.
 * Si el body no es JSON (ej. 204 No Content), devuelve {}.
 */
export async function safeJsonParse(response: Response): Promise<Record<string, unknown>> {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

// ── ID validation ─────────────────────────────────────────────────────────────

/** True si el string es un entero positivo válido para usar como ID de Laravel. */
export function isValidId(id: string): boolean {
  const n = Number(id)
  return Number.isInteger(n) && n > 0
}

// ── Respuestas estándar ───────────────────────────────────────────────────────

export function invalidIdResponse(): NextResponse {
  return NextResponse.json(
    { success: false, error: 'ID inválido' },
    { status: 400 },
  )
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { success: false, error: 'No autenticado' },
    { status: 401 },
  )
}

export function forbiddenResponse(): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Sin permisos' },
    { status: 403 },
  )
}

export function internalErrorResponse(message = 'Error interno del servidor'): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 500 },
  )
}
