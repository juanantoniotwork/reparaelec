import { z } from 'zod'

export const createUserSchema = z.object({
  name:     z.string().min(1, 'El nombre es obligatorio').max(255),
  email:    z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  role:     z.enum(['admin', 'tecnico']),
})

export const updateUserSchema = z.object({
  name:                  z.string().min(1).max(255).optional(),
  email:                 z.string().email().optional(),
  password:              z.string().min(8).optional(),
  password_confirmation: z.string().optional(),
  role:                  z.enum(['admin', 'tecnico']).optional(),
  is_active:             z.boolean().optional(),
  language:              z.string().max(10).optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
