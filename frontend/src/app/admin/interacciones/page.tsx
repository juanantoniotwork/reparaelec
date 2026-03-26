'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Download, Search, X, Loader2, AlertCircle } from 'lucide-react'

import { getInteractions, type Interaction } from '@/lib/api/interactions'
import { getUsers, type User } from '@/lib/api/users'
import { interactionFilterSchema, type InteractionFilterForm } from '@/lib/schemas'

import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  return (text ?? '')
    .replace(/#{1,6}\s+/g, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/^\s*>\s+/gm, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .trim()
}

function exportCSV(data: Interaction[]) {
  const headers = ['ID', 'Usuario', 'Pregunta', 'Respuesta', 'Valoración', 'Fecha', 'Tiempo respuesta (ms)', 'Desde caché']
  const rows = data.map(i => {
    const respuesta = stripMarkdown(i.response).slice(0, 500)
    return [
      i.id,
      i.user?.name ?? '',
      `"${(i.query ?? '').replace(/"/g, '""')}"`,
      `"${respuesta.replace(/"/g, '""')}"`,
      i.feedback ?? '',
      new Date(i.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }),
      i.responseTimeMs ?? '',
      i.fromCache ? 'Sí' : 'No',
    ]
  })
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `interacciones_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── FeedbackBadge ─────────────────────────────────────────────────────────────

function FeedbackBadge({ value }: { value: Interaction['feedback'] }) {
  if (value === 'positive') {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
        👍 Positivo
      </span>
    )
  }
  if (value === 'negative') {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300">
        👎 Negativo
      </span>
    )
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
      Sin valorar
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const EMPTY_FILTERS: InteractionFilterForm = { feedback: '', userId: '', dateFrom: '', dateTo: '' }

export default function InteraccionesPage() {
  const router = useRouter()

  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [users, setUsers]               = useState<User[]>([])
  const [loading, setLoading]           = useState(true)
  const [fetchError, setFetchError]     = useState('')

  const {
    register, handleSubmit, reset, control, watch,
    formState: { isSubmitting },
  } = useForm<InteractionFilterForm>({
    resolver:      zodResolver(interactionFilterSchema),
    defaultValues: EMPTY_FILTERS,
  })

  const currentValues = watch()

  const hasActiveFilters = !!(
    currentValues.feedback || currentValues.userId ||
    currentValues.dateFrom || currentValues.dateTo
  )

  const fetchInteractions = useCallback(async (filters: InteractionFilterForm) => {
    setLoading(true)
    setFetchError('')
    const result = await getInteractions({
      feedback: filters.feedback  || undefined,
      userId:   filters.userId    || undefined,
      dateFrom: filters.dateFrom  || undefined,
      dateTo:   filters.dateTo    || undefined,
    })
    if (result.success) {
      setInteractions(result.data!)
    } else {
      setFetchError(result.error || 'No se pudieron cargar las interacciones.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchInteractions(EMPTY_FILTERS)
    getUsers().then(r => { if (r.success) setUsers(r.data!) }).catch(() => {})
  }, [fetchInteractions])

  const onSubmit = (data: InteractionFilterForm) => fetchInteractions(data)

  const handleReset = () => {
    reset(EMPTY_FILTERS)
    fetchInteractions(EMPTY_FILTERS)
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Interacciones</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Historial de consultas de todos los técnicos</p>
        </div>
        <Button
          onClick={() => exportCSV(interactions)}
          disabled={interactions.length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex flex-wrap gap-3 items-end shadow-sm"
      >
        {/* Feedback */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">Feedback</Label>
          <Controller
            name="feedback"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => field.onChange(v === '__all__' ? '' : v)}>
                <SelectTrigger className="h-9 min-w-[140px] border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  <SelectItem value="positive">👍 Positivo</SelectItem>
                  <SelectItem value="negative">👎 Negativo</SelectItem>
                  <SelectItem value="none">Sin valorar</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Usuario */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">Usuario</Label>
          <Controller
            name="userId"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => field.onChange(v === '__all__' ? '' : v)}>
                <SelectTrigger className="h-9 min-w-[160px] border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Desde */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">Desde</Label>
          <Input
            type="date"
            {...register('dateFrom')}
            className="h-9 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>

        {/* Hasta */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">Hasta</Label>
          <Input
            type="date"
            {...register('dateTo')}
            className="h-9 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>

        {/* Acciones */}
        <div className="flex gap-2 ml-auto">
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="h-9 px-3 gap-1 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-9 px-4 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Search className="w-4 h-4" />
            Filtrar
          </Button>
        </div>
      </form>

      {/* Estado carga / error */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}
      {fetchError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-5 py-4 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {fetchError}
        </div>
      )}

      {/* Tabla */}
      {!loading && !fetchError && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          {interactions.length === 0 ? (
            <div className="py-16 text-center text-gray-400 dark:text-gray-500 text-sm">
              No hay interacciones con los filtros aplicados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Pregunta</th>
                    <th className="px-4 py-3">Feedback</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Tiempo</th>
                    <th className="px-4 py-3">Caché</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {interactions.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => router.push(`/admin/interacciones/${item.id}`)}
                      className="hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-400 dark:text-gray-500 font-mono text-xs">{item.id}</td>
                      <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
                        {item.user?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate">{item.query}</td>
                      <td className="px-4 py-3"><FeedbackBadge value={item.feedback} /></td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {item.responseTimeMs != null ? `${item.responseTimeMs} ms` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.fromCache
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {item.fromCache ? 'Sí' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
