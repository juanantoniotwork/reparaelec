'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, getRole, logout } from '@/lib/auth';

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const currentUser = getUser();
    const currentRole = getRole();
    
    setUser(currentUser);
    setRole(currentRole);
    setLoading(false);
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setRole(null);
    router.push('/');
  };

  return {
    user,
    role,
    loading,
    logout: handleLogout,
  };
}
