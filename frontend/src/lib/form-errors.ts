/**
 * form-errors.ts — Mapeo de errores de la API a campos de react-hook-form.
 *
 * Uso:
 *   const { unmappedErrors } = handleApiErrors({
 *     errors: result.errors,
 *     fieldMap: { name: 'name', tipo_evento_id: 'tipoEvento' },
 *     setError,
 *     defaultError: result.error,
 *   })
 *   if (unmappedErrors.length > 0) setApiError(unmappedErrors.join('. '))
 */

import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

/** Relación entre campos snake_case de la API y campos camelCase del form. */
export type FieldMap<TForm extends FieldValues> = Partial<Record<string, Path<TForm>>>

interface HandleApiErrorsOptions<TForm extends FieldValues> {
  /** Errores de validación por campo devueltos por Laravel (422). */
  errors?: Record<string, string[]>
  /** Mapeo de campo API (snake_case) → campo del form (camelCase). */
  fieldMap: FieldMap<TForm>
  /** setError de react-hook-form para asignar errores a campos concretos. */
  setError: UseFormSetError<TForm>
  /** Mensaje de error genérico (fallback si errors está vacío). */
  defaultError?: string
}

interface HandleApiErrorsResult {
  /** Mensajes de error que no pudieron mapearse a ningún campo del form. */
  unmappedErrors: string[]
}

export function handleApiErrors<TForm extends FieldValues>({
  errors,
  fieldMap,
  setError,
  defaultError,
}: HandleApiErrorsOptions<TForm>): HandleApiErrorsResult {
  const unmappedErrors: string[] = []

  if (!errors || Object.keys(errors).length === 0) {
    if (defaultError) unmappedErrors.push(defaultError)
    return { unmappedErrors }
  }

  for (const [apiField, messages] of Object.entries(errors)) {
    const formField = fieldMap[apiField]
    const message = messages[0] ?? 'Error'

    if (formField) {
      setError(formField, { type: 'server', message })
    } else {
      unmappedErrors.push(message)
    }
  }

  return { unmappedErrors }
}
