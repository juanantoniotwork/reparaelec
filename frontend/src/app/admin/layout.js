'use client';

import Link from 'next/link';
import useAuth from '@/hooks/useAuth';
import DarkModeToggle from '@/components/DarkModeToggle';
import { LayoutDashboard, Users, Tags, FileText, MessageSquare, Settings, LogOut } from 'lucide-react';

export default function AdminLayout({ children }) {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-900 shadow-md dark:shadow-gray-950 flex flex-col">
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Reparaelec</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mt-1">Panel de Control</p>
          </div>
          <DarkModeToggle />
        </div>
        <nav className="mt-2 flex-1">
          <Link href="/admin/dashboard" className="flex items-center px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400">
            <LayoutDashboard className="w-5 h-5 mr-3" />
            Dashboard
          </Link>
          <Link href="/admin/usuarios" className="flex items-center px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400">
            <Users className="w-5 h-5 mr-3" />
            Usuarios
          </Link>
          <Link href="/admin/categorias" className="flex items-center px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400">
            <Tags className="w-5 h-5 mr-3" />
            Categorías
          </Link>
          <Link href="/admin/documentos" className="flex items-center px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400">
            <FileText className="w-5 h-5 mr-3" />
            Documentos
          </Link>
          <Link href="/admin/interacciones" className="flex items-center px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400">
            <MessageSquare className="w-5 h-5 mr-3" />
            Interacciones
          </Link>
          <Link href="/admin/configuracion" className="flex items-center px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400">
            <Settings className="w-5 h-5 mr-3" />
            Configuración
          </Link>
        </nav>
        <div className="p-6">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-800 rounded-md"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto text-gray-900 dark:text-gray-100">
        {children}
      </main>
    </div>
  );
}
