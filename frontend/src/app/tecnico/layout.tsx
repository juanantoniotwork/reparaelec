'use client'

import useAuth from '@/hooks/useAuth'
import DarkModeToggle from '@/components/DarkModeToggle'
import { LogOut, User, MessageSquare, History } from 'lucide-react'
import Link from 'next/link'

export default function TecnicoLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">
              Reparaelec{' '}
              <span className="text-gray-400 dark:text-gray-500 font-normal">Técnico</span>
            </h1>
            <nav className="hidden md:flex space-x-6">
              <Link
                href="/tecnico/chat"
                className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <MessageSquare className="w-4 h-4 mr-1.5" />
                Chat Asistente
              </Link>
              <Link
                href="/tecnico/historial"
                className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <History className="w-4 h-4 mr-1.5" />
                Mi Historial
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-2">
            <DarkModeToggle />
            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
              <User className="w-4 h-4 mr-2" />
              {user?.name ?? 'Técnico'}
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-4 overflow-hidden text-gray-900 dark:text-gray-100">
        {children}
      </main>

    </div>
  )
}
