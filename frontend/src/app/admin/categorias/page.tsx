'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Tag, Trash2, Plus, AlertCircle, FileText,
  RefreshCw, Loader2, MoreVertical, Pencil,
} from 'lucide-react'

import {
  getCategories, createCategory, updateCategory, deleteCategory,
  type Category,
} from '@/lib/api/categories'
import { categoryFormSchema, type CategoryForm } from '@/lib/schemas'
import { handleApiErrors, type FieldMap } from '@/lib/form-errors'
import { PaginationControls } from '@/components/ui/pagination-controls'

import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog'

// Mapeo snake_case API → camelCase form (categorías solo tiene "name")
const apiFieldMap: FieldMap<CategoryForm> = { name: 'name' }

export default function CategoriasPage() {
  const [categories, setCategories]   = useState<Category[]>([])
  const [loading, setLoading]         = useState(true)
  const [fetchError, setFetchError]   = useState('')

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage]       = useState(1)
  const [total, setTotal]             = useState(0)
  const [perPage, setPerPage]         = useState(10)

  // Formulario (crear / editar)
  const [dialogOpen, setDialogOpen]           = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [apiError, setApiError]               = useState<string | null>(null)

  // Confirmación de borrado
  const [deleteDialogOpen, setDeleteDialogOpen]     = useState(false)
  const [categoryToDelete, setCategoryToDelete]     = useState<Category | null>(null)
  const [isDeleting, setIsDeleting]                 = useState(false)
  const [deleteError, setDeleteError]               = useState<string | null>(null)

  // Dropdown ⋮
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [dropdownPos, setDropdownPos]   = useState({ top: 0, right: 0 })

  // ── react-hook-form ─────────────────────────────────────────────────────────
  const {
    register, handleSubmit, reset, setError, clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<CategoryForm>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: '' },
  })

  // ── Carga ────────────────────────────────────────────────────────────────────
  const loadCategories = useCallback(async (page: number, pp: number) => {
    setLoading(true)
    setFetchError('')
    const result = await getCategories({ page, per_page: pp })
    if (result.success && result.data) {
      setCategories(result.data.items)
      setCurrentPage(result.data.currentPage)
      setLastPage(result.data.lastPage)
      setTotal(result.data.total)
    } else {
      setFetchError(result.error || 'No se pudieron cargar las categorías.')
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadCategories(currentPage, perPage) }, [loadCategories, currentPage, perPage])

  // Cierra el dropdown al hacer clic fuera
  useEffect(() => {
    const close = () => setOpenDropdown(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  // ── Dialog crear / editar ────────────────────────────────────────────────────
  const openCreateDialog = () => {
    setEditingCategory(null)
    setApiError(null)
    clearErrors()
    reset({ name: '' })
    setDialogOpen(true)
    setOpenDropdown(null)
  }

  const openEditDialog = (cat: Category) => {
    setEditingCategory(cat)
    setApiError(null)
    clearErrors()
    reset({ name: cat.name })
    setDialogOpen(true)
    setOpenDropdown(null)
  }

  const closeDialog = () => {
    if (isSubmitting) return
    setDialogOpen(false)
    setTimeout(() => {
      setEditingCategory(null)
      setApiError(null)
      clearErrors()
    }, 150)
  }

  const onSubmit = async (data: CategoryForm) => {
    setApiError(null)
    clearErrors()

    const result = editingCategory
      ? await updateCategory(editingCategory.id, { name: data.name })
      : await createCategory({ name: data.name })

    if (result.success) {
      closeDialog()
      await loadCategories(currentPage, perPage)
    } else {
      const { unmappedErrors } = handleApiErrors<CategoryForm>({
        errors:       result.errors,
        fieldMap:     apiFieldMap,
        setError,
        defaultError: result.error,
      })
      if (unmappedErrors.length > 0) setApiError(unmappedErrors.join('. '))
    }
  }

  // ── Dialog eliminar ──────────────────────────────────────────────────────────
  const openDeleteDialog = (cat: Category) => {
    setCategoryToDelete(cat)
    setDeleteError(null)
    setDeleteDialogOpen(true)
    setOpenDropdown(null)
  }

  const confirmDelete = async () => {
    if (!categoryToDelete) return
    setIsDeleting(true)
    setDeleteError(null)
    const result = await deleteCategory(categoryToDelete.id)
    setIsDeleting(false)
    if (result.success) {
      setDeleteDialogOpen(false)
      setCategoryToDelete(null)
      await loadCategories(currentPage, perPage)
    } else {
      setDeleteError(result.error || 'Error al eliminar la categoría.')
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Categorías</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Organiza tus documentos técnicos</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 gap-2">
          <Plus className="w-4 h-4" />
          Nueva categoría
        </Button>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center text-gray-400 dark:text-gray-500">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p>Cargando categorías...</p>
          </div>
        ) : fetchError ? (
          <div className="p-20 flex flex-col items-center text-gray-500 dark:text-gray-400">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="font-medium">{fetchError}</p>
            <button
              onClick={() => loadCategories(currentPage, perPage)}
              className="mt-4 flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Reintentar
            </button>
          </div>
        ) : categories.length === 0 ? (
          <div className="p-16 text-center text-gray-400 dark:text-gray-500">
            <Tag className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No hay categorías registradas.</p>
            <button
              onClick={openCreateDialog}
              className="text-blue-600 dark:text-blue-400 font-medium mt-2 hover:underline text-sm"
            >
              Crea tu primera categoría
            </button>
          </div>
        ) : (
          <>
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold">Nombre</th>
                  <th className="px-6 py-4 text-sm font-semibold">Slug</th>
                  <th className="px-6 py-4 text-sm font-semibold">Documentos</th>
                  <th className="px-6 py-4 text-sm font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {categories.map(cat => (
                  <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg">
                          <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        /{cat.slug}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                        <FileText className="w-4 h-4" />
                        {cat.documentsCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.nativeEvent.stopImmediatePropagation()
                          if (openDropdown === cat.id) {
                            setOpenDropdown(null)
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                            setOpenDropdown(cat.id)
                          }
                        }}
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <PaginationControls
              currentPage={currentPage}
              lastPage={lastPage}
              total={total}
              perPage={perPage}
              onPageChange={(p) => setCurrentPage(p)}
              onPerPageChange={(pp) => { setPerPage(pp); setCurrentPage(1) }}
            />
          </>
        )}
      </div>

      {/* Dropdown ⋮ — fixed para no ser recortado por overflow */}
      {openDropdown !== null && (() => {
        const activeCat = categories.find(c => c.id === openDropdown)
        if (!activeCat) return null
        return (
          <div
            style={{ position: 'fixed', top: dropdownPos.top, right: dropdownPos.right }}
            className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[130px] py-1"
            onClick={(e) => e.nativeEvent.stopImmediatePropagation()}
          >
            <button
              onClick={() => openEditDialog(activeCat)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" /> Editar
            </button>
            <button
              onClick={() => openDeleteDialog(activeCat)}
              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Eliminar
            </button>
          </div>
        )
      })()}

      {/* ── Dialog: crear / editar ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        >
          <DialogHeader className="border-b border-gray-100 dark:border-gray-700 -mx-4 -mt-4 px-6 py-4 bg-gray-50 dark:bg-gray-900 rounded-t-xl">
            <DialogTitle className="text-base font-bold text-gray-800 dark:text-gray-100">
              {editingCategory ? 'Editar categoría' : 'Nueva categoría'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {/* Error general */}
            {apiError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {apiError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="cat-name" className="text-gray-700 dark:text-gray-300">
                Nombre de la categoría
              </Label>
              <Input
                id="cat-name"
                {...register('name')}
                aria-invalid={!!errors.name}
                placeholder="Ej: Televisores, Microondas..."
                autoFocus
                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 h-10"
              />
              {errors.name && (
                <p className="text-red-500 text-xs font-medium">{errors.name.message}</p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500">
                El slug se generará automáticamente a partir del nombre.
              </p>
            </div>

            <DialogFooter className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
              <DialogClose
                render={
                  <Button
                    variant="outline"
                    type="button"
                    className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                  />
                }
              >
                Cancelar
              </DialogClose>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" />&nbsp;Guardando...</>
                  : editingCategory ? 'Actualizar' : 'Crear categoría'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog: confirmar eliminación ────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open && !isDeleting) { setDeleteDialogOpen(false); setCategoryToDelete(null); setDeleteError(null) } }}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-100">
              ¿Eliminar categoría?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 dark:text-gray-400">
              Se eliminará <strong className="text-gray-700 dark:text-gray-300">{categoryToDelete?.name}</strong>.
              Esta acción no se puede deshacer. Los documentos asociados perderán esta categoría.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {deleteError}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              onClick={() => { setCategoryToDelete(null); setDeleteError(null) }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting
                ? <><Loader2 className="w-4 h-4 animate-spin" />&nbsp;Eliminando...</>
                : <><Trash2 className="w-4 h-4" />&nbsp;Eliminar</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
