/**
 * schemas.ts — Schemas Zod para formularios del frontend (camelCase, mensajes en español).
 *
 * Estos schemas validan los datos del formulario antes de enviarlos a la API.
 * Para los schemas de validación en API routes (snake_case), ver lib/api/schemas/.
 */

import { z } from 'zod'

// ── Helpers ───────────────────────────────────────────────────────────────────

const requiredString = (msg = 'Campo obligatorio') =>
  z.string().min(1, msg).max(255, 'Máximo 255 caracteres')

// ── Categorías ────────────────────────────────────────────────────────────────

export const categoryFormSchema = z.object({
  name: requiredString('El nombre es obligatorio'),
})

export type CategoryForm = z.infer<typeof categoryFormSchema>

// ── Marcas ─────────────────────────────────────────────────────────────────────

export const brandFormSchema = z.object({
  name:       requiredString('El nombre es obligatorio'),
  categoryId: requiredString('La categoría es obligatoria'),
})

export type BrandForm = z.infer<typeof brandFormSchema>
