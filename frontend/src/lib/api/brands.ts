/**
 * lib/api/brands.ts — Capa API cliente para el módulo Marcas.
 *
 * Tipos duales:
 *   ApiBrand  → snake_case, id: number  (backend)
 *   Brand     → camelCase, id: string   (frontend)
 */

import { fetchWithAuth } from '@/lib/api/auth-redirect'
import type { ApiResult, PaginatedResponse, Paginated } from '@/lib/api/types'

// ── Tipos de la API (snake_case) ─────────────────────────────────────────────

interface ApiCategory {
  id: number
  name: string
  slug: string
}

interface ApiBrand {
  id: number
  name: string
  slug: string
  category_id: number
  documents_count?: number
  category?: ApiCategory
  created_at?: string
  updated_at?: string
}

// ── Tipos del frontend (camelCase) ───────────────────────────────────────────

export interface Brand {
  id: string
  name: string
  slug: string
  categoryId: string
  categoryName: string
  documentsCount: number
}

export interface BrandPageParams {
  page?: number
  per_page?: number
  category_id?: string
}

// ── Mapper ───────────────────────────────────────────────────────────────────

function mapApiToBrand(api: ApiBrand): Brand {
  return {
    id:            String(api.id),
    name:          api.name,
    slug:          api.slug,
    categoryId:    String(api.category_id),
    categoryName:  api.category?.name ?? '',
    documentsCount: api.documents_count ?? 0,
  }
}

// ── Base URL ─────────────────────────────────────────────────────────────────

const BASE = '/api/admin/brands'

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function getBrands(
  params?: BrandPageParams,
): Promise<ApiResult<Paginated<Brand>>> {
  try {
    const qs = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : ''
    const url = qs ? `${BASE}?${qs}` : BASE
    const res  = await fetchWithAuth(url)
    const data = await res.json() as PaginatedResponse<ApiBrand> | { error?: string; message?: string }
    if (!res.ok) {
      const err = data as { error?: string; message?: string }
      return { success: false, error: err.error || err.message || 'Error al cargar marcas' }
    }
    const paged = data as PaginatedResponse<ApiBrand>
    return {
      success: true,
      data: {
        items:       paged.data.map(mapApiToBrand),
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

export async function createBrand(
  payload: { name: string; category_id: number },
): Promise<ApiResult<Brand>> {
  try {
    const res  = await fetchWithAuth(BASE, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json() as ApiBrand | { error?: string; message?: string; errors?: Record<string, string[]> }
    if (!res.ok) {
      const err = data as { error?: string; message?: string; errors?: Record<string, string[]> }
      return { success: false, error: err.error || err.message || 'Error al crear', errors: err.errors }
    }
    return { success: true, data: mapApiToBrand(data as ApiBrand) }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}

export async function updateBrand(
  id: string,
  payload: { name: string; category_id?: number },
): Promise<ApiResult<Brand>> {
  try {
    const res  = await fetchWithAuth(`${BASE}/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json() as ApiBrand | { error?: string; message?: string; errors?: Record<string, string[]> }
    if (!res.ok) {
      const err = data as { error?: string; message?: string; errors?: Record<string, string[]> }
      return { success: false, error: err.error || err.message || 'Error al actualizar', errors: err.errors }
    }
    return { success: true, data: mapApiToBrand(data as ApiBrand) }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}

export async function deleteBrand(id: string): Promise<ApiResult> {
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
