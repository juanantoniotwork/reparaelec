'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const PER_PAGE_OPTIONS = [5, 10, 20, 50]

interface PaginationControlsProps {
  currentPage: number
  lastPage: number
  total: number
  perPage: number
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
}

export function PaginationControls({
  currentPage,
  lastPage,
  total,
  perPage,
  onPageChange,
  onPerPageChange,
}: PaginationControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-gray-100 dark:border-gray-700">
      {/* Selector filas por página */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">Filas por página:</span>
        <Select
          value={String(perPage)}
          onValueChange={(v) => { if (v) onPerPageChange(Number(v)) }}
        >
          <SelectTrigger className="h-7 w-16 text-xs border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700">
            <SelectValue>
              {(v: string | null) => v ?? String(perPage)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PER_PAGE_OPTIONS.map(n => (
              <SelectItem key={n} value={String(n)} label={String(n)}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Navegación */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Página {total === 0 ? 0 : currentPage} de {lastPage}
          <span className="ml-1 text-gray-400 dark:text-gray-500">({total} resultados)</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="p-1 rounded border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            disabled={currentPage >= lastPage}
            onClick={() => onPageChange(currentPage + 1)}
            className="p-1 rounded border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="Página siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
