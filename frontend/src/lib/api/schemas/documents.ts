import { z } from 'zod'

// Los documentos usan multipart/form-data — no se valida el body JSON con validateBody().
// Estos schemas son de referencia para los tipos de los campos de texto.
// La validación real la hace Laravel en el backend.

export const createDocumentSchema = z.object({
  title:        z.string().min(1, 'El título es obligatorio').max(255),
  category_ids: z.array(z.number().int().positive()).optional(),
  brand_id:     z.number().int().positive().nullable().optional(),
  // file: File — no validable con Zod en server-side route handler
})

export const updateDocumentSchema = z.object({
  title:        z.string().min(1, 'El título es obligatorio').max(255),
  category_ids: z.array(z.number().int().positive()).optional(),
  brand_id:     z.number().int().positive().nullable().optional(),
  // file: File — opcional en update
})

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>
