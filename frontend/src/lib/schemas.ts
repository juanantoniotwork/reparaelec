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
