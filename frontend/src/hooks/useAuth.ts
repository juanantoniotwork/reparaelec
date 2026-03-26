'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, type AuthUser } from '@/lib/auth-simple'
import { logoutUser } from '@/lib/api/auth'

interface UseAuthReturn {
  user:    AuthUser | null
  loading: boolean
  logout:  () => Promise<void>
}

export default function useAuth(): UseAuthReturn {
  const [user, setUser]       = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    setUser(getCurrentUser())
    setLoading(false)
  }, [])

  const handleLogout = async () => {
    await logoutUser()
    setUser(null)
    router.push('/')
  }

  return { user, loading, logout: handleLogout }
}
