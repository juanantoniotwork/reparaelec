'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import type { AuthUser } from '@/lib/auth-simple'

interface UseAuthReturn {
  user:    AuthUser | null
  loading: false
  logout:  () => Promise<void>
}

export default function useAuth(): UseAuthReturn {
  const router  = useRouter()
  const user    = useAuthStore(s => s.user)
  const logout  = useAuthStore(s => s.logout)

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  return { user, loading: false, logout: handleLogout }
}
