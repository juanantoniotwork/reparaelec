'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Bookmark, Trash2, Plus, AlertCircle, FileText,
  RefreshCw, Loader2, MoreVertical, Pencil, Tag, Filter, X,
} from 'lucide-react'

import {
  getBrands, createBrand, updateBrand, deleteBrand,
  type Brand,
} from '@/lib/api/brands'
import { getCategories, type Category } from '@/lib/api/categories'
import { brandFormSchema, type BrandForm } from '@/lib/schemas'
import { handleApiErrors, type FieldMap } from '@/lib/form-errors'

import { Button }  from '@/components/ui/button'
import { Input }   from '@/components/ui/input'
import { Label }   from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog'

const apiFieldMap: FieldMap<BrandForm> = { name: 'name', category_id: 'categoryId' }

export default function MarcasPage() {
  const [brands, setBrands]         = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [filterCategoryId, setFilterCategoryId] = useState('')

  // Formulario (crear / editar)
  const [dialogOpen, setDialogOpen]       = useState(false)
  const [editingBrand, setEditingBrand]   = useState<Brand | null>(null)
  const [apiError, setApiError]           = useState<string | null>(null)

  // Confirmación de borrado
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [brandToDelete, setBrandToDelete]       = useState<Brand | null>(null)
  const [isDeleting, setIsDeleting]             = useState(false)
  const [deleteError, setDeleteError]           = useState<string | null>(null)

  // Dropdown ⋮
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [dropdownPos, setDropdownPos]   = useState({ top: 0, right: 0 })

  // ── react-hook-form ──────────────────────────────────────────────────────────
  const {
    register, handleSubmit, reset, setError, clearErrors, control,
    formState: { errors, isSubmitting },
  } = useForm<BrandForm>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: { name: '', categoryId: '' },
  })

  // ── Carga ────────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    const [brandsRes, catsRes] = await Promise.all([getBrands(), getCategories()])
    if (brandsRes.success && brandsRes.data && catsRes.success && catsRes.data) {
      setBrands(brandsRes.data)
      setCategories(catsRes.data)
    } else {
      setFetchError(brandsRes.error || catsRes.error || 'No se pudieron cargar las marcas.')
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const close = () => setOpenDropdown(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  // ── Filtro ───────────────────────────────────────────────────────────────────
  const filteredBrands = filterCategoryId
    ? brands.filter(b => b.categoryId === filterCategoryId)
    : brands

  // ── Dialog crear / editar ────────────────────────────────────────────────────
  const openCreateDialog = () => {
    setEditingBrand(null)
    setApiError(null)
    clearErrors()
    reset({ name: '', categoryId: filterCategoryId || '' })
    setDialogOpen(true)
    setOpenDropdown(null)
  }

  const openEditDialog = (brand: Brand) => {
    setEditingBrand(brand)
    setApiError(null)
    clearErrors()
    reset({ name: brand.name, categoryId: brand.categoryId })
    setDialogOpen(true)
    setOpenDropdown(null)
  }

  const closeDialog = () => {
    if (isSubmitting) return
    setDialogOpen(false)
    setTimeout(() => {
      setEditingBrand(null)
      setApiError(null)
      clearErrors()
    }, 150)
  }

  const onSubmit = async (data: BrandForm) => {
    setApiError(null)
    clearErrors()

    const result = editingBrand
      ? await updateBrand(editingBrand.id, { name: data.name, category_id: parseInt(data.categoryId) })
      : await createBrand({ name: data.name, category_id: parseInt(data.categoryId) })

    if (result.success) {
      closeDialog()
      await loadData()
    } else {
      const { unmappedErrors } = handleApiErrors<BrandForm>({
        errors:       result.errors,
        fieldMap:     apiFieldMap,
        setError,
        defaultError: result.error,
      })
      if (unmappedErrors.length > 0) setApiError(unmappedErrors.join('. '))
    }
  }

  // ── Dialog eliminar ──────────────────────────────────────────────────────────
  const openDeleteDialog = (brand: Brand) => {
    setBrandToDelete(brand)
    setDeleteError(null)
    setDeleteDialogOpen(true)
    setOpenDropdown(null)
  }

  const confirmDelete = async () => {
    if (!brandToDelete) return
    setIsDeleting(true)
    setDeleteError(null)
    const result = await deleteBrand(brandToDelete.id)
    setIsDeleting(false)
    if (result.success) {
      setDeleteDialogOpen(false)
      setBrandToDelete(null)
      await loadData()
    } else {
      setDeleteError(result.error || 'Error al eliminar la marca.')
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Marcas</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gestiona las marcas por categoría</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 gap-2">
          <Plus className="w-4 h-4" />
          Nueva marca
        </Button>
      </div>

      {/* Filtro por categoría */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-5 py-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Filter className="w-4 h-4" />
          <span className="font-medium">Filtrar:</span>
        </div>
        <Select value={filterCategoryId} onValueChange={(v) => setFilterCategoryId(v ?? '')}>
          <SelectTrigger className="h-8 min-w-[180px] border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterCategoryId && (
          <button
            onClick={() => setFilterCategoryId('')}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Limpiar
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
          {filteredBrands.length} marca{filteredBrands.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center text-gray-400 dark:text-gray-500">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p>Cargando marcas...</p>
          </div>
        ) : fetchError ? (
          <div className="p-20 flex flex-col items-center text-gray-500 dark:text-gray-400">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="font-medium">{fetchError}</p>
            <button
              onClick={loadData}
              className="mt-4 flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Reintentar
            </button>
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="p-16 text-center text-gray-400 dark:text-gray-500">
            <Bookmark className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No hay marcas registradas.</p>
            <button
              onClick={openCreateDialog}
              className="text-blue-600 dark:text-blue-400 font-medium mt-2 hover:underline text-sm"
            >
              Crea tu primera marca
            </button>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold">Nombre</th>
                <th className="px-6 py-4 text-sm font-semibold">Slug</th>
                <th className="px-6 py-4 text-sm font-semibold">Categoría</th>
                <th className="px-6 py-4 text-sm font-semibold">Documentos</th>
                <th className="px-6 py-4 text-sm font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {filteredBrands.map(brand => (
                <tr key={brand.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-50 dark:bg-purple-900/30 p-2 rounded-lg">
                        <Bookmark className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{brand.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      /{brand.slug}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium px-2.5 py-1 rounded-full">
                      <Tag className="w-3 h-3" />
                      {brand.categoryName || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                      <FileText className="w-4 h-4" />
                      {brand.documentsCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.nativeEvent.stopImmediatePropagation()
                        if (openDropdown === brand.id) {
                          setOpenDropdown(null)
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect()
                          setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                          setOpenDropdown(brand.id)
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
        )}
      </div>

      {/* Dropdown ⋮ — fixed para no ser recortado por overflow */}
      {openDropdown !== null && (() => {
        const activeBrand = brands.find(b => b.id === openDropdown)
        if (!activeBrand) return null
        return (
          <div
            style={{ position: 'fixed', top: dropdownPos.top, right: dropdownPos.right }}
            className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[130px] py-1"
            onClick={(e) => e.nativeEvent.stopImmediatePropagation()}
          >
            <button
              onClick={() => openEditDialog(activeBrand)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" /> Editar
            </button>
            <button
              onClick={() => openDeleteDialog(activeBrand)}
              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Eliminar
            </button>
          </div>
        )
      })()}

      {/* ── Dialog: crear / editar ────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        >
          <DialogHeader className="border-b border-gray-100 dark:border-gray-700 -mx-4 -mt-4 px-6 py-4 bg-gray-50 dark:bg-gray-900 rounded-t-xl">
            <DialogTitle className="text-base font-bold text-gray-800 dark:text-gray-100">
              {editingBrand ? 'Editar marca' : 'Nueva marca'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {apiError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {apiError}
              </div>
            )}

            {/* Categoría */}
            <div className="space-y-1.5">
              <Label htmlFor="brand-category" className="text-gray-700 dark:text-gray-300">
                Categoría
              </Label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="brand-category"
                      aria-invalid={!!errors.categoryId}
                      className="w-full h-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoryId && (
                <p className="text-red-500 text-xs font-medium">{errors.categoryId.message}</p>
              )}
            </div>

            {/* Nombre */}
            <div className="space-y-1.5">
              <Label htmlFor="brand-name" className="text-gray-700 dark:text-gray-300">
                Nombre de la marca
              </Label>
              <Input
                id="brand-name"
                {...register('name')}
                aria-invalid={!!errors.name}
                placeholder="Ej: Samsung, LG, Whirlpool..."
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
                  : editingBrand ? 'Actualizar' : 'Crear marca'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog: confirmar eliminación ────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open && !isDeleting) { setDeleteDialogOpen(false); setBrandToDelete(null); setDeleteError(null) } }}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-100">
              ¿Eliminar marca?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 dark:text-gray-400">
              Se eliminará <strong className="text-gray-700 dark:text-gray-300">{brandToDelete?.name}</strong>.
              Esta acción no se puede deshacer. Los documentos asociados perderán esta marca.
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
              onClick={() => { setBrandToDelete(null); setDeleteError(null) }}
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
