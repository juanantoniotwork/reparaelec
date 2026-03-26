import { z } from 'zod'

export const createCategorySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(255),
})

export const updateCategorySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(255),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
