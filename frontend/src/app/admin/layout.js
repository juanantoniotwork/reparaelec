'use client';

import Link from 'next/link';
import useAuth from '@/hooks/useAuth';
import { LayoutDashboard, Users, Tags, FileText, MessageSquare, LogOut } from 'lucide-react';

export default function AdminLayout({ children }) {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-blue-600">Reparaelec</h1>
          <p className="text-xs text-gray-500 uppercase mt-1">Panel de Control</p>
        </div>
        <nav className="mt-6">
          <Link href="/admin/dashboard" className="flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600">
            <LayoutDashboard className="w-5 h-5 mr-3" />
            Dashboard
          </Link>
          <Link href="/admin/usuarios" className="flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600">
            <Users className="w-5 h-5 mr-3" />
            Usuarios
          </Link>
          <Link href="/admin/categorias" className="flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600">
            <Tags className="w-5 h-5 mr-3" />
            Categorías
          </Link>
          <Link href="/admin/documentos" className="flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600">
            <FileText className="w-5 h-5 mr-3" />
            Documentos
          </Link>
          <Link href="/admin/interacciones" className="flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600">
            <MessageSquare className="w-5 h-5 mr-3" />
            Interacciones
          </Link>
        </nav>
        <div className="absolute bottom-0 w-64 p-6">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
