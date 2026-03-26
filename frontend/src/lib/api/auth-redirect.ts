/**
 * fetchWithAuth — wrapper de fetch que redirige a "/" en caso de 401.
 *
 * Reparaelec usa autenticación Bearer con Sanctum.
 * El token se guarda en localStorage bajo la clave "access_token".
 * La página de login es "/" (raíz).
 */

interface FetchWithAuthOptions extends RequestInit {
  /** Si true, no redirige en caso de 401 (útil para el propio endpoint de login). */
  skipAuthRedirect?: boolean
}

export async function fetchWithAuth(
  url: string,
  options?: FetchWithAuthOptions,
): Promise<Response> {
  const { skipAuthRedirect, ...fetchOptions } = options ?? {}

  // Añadir cabecera Authorization si hay token disponible (solo en cliente)
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token && fetchOptions.headers) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        Authorization: `Bearer ${token}`,
      }
    } else if (token) {
      fetchOptions.headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }
    }
  }

  const response = await fetch(url, fetchOptions)

  if (response.status === 401 && typeof window !== 'undefined' && !skipAuthRedirect) {
    // Limpiar credenciales y redirigir al login
    localStorage.removeItem('access_token')
    localStorage.removeItem('role')
    localStorage.removeItem('user')
    window.location.href = '/'
    // Promesa que nunca resuelve para detener el flujo en el llamador
    return new Promise(() => {})
  }

  return response
}
