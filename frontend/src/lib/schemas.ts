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

// ── Usuarios ───────────────────────────────────────────────────────────────────

export const createUserFormSchema = z.object({
  name:     requiredString('El nombre es obligatorio'),
  email:    z.string().min(1, 'El email es obligatorio').email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  role:     z.enum(['admin', 'tecnico'], { error: 'Selecciona un rol' }),
})

export type CreateUserForm = z.infer<typeof createUserFormSchema>

export const editUserFormSchema = z.object({
  name:            requiredString('El nombre es obligatorio'),
  email:           z.string().min(1, 'El email es obligatorio').email('Email inválido'),
  role:            z.enum(['admin', 'tecnico']),
  language:        z.string(),
  isActive:        z.boolean(),
  newPassword:     z.string(),
  confirmPassword: z.string(),
}).refine(
  (d) => !d.newPassword || d.newPassword.length >= 8,
  { message: 'Mínimo 8 caracteres', path: ['newPassword'] },
).refine(
  (d) => !d.newPassword || d.newPassword === d.confirmPassword,
  { message: 'Las contraseñas no coinciden', path: ['confirmPassword'] },
)

export type EditUserForm = z.infer<typeof editUserFormSchema>

// ── Documentos ──────────────────────────────────────────────────────────────────

export const documentFormSchema = z.object({
  title:      requiredString('El título es obligatorio'),
  categoryId: requiredString('La categoría es obligatoria'),
  brandId:    z.string(),
})

export type DocumentForm = z.infer<typeof documentFormSchema>

// ── Configuración (settings) ──────────────────────────────────────────────────

/**
 * Valida los valores de los settings conocidos.
 * Usa z.record para permitir claves desconocidas (settings futuros del backend).
 */
export const settingsFormSchema = z.record(z.string(), z.string()).superRefine((data, ctx) => {
  const addErr = (key: string, msg: string) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: [key] })

  if ('rag_chunks' in data) {
    const v = Number(data.rag_chunks)
    if (!Number.isInteger(v) || v < 1 || v > 20)
      addErr('rag_chunks', 'Entero entre 1 y 20')
  }
  if ('cache_threshold' in data) {
    const v = Number(data.cache_threshold)
    if (isNaN(v) || v < 0 || v > 1)
      addErr('cache_threshold', 'Decimal entre 0.00 y 1.00')
  }
  if ('chunk_size' in data) {
    const v = Number(data.chunk_size)
    if (!Number.isInteger(v) || v < 100 || v > 8000)
      addErr('chunk_size', 'Entero entre 100 y 8000')
  }
  if ('max_tokens' in data) {
    const v = Number(data.max_tokens)
    if (!Number.isInteger(v) || v < 100 || v > 8192)
      addErr('max_tokens', 'Entero entre 100 y 8192')
  }
  if ('ollama_timeout' in data) {
    const v = Number(data.ollama_timeout)
    if (!Number.isInteger(v) || v < 10 || v > 600)
      addErr('ollama_timeout', 'Entero entre 10 y 600')
  }
  if ('default_model' in data) {
    if (!data.default_model?.trim())
      addErr('default_model', 'El modelo no puede estar vacío')
  }
})

export type SettingsForm = z.infer<typeof settingsFormSchema>

// ── Interacciones (filtros) ────────────────────────────────────────────────────

export const interactionFilterSchema = z.object({
  feedback: z.string(),
  userId:   z.string(),
  dateFrom: z.string(),
  dateTo:   z.string(),
})

export type InteractionFilterForm = z.infer<typeof interactionFilterSchema>
