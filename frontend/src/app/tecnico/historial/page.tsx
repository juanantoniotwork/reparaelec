'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Calendar, MessageSquare, ChevronRight,
  History, Trash2, Loader2, AlertCircle,
} from 'lucide-react'

import { getMyInteractions, deleteSession, type MyInteraction } from '@/lib/api/chat'
import { Input } from '@/components/ui/input'

// ── Helper ────────────────────────────────────────────────────────────────────

function groupByDate(
  interactions: MyInteraction[],
): [string, MyInteraction[]][] {
  const groups: Record<string, MyInteraction[]> = {}
  for (const item of interactions) {
    const key = new Date(item.created_at).toLocaleDateString('es-ES', {
      weekday: 'long',
      day:     'numeric',
      month:   'long',
      year:    'numeric',
    })
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  }
  return Object.entries(groups)
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HistorialPage() {
  const router = useRouter()

  const [searchTerm, setSearchTerm]       = useState('')
  const [interactions, setInteractions]   = useState<MyInteraction[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)

  useEffect(() => {
    getMyInteractions()
      .then(result => {
        if (result.success) setInteractions(result.data!)
        else setError(result.error || 'No se pudo cargar el historial.')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (e: React.MouseEvent, sessionId: number) => {
    e.stopPropagation()
    if (!confirm('¿Eliminar esta conversación y todos sus mensajes?')) return
    const result = await deleteSession(sessionId)
    if (result.success) {
      setInteractions(prev => prev.filter(i => i.session_id !== sessionId))
    } else {
      alert('No se pudo eliminar la conversación.')
    }
  }

  const filtered = interactions.filter(i =>
    i.query.toLowerCase().includes(searchTerm.toLowerCase()),
  )
  const groups = groupByDate(filtered)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Mi Historial</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Consulta tus conversaciones anteriores</p>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <Input
            type="text"
            placeholder="Buscar por pregunta..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl shadow-sm"
          />
        </div>
      </div>

      {/* Estados */}
      {loading && (
        <div className="py-20 flex justify-center items-center gap-2 text-gray-400 dark:text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Cargando historial...
        </div>
      )}
      {error && (
        <div className="py-8 flex items-center justify-center gap-2 text-red-400 dark:text-red-500">
          <AlertCircle className="w-5 h-5" />{error}
        </div>
      )}

      {!loading && !error && groups.length === 0 && (
        <div className="py-20 text-center text-gray-400 dark:text-gray-500">
          <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>
            {searchTerm
              ? 'No hay resultados para esa búsqueda.'
              : 'No tienes consultas guardadas aún.'}
          </p>
        </div>
      )}

      {!loading && !error && groups.length > 0 && (
        <div className="space-y-8">
          {groups.map(([date, items]) => (
            <div key={date} className="space-y-3">
              <div className="flex items-center text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                <Calendar className="w-4 h-4 mr-2" />
                {date}
              </div>

              <div className="grid gap-3">
                {items.map(item => (
                  <div
                    key={item.id}
                    onClick={() => router.push(`/tecnico/chat?session=${item.session_id}`)}
                    className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 flex items-center justify-between hover:shadow-md hover:border-blue-100 dark:hover:border-blue-700 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center space-x-4 min-w-0">
                      <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-xl text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors flex-shrink-0">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-gray-900 dark:text-gray-100 truncate">
                          {item.query}
                        </h4>
                        <div className="flex items-center mt-1 space-x-3 text-xs text-gray-500 dark:text-gray-400">
                          <span>
                            {new Date(item.created_at).toLocaleTimeString('es-ES', {
                              hour:   '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span>•</span>
                          <span className="truncate max-w-xs text-gray-400 dark:text-gray-500">
                            {item.response.slice(0, 80)}
                            {item.response.length > 80 ? '…' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      <button
                        onClick={e => handleDelete(e, item.session_id)}
                        className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Eliminar conversación"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
