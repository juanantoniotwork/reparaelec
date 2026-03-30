/**
 * lib/api/users.ts — Capa API cliente para el módulo Usuarios.
 *
 * Tipos duales:
 *   ApiUser → snake_case, id: number  (backend)
 *   User    → camelCase, id: string   (frontend)
 */

import { fetchWithAuth } from '@/lib/api/auth-redirect'
import type { ApiResult, PaginatedResponse, Paginated } from '@/lib/api/types'

// ── Tipos de la API (snake_case) ─────────────────────────────────────────────

interface ApiUser {
  id: number
  name: string
  email: string
  role: string
  is_active: boolean
  language?: string
  last_login_at?: string | null
  created_at?: string
  updated_at?: string
}

// ── Tipos del frontend (camelCase) ───────────────────────────────────────────

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'tecnico'
  isActive: boolean
  language: string
  lastLoginAt: string | null
  updatedAt: string | null
}

export interface UserPageParams {
  page?: number
  per_page?: number
  name?: string
  email?: string
  status?: string  // 'all' | 'active' | 'inactive'
}

// ── Mapper ───────────────────────────────────────────────────────────────────

function mapApiToUser(api: ApiUser): User {
  return {
    id:          String(api.id),
    name:        api.name,
    email:       api.email,
    role:        api.role as 'admin' | 'tecnico',
    isActive:    api.is_active,
    language:    api.language ?? 'es',
    lastLoginAt: api.last_login_at ?? null,
    updatedAt:   api.updated_at ?? null,
  }
}

// ── Base URL ─────────────────────────────────────────────────────────────────

const BASE = '/api/admin/users'

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function getUsers(
  params?: UserPageParams,
): Promise<ApiResult<Paginated<User>>> {
  try {
    const qs = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v != null && v !== '' && v !== 'all')
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : ''
    const url = qs ? `${BASE}?${qs}` : BASE
    const res  = await fetchWithAuth(url)
    const data = await res.json() as PaginatedResponse<ApiUser> | { error?: string; message?: string }
    if (!res.ok) {
      const err = data as { error?: string; message?: string }
      return { success: false, error: err.error || err.message || 'Error al cargar usuarios' }
    }
    const paged = data as PaginatedResponse<ApiUser>
    return {
      success: true,
      data: {
        items:       paged.data.map(mapApiToUser),
        currentPage: paged.current_page,
        lastPage:    paged.last_page,
        perPage:     paged.per_page,
        total:       paged.total,
      },
    }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}

export async function getUser(id: string): Promise<ApiResult<User>> {
  try {
    const res  = await fetchWithAuth(`${BASE}/${id}`)
    const data = await res.json() as ApiUser | { error?: string; message?: string }
    if (!res.ok) {
      const err = data as { error?: string; message?: string }
      return { success: false, error: err.error || err.message || 'Usuario no encontrado' }
    }
    return { success: true, data: mapApiToUser(data as ApiUser) }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}

export async function createUser(payload: {
  name: string
  email: string
  password: string
  role: string
}): Promise<ApiResult<User>> {
  try {
    const res  = await fetchWithAuth(BASE, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json() as ApiUser | { error?: string; message?: string; errors?: Record<string, string[]> }
    if (!res.ok) {
      const err = data as { error?: string; message?: string; errors?: Record<string, string[]> }
      return { success: false, error: err.error || err.message || 'Error al crear usuario', errors: err.errors }
    }
    return { success: true, data: mapApiToUser(data as ApiUser) }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}

export async function updateUser(
  id: string,
  payload: {
    name?: string
    email?: string
    role?: string
    language?: string
    is_active?: boolean
    password?: string
    password_confirmation?: string
  },
): Promise<ApiResult<User>> {
  try {
    const res  = await fetchWithAuth(`${BASE}/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json() as ApiUser | { error?: string; message?: string; errors?: Record<string, string[]> }
    if (!res.ok) {
      const err = data as { error?: string; message?: string; errors?: Record<string, string[]> }
      return { success: false, error: err.error || err.message || 'Error al actualizar usuario', errors: err.errors }
    }
    return { success: true, data: mapApiToUser(data as ApiUser) }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}

export async function deleteUser(id: string): Promise<ApiResult> {
  try {
    const res  = await fetchWithAuth(`${BASE}/${id}`, { method: 'DELETE' })
    const data = await res.json() as { error?: string; message?: string }
    if (!res.ok) {
      return { success: false, error: data.error || data.message || 'Error al eliminar usuario' }
    }
    return { success: true }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}
