/**
 * lib/api/categories.ts — Capa API cliente para el módulo Categorías.
 *
 * Tipos duales:
 *   ApiCategory  → snake_case, id: number  (lo que devuelve el backend)
 *   Category     → camelCase, id: string   (lo que usa el frontend)
 *
 * Todas las funciones retornan ApiResult<T> y llaman a las Next.js API routes
 * (/api/admin/categories) que actúan de proxy hacia Laravel.
 */

import { fetchWithAuth } from '@/lib/api/auth-redirect'
import type { ApiResult } from '@/lib/api/types'

// ── Tipos de la API (snake_case) ─────────────────────────────────────────────

interface ApiCategory {
  id: number
  name: string
  slug: string
  documents_count?: number
  created_at?: string
  updated_at?: string
}

// ── Tipos del frontend (camelCase) ───────────────────────────────────────────

export interface Category {
  id: string
  name: string
  slug: string
  documentsCount: number
}

// ── Mapper ───────────────────────────────────────────────────────────────────

function mapApiToCategory(api: ApiCategory): Category {
  return {
    id:             String(api.id),
    name:           api.name,
    slug:           api.slug,
    documentsCount: api.documents_count ?? 0,
  }
}

// ── Base URL (Next.js API route) ─────────────────────────────────────────────

const BASE = '/api/admin/categories'

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<ApiResult<Category[]>> {
  try {
    const res  = await fetchWithAuth(BASE)
    const data = await res.json() as ApiCategory[] | { error?: string; message?: string }
    if (!res.ok) {
      const err = data as { error?: string; message?: string }
      return { success: false, error: err.error || err.message || 'Error al cargar categorías' }
    }
    return { success: true, data: (data as ApiCategory[]).map(mapApiToCategory) }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}

export async function getCategory(id: string): Promise<ApiResult<Category>> {
  try {
    const res  = await fetchWithAuth(`${BASE}/${id}`)
    const data = await res.json() as ApiCategory | { error?: string; message?: string }
    if (!res.ok) {
      const err = data as { error?: string; message?: string }
      return { success: false, error: err.error || err.message || 'Error al cargar la categoría' }
    }
    return { success: true, data: mapApiToCategory(data as ApiCategory) }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}

export async function createCategory(
  payload: { name: string },
): Promise<ApiResult<Category>> {
  try {
    const res  = await fetchWithAuth(BASE, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json() as ApiCategory | { error?: string; message?: string; errors?: Record<string, string[]> }
    if (!res.ok) {
      const err = data as { error?: string; message?: string; errors?: Record<string, string[]> }
      return { success: false, error: err.error || err.message || 'Error al crear', errors: err.errors }
    }
    return { success: true, data: mapApiToCategory(data as ApiCategory) }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}

export async function updateCategory(
  id: string,
  payload: { name: string },
): Promise<ApiResult<Category>> {
  try {
    const res  = await fetchWithAuth(`${BASE}/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json() as ApiCategory | { error?: string; message?: string; errors?: Record<string, string[]> }
    if (!res.ok) {
      const err = data as { error?: string; message?: string; errors?: Record<string, string[]> }
      return { success: false, error: err.error || err.message || 'Error al actualizar', errors: err.errors }
    }
    return { success: true, data: mapApiToCategory(data as ApiCategory) }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}

export async function deleteCategory(id: string): Promise<ApiResult> {
  try {
    const res  = await fetchWithAuth(`${BASE}/${id}`, { method: 'DELETE' })
    const data = await res.json() as { error?: string; message?: string }
    if (!res.ok) {
      return { success: false, error: data.error || data.message || 'Error al eliminar' }
    }
    return { success: true }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}
