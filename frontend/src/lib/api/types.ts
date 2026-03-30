/**
 * Tipo de retorno estándar para todas las funciones de la capa API.
 * success: false + error/errors cuando algo va mal.
 * success: true  + data cuando va bien.
 */
export interface ApiResult<T = void> {
  success: boolean
  data?: T
  error?: string
  errors?: Record<string, string[]>  // Errores de validación por campo (Laravel 422)
  message?: string
}

/**
 * Respuesta paginada del backend (Laravel paginate()).
 */
export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

/**
 * Versión camelCase de PaginatedResponse para uso en el frontend.
 */
export interface Paginated<T> {
  items: T[]
  currentPage: number
  lastPage: number
  perPage: number
  total: number
}

/**
 * Respuesta de recurso único envuelta en { data: T }.
 * Algunos endpoints de Laravel usan este formato con API Resources.
 */
export interface SingleResponse<T> {
  data: T
}
