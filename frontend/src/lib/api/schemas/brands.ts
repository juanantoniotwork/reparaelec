import { z } from 'zod'

export const createBrandSchema = z.object({
  name:        z.string().min(1, 'El nombre es obligatorio').max(255),
  category_id: z.number().int().positive('La categoría es obligatoria'),
})

export const updateBrandSchema = z.object({
  name:        z.string().min(1, 'El nombre es obligatorio').max(255),
  category_id: z.number().int().positive().optional(),
})

export type CreateBrandInput = z.infer<typeof createBrandSchema>
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>
