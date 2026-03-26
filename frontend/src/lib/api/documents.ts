/**
 * lib/api/documents.ts — Capa API cliente para el módulo Documentos.
 *
 * Tipos duales:
 *   ApiDocument  → snake_case, id: number  (backend)
 *   Document     → camelCase, id: string   (frontend)
 *
 * POST/PUT usan multipart/form-data (archivo PDF/DOC).
 * El header Content-Type NO se fija manualmente: el browser genera el boundary.
 */

import { fetchWithAuth } from '@/lib/api/auth-redirect'
import type { ApiResult } from '@/lib/api/types'

// ── Tipos de la API (snake_case) ──────────────────────────────────────────────

interface ApiDocCategory {
  id: number
  name: string
  slug: string
}

interface ApiDocBrand {
  id: number
  name: string
  slug?: string
}

interface ApiDocumentChunk {
  id: number
  content: string
  page_number?: number | null
  section?: string | null
  token_count?: number | null
}

interface ApiDocument {
  id: number
  title: string
  original_filename: string
  status: 'pending' | 'processing' | 'processed' | 'error'
  categories?: ApiDocCategory[]
  brand?: ApiDocBrand | null
  brand_id?: number | null
  created_at: string
  updated_at?: string
  summary?: string | null
  chunks?: ApiDocumentChunk[]
}

// ── Tipos del frontend (camelCase) ────────────────────────────────────────────

export interface DocumentChunk {
  id: string
  content: string
  pageNumber: number | null
  section: string | null
  tokenCount: number | null
}

export type DocumentStatus = 'pending' | 'processing' | 'processed' | 'error'

export interface Document {
  id: string
  title: string
  originalFilename: string
  status: DocumentStatus
  categories: { id: string; name: string; slug: string }[]
  brand: { id: string; name: string } | null
  brandId: string | null
  createdAt: string
  summary: string | null
  chunks?: DocumentChunk[]
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function mapApiToDocument(api: ApiDocument): Document {
  return {
    id:               String(api.id),
    title:            api.title,
    originalFilename: api.original_filename,
    status:           api.status,
    categories:       (api.categories ?? []).map(c => ({
      id:   String(c.id),
      name: c.name,
      slug: c.slug,
    })),
    brand:     api.brand ? { id: String(api.brand.id), name: api.brand.name } : null,
    brandId:   api.brand_id != null ? String(api.brand_id) : null,
    createdAt: api.created_at,
    summary:   api.summary ?? null,
    chunks:    api.chunks?.map(ch => ({
      id:         String(ch.id),
      content:    ch.content,
      pageNumber: ch.page_number ?? null,
      section:    ch.section ?? null,
      tokenCount: ch.token_count ?? null,
    })),
  }
}

// ── Base URL ──────────────────────────────────────────────────────────────────

const BASE = '/api/admin/documents'

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function getDocuments(params?: {
  categoryId?: string
  brandId?: string
}): Promise<ApiResult<Document[]>> {
  try {
    const qs = new URLSearchParams()
    if (params?.categoryId) qs.set('category_id', params.categoryId)
    if (params?.brandId)    qs.set('brand_id', params.brandId)
    const url = qs.toString() ? `${BASE}?${qs}` : BASE
    const res  = await fetchWithAuth(url)
    const data = await res.json() as ApiDocument[] | { error?: string; message?: string }
    if (!res.ok) {
      const err = data as { error?: string; message?: string }
      return { success: false, error: err.error || err.message || 'Error al cargar documentos' }
    }
    return { success: true, data: (data as ApiDocument[]).map(mapApiToDocument) }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}

export async function getDocument(id: string): Promise<ApiResult<Document>> {
  try {
    const res  = await fetchWithAuth(`${BASE}/${id}`)
    const data = await res.json() as ApiDocument | { error?: string; message?: string }
    if (!res.ok) {
      const err = data as { error?: string; message?: string }
      return { success: false, error: err.error || err.message || 'Error al cargar el documento' }
    }
    return { success: true, data: mapApiToDocument(data as ApiDocument) }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}

// POST usa multipart/form-data — NO fijar Content-Type para que el browser genere el boundary.
export async function createDocument(formData: FormData): Promise<ApiResult<Document>> {
  try {
    const res  = await fetchWithAuth(BASE, {
      method:  'POST',
      headers: { Accept: 'application/json' },
      body:    formData,
    })
    const data = await res.json() as ApiDocument | { error?: string; message?: string; errors?: Record<string, string[]> }
    if (!res.ok) {
      const err = data as { error?: string; message?: string; errors?: Record<string, string[]> }
      return { success: false, error: err.error || err.message || 'Error al crear', errors: err.errors }
    }
    return { success: true, data: mapApiToDocument(data as ApiDocument) }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}

// PUT usa multipart/form-data. El archivo es opcional en updates.
export async function updateDocument(
  id: string,
  formData: FormData,
): Promise<ApiResult<Document>> {
  try {
    const res  = await fetchWithAuth(`${BASE}/${id}`, {
      method:  'PUT',
      headers: { Accept: 'application/json' },
      body:    formData,
    })
    const data = await res.json() as ApiDocument | { error?: string; message?: string; errors?: Record<string, string[]> }
    if (!res.ok) {
      const err = data as { error?: string; message?: string; errors?: Record<string, string[]> }
      return { success: false, error: err.error || err.message || 'Error al actualizar', errors: err.errors }
    }
    return { success: true, data: mapApiToDocument(data as ApiDocument) }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}

export async function deleteDocument(id: string): Promise<ApiResult> {
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
