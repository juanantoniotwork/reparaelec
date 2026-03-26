import { z } from 'zod'

// El backend espera un array de { key, value }
export const updateSettingsSchema = z.array(
  z.object({
    key:   z.string().min(1),
    value: z.string(),
  }),
)

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>
