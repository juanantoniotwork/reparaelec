'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  FileText, Upload, Trash2, Eye, X, CheckCircle2, Clock, Loader2,
  AlertCircle, File, Filter, Tag, Bookmark, MoreVertical, Pencil, Check, ChevronsUpDown,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import {
  getDocuments, getDocument, createDocument, updateDocument, deleteDocument,
  type Document,
} from '@/lib/api/documents'
import { getCategories, type Category } from '@/lib/api/categories'
import { getBrands, type Brand } from '@/lib/api/brands'
import { documentFormSchema, type DocumentForm } from '@/lib/schemas'
import { handleApiErrors, type FieldMap } from '@/lib/form-errors'
import { cn } from '@/lib/utils'

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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'

// ── API field → form field mapping ────────────────────────────────────────────

const apiFieldMap: FieldMap<DocumentForm> = {
  title:            'title',
  category_ids:     'categoryId',
  'category_ids.0': 'categoryId',
  brand_id:         'brandId',
}

// ── BrandCombobox ─────────────────────────────────────────────────────────────

function BrandCombobox({
  brands,
  value,
  onChange,
  disabled,
  noCategory,
}: {
  brands: Brand[]
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  noCategory?: boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = brands.find(b => b.id === value)

  const placeholder = noCategory
    ? 'Selecciona una categoría primero'
    : brands.length === 0
    ? 'Sin marcas para esta categoría'
    : 'Buscar marca...'

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger
        disabled={disabled}
        aria-expanded={open}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 text-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span className={cn('truncate', !selected && 'text-gray-400 dark:text-gray-500')}>
          {selected ? selected.name : placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-gray-400 dark:text-gray-500" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-0 w-(--anchor-width) min-w-52"
      >
        <Command>
          <CommandInput placeholder="Buscar marca..." />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__sin_marca__"
                onSelect={() => { onChange(''); setOpen(false) }}
                data-checked={value === ''}
              >
                <span className="italic text-gray-400 dark:text-gray-500">Sin marca</span>
              </CommandItem>
              {brands.map(brand => (
                <CommandItem
                  key={brand.id}
                  value={brand.name}
                  onSelect={() => { onChange(brand.id); setOpen(false) }}
                  data-checked={value === brand.id}
                >
                  {brand.name}
                  <Check className={cn('ml-auto size-4', value === brand.id ? 'opacity-100' : 'opacity-0')} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Document['status'] }) {
  switch (status) {
    case 'processed':
      return (
        <span className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-1 rounded-full text-xs font-semibold flex items-center w-fit gap-1">
          <CheckCircle2 className="w-3 h-3" /> Procesado
        </span>
      )
    case 'processing':
      return (
        <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-1 rounded-full text-xs font-semibold flex items-center w-fit gap-1 animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" /> Procesando
        </span>
      )
    case 'error':
      return (
        <span className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-2 py-1 rounded-full text-xs font-semibold flex items-center w-fit gap-1">
          <AlertCircle className="w-3 h-3" /> Error
        </span>
      )
    default:
      return (
        <span className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-semibold flex items-center w-fit gap-1">
          <Clock className="w-3 h-3" /> Pendiente
        </span>
      )
  }
}

// ── Page component ────────────────────────────────────────────────────────────

export default function DocumentosPage() {
  const [documents, setDocuments]   = useState<Document[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands]         = useState<Brand[]>([])
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState('')

  // Filtros
  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [filterBrandId, setFilterBrandId]       = useState('')

  // Dialog crear / editar
  const [dialogOpen, setDialogOpen]       = useState(false)
  const [editingDoc, setEditingDoc]       = useState<Document | null>(null)
  const [uploadFile, setUploadFile]       = useState<File | null>(null)
  const [uploadFileError, setUploadFileError] = useState<string | null>(null)
  const [apiError, setApiError]           = useState<string | null>(null)

  // Dialog ver documento
  const [viewDoc, setViewDoc]       = useState<Document | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewOpen, setViewOpen]     = useState(false)

  // AlertDialog eliminar
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [docToDelete, setDocToDelete]           = useState<Document | null>(null)
  const [isDeleting, setIsDeleting]             = useState(false)
  const [deleteError, setDeleteError]           = useState<string | null>(null)

  // ── react-hook-form ──────────────────────────────────────────────────────────
  const {
    register, handleSubmit, reset, setError, clearErrors, control, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<DocumentForm>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: { title: '', categoryId: '', brandId: '' },
  })

  const watchCategoryId = watch('categoryId')

  // Marcas disponibles según categoría seleccionada en el form
  const formBrands = useMemo(() => {
    if (!watchCategoryId) return []
    return brands.filter(b => b.categoryId === watchCategoryId)
  }, [watchCategoryId, brands])

  // ── Carga ────────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    const [docsRes, catsRes, brandsRes] = await Promise.all([
      getDocuments(),
      getCategories({ per_page: 9999 }),
      getBrands({ per_page: 9999 }),
    ])
    if (docsRes.success && catsRes.success && brandsRes.success) {
      setDocuments(docsRes.data!)
      setCategories(catsRes.data!.items)
      setBrands(brandsRes.data!.items)
    } else {
      setFetchError(docsRes.error || catsRes.error || brandsRes.error || 'Error al cargar datos.')
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Auto-poll mientras algún documento esté en 'processing'
  useEffect(() => {
    const hasProcessing = documents.some(d => d.status === 'processing')
    if (!hasProcessing) return
    const interval = setInterval(async () => {
      const res = await getDocuments()
      if (res.success) setDocuments(res.data!)
    }, 3000)
    return () => clearInterval(interval)
  }, [documents])

  // ── Filtros ───────────────────────────────────────────────────────────────────
  const filterBrands = useMemo(() => {
    if (!filterCategoryId) return brands
    return brands.filter(b => b.categoryId === filterCategoryId)
  }, [filterCategoryId, brands])

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      if (filterCategoryId) {
        const hasCat = doc.categories.some(c => c.id === filterCategoryId)
        if (!hasCat) return false
      }
      if (filterBrandId) {
        if (doc.brandId !== filterBrandId) return false
      }
      return true
    })
  }, [documents, filterCategoryId, filterBrandId])

  const groupedDocuments = useMemo(() => {
    const groups: Record<string, Document[]> = {}
    filteredDocuments.forEach(doc => {
      const key = doc.categories.length > 0 ? doc.categories[0].name : 'Sin categoría'
      if (!groups[key]) groups[key] = []
      groups[key].push(doc)
    })
    return groups
  }, [filteredDocuments])

  // ── Dialog crear / editar ─────────────────────────────────────────────────────
  const openCreateDialog = () => {
    setEditingDoc(null)
    setApiError(null)
    setUploadFile(null)
    setUploadFileError(null)
    clearErrors()
    reset({ title: '', categoryId: '', brandId: '' })
    setDialogOpen(true)
  }

  const openEditDialog = (doc: Document) => {
    setEditingDoc(doc)
    setApiError(null)
    setUploadFile(null)
    setUploadFileError(null)
    clearErrors()
    reset({
      title:      doc.title,
      categoryId: doc.categories[0]?.id ?? '',
      brandId:    doc.brandId ?? '',
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    if (isSubmitting) return
    setDialogOpen(false)
    setTimeout(() => {
      setEditingDoc(null)
      setApiError(null)
      setUploadFile(null)
      setUploadFileError(null)
      clearErrors()
    }, 150)
  }

  const onSubmit = async (data: DocumentForm) => {
    // El archivo es obligatorio solo en creación
    if (!editingDoc && !uploadFile) {
      setUploadFileError('El archivo es obligatorio')
      return
    }

    setApiError(null)
    setUploadFileError(null)
    clearErrors()

    const fd = new FormData()
    fd.append('title', data.title)
    fd.append('category_ids[]', data.categoryId)
    if (data.brandId) fd.append('brand_id', data.brandId)
    if (uploadFile) fd.append('file', uploadFile)

    const result = editingDoc
      ? await updateDocument(editingDoc.id, fd)
      : await createDocument(fd)

    if (result.success) {
      closeDialog()
      await loadData()
    } else {
      const { unmappedErrors } = handleApiErrors<DocumentForm>({
        errors:       result.errors,
        fieldMap:     apiFieldMap,
        setError,
        defaultError: result.error,
      })
      if (unmappedErrors.length > 0) setApiError(unmappedErrors.join('. '))
    }
  }

  // ── Ver documento ─────────────────────────────────────────────────────────────
  const openViewModal = async (id: string) => {
    setViewDoc(null)
    setViewLoading(true)
    setViewOpen(true)
    const res = await getDocument(id)
    if (res.success) {
      setViewDoc(res.data!)
    }
    setViewLoading(false)
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────────
  const openDeleteDialog = (doc: Document) => {
    setDocToDelete(doc)
    setDeleteError(null)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!docToDelete) return
    setIsDeleting(true)
    setDeleteError(null)
    const result = await deleteDocument(docToDelete.id)
    setIsDeleting(false)
    if (result.success) {
      setDeleteDialogOpen(false)
      setDocToDelete(null)
      await loadData()
    } else {
      setDeleteError(result.error || 'Error al eliminar el documento.')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Documentos</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Biblioteca de conocimiento técnico</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 gap-2">
          <Upload className="w-4 h-4" />
          Subir documento
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-5 py-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Filter className="w-4 h-4" />
          <span className="font-medium">Filtrar:</span>
        </div>

        {/* Filtro categoría */}
        <Select
          value={filterCategoryId}
          onValueChange={(v) => {
            setFilterCategoryId(v ?? '')
            setFilterBrandId('')
          }}
        >
          <SelectTrigger className="h-8 min-w-[180px] border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm">
            <SelectValue placeholder="Todas las categorías">
              {(v: string | null) => v ? (categories.find(c => c.id === v)?.name ?? v) : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id} label={cat.name}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro marca */}
        <Select
          value={filterBrandId}
          onValueChange={(v) => setFilterBrandId(v ?? '')}
        >
          <SelectTrigger className="h-8 min-w-[160px] border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm">
            <SelectValue placeholder="Todas las marcas">
              {(v: string | null) => v ? (brands.find(b => b.id === v)?.name ?? v) : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {filterBrands.map(brand => (
              <SelectItem key={brand.id} value={brand.id} label={brand.name}>{brand.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filterCategoryId || filterBrandId) && (
          <button
            onClick={() => { setFilterCategoryId(''); setFilterBrandId('') }}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Limpiar
          </button>
        )}

        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
          {filteredDocuments.length} documento{filteredDocuments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center text-gray-400 dark:text-gray-500">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p>Cargando documentos...</p>
          </div>
        ) : fetchError ? (
          <div className="p-20 flex flex-col items-center text-gray-500 dark:text-gray-400">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="font-medium">{fetchError}</p>
            <button
              onClick={loadData}
              className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold text-sm"
            >
              Reintentar
            </button>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="p-10 text-center text-gray-400 dark:text-gray-500">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No hay documentos que coincidan con los filtros.</p>
            {!filterCategoryId && !filterBrandId && (
              <button
                onClick={openCreateDialog}
                className="text-blue-600 dark:text-blue-400 font-medium mt-2 hover:underline text-sm"
              >
                Sube tu primer documento
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold">Título / Archivo</th>
                  <th className="px-6 py-4 text-sm font-semibold">Categoría / Marca</th>
                  <th className="px-6 py-4 text-sm font-semibold">Estado</th>
                  <th className="px-6 py-4 text-sm font-semibold">Subido en</th>
                  <th className="px-6 py-4 text-sm font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {Object.entries(groupedDocuments).map(([groupName, docs]) => (
                  <>
                    <tr key={`group-${groupName}`} className="bg-gray-50/80 dark:bg-gray-900/60">
                      <td colSpan={5} className="px-6 py-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-2">
                          <Tag className="w-3 h-3" />
                          {groupName}
                          <span className="font-normal normal-case tracking-normal text-gray-400 dark:text-gray-500">({docs.length})</span>
                        </span>
                      </td>
                    </tr>
                    {docs.map(doc => (
                      <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg flex-shrink-0">
                              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100 leading-tight">{doc.title}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{doc.originalFilename}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {doc.categories.map(cat => (
                              <span key={cat.id} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                <Tag className="w-2.5 h-2.5" />{cat.name}
                              </span>
                            ))}
                            {doc.brand && (
                              <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                <Bookmark className="w-2.5 h-2.5" />{doc.brand.name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={doc.status} />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {/* DropdownMenu via base-ui portal — no recortado por overflow */}
                          <DropdownMenu>
                            <DropdownMenuTrigger className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                              <MoreVertical className="w-5 h-5" />
                              <span className="sr-only">Acciones</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-auto min-w-36">
                              <DropdownMenuItem onClick={() => openViewModal(doc.id)}>
                                <Eye className="w-4 h-4" /> Ver
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(doc)}>
                                <Pencil className="w-4 h-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => openDeleteDialog(doc)}
                              >
                                <Trash2 className="w-4 h-4" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Dialog: crear / editar documento ─────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        >
          <DialogHeader className="border-b border-gray-100 dark:border-gray-700 -mx-4 -mt-4 px-6 py-4 bg-gray-50 dark:bg-gray-900 rounded-t-xl">
            <DialogTitle className="text-base font-bold text-gray-800 dark:text-gray-100">
              {editingDoc ? 'Editar Documento' : 'Subir Documento Técnico'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {apiError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {apiError}
              </div>
            )}

            {/* Título */}
            <div className="space-y-1.5">
              <Label htmlFor="doc-title" className="text-gray-700 dark:text-gray-300">
                Título descriptivo
              </Label>
              <Input
                id="doc-title"
                {...register('title')}
                aria-invalid={!!errors.title}
                placeholder="Ej: Manual Técnico TV Samsung QLED 2024"
                autoFocus
                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 h-10"
              />
              {errors.title && (
                <p className="text-red-500 text-xs font-medium">{errors.title.message}</p>
              )}
            </div>

            {/* Categoría */}
            <div className="space-y-1.5">
              <Label htmlFor="doc-category" className="text-gray-700 dark:text-gray-300">
                Categoría
              </Label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v)
                      setValue('brandId', '')  // resetear marca al cambiar categoría
                    }}
                  >
                    <SelectTrigger
                      id="doc-category"
                      aria-invalid={!!errors.categoryId}
                      className="w-full h-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <SelectValue placeholder="Selecciona una categoría">
                        {(v: string | null) => v ? (categories.find(c => c.id === v)?.name ?? v) : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id} label={cat.name}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoryId && (
                <p className="text-red-500 text-xs font-medium">{errors.categoryId.message}</p>
              )}
            </div>

            {/* Marca (combobox) */}
            <div className="space-y-1.5">
              <Label className="text-gray-700 dark:text-gray-300">
                Marca <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span>
              </Label>
              <Controller
                name="brandId"
                control={control}
                render={({ field }) => (
                  <BrandCombobox
                    brands={formBrands}
                    value={field.value}
                    onChange={field.onChange}
                    disabled={!watchCategoryId || formBrands.length === 0}
                    noCategory={!watchCategoryId}
                  />
                )}
              />
              {errors.brandId && (
                <p className="text-red-500 text-xs font-medium">{errors.brandId.message}</p>
              )}
            </div>

            {/* Archivo */}
            <div className="space-y-1.5">
              <Label className="text-gray-700 dark:text-gray-300 block text-center">
                {editingDoc
                  ? <>Reemplazar archivo <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span></>
                  : 'Archivo (PDF, Word hasta 10MB)'}
              </Label>
              <div className={cn(
                'flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl transition-all',
                uploadFileError
                  ? 'border-red-400 bg-red-50 dark:bg-red-900/10'
                  : 'border-gray-200 dark:border-gray-600 hover:border-blue-400 bg-gray-50/30 dark:bg-gray-700/30',
              )}>
                <div className="space-y-1 text-center">
                  <File className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500" />
                  <div className="flex text-sm text-gray-600 dark:text-gray-300 justify-center">
                    <label className="cursor-pointer font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">
                      <span>Selecciona un archivo</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null
                          setUploadFile(file)
                          if (file) setUploadFileError(null)
                        }}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {uploadFile
                      ? uploadFile.name
                      : editingDoc
                      ? editingDoc.originalFilename
                      : 'PDF, DOC o DOCX'}
                  </p>
                </div>
              </div>
              {uploadFileError && (
                <p className="text-red-500 text-xs font-medium text-center">{uploadFileError}</p>
              )}
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
                  ? <><Loader2 className="w-4 h-4 animate-spin" />&nbsp;{editingDoc ? 'Guardando...' : 'Subiendo...'}</>
                  : editingDoc ? 'Guardar cambios' : 'Subir documento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: ver documento ─────────────────────────────────────────────── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-0"
        >
          <DialogHeader className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 rounded-t-xl flex-shrink-0 flex flex-row items-center justify-between">
            <DialogTitle className="text-base font-bold text-gray-800 dark:text-gray-100 truncate pr-4">
              {viewDoc ? viewDoc.title : 'Cargando...'}
            </DialogTitle>
            <DialogClose
              render={<button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0" />}
            >
              <X className="w-5 h-5" />
            </DialogClose>
          </DialogHeader>

          {viewLoading ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : viewDoc ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {viewDoc.categories.map(cat => (
                  <span key={cat.id} className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <Tag className="w-3 h-3" />{cat.name}
                  </span>
                ))}
                {viewDoc.brand && (
                  <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <Bookmark className="w-3 h-3" />{viewDoc.brand.name}
                  </span>
                )}
                <StatusBadge status={viewDoc.status} />
              </div>

              {/* Resumen */}
              {viewDoc.summary && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Resumen</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewDoc.summary}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Chunks */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Chunks extraídos
                  <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full text-xs font-normal">
                    {viewDoc.chunks?.length ?? 0}
                  </span>
                </h4>
                {!viewDoc.chunks?.length ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">Sin chunks procesados aún.</p>
                ) : (
                  <div className="space-y-3">
                    {viewDoc.chunks.map((chunk, i) => (
                      <div key={chunk.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3 bg-gray-50/50 dark:bg-gray-900/30">
                        <div className="flex items-center gap-3 mb-1.5 text-xs text-gray-400 dark:text-gray-500">
                          <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">#{i + 1}</span>
                          {chunk.pageNumber && <span>Pág. {chunk.pageNumber}</span>}
                          {chunk.section && <span className="truncate max-w-xs">{chunk.section}</span>}
                          {chunk.tokenCount && <span className="ml-auto">{chunk.tokenCount} tokens</span>}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">
                          {chunk.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog: confirmar eliminación ───────────────────────────────── */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteDialogOpen(false)
            setDocToDelete(null)
            setDeleteError(null)
          }
        }}
      >
        <AlertDialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-100">
              ¿Eliminar documento?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 dark:text-gray-400">
              Se eliminará <strong className="text-gray-700 dark:text-gray-300">{docToDelete?.title}</strong>.
              Esta acción no se puede deshacer. Los chunks y embeddings también se eliminarán.
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
              onClick={() => { setDocToDelete(null); setDeleteError(null) }}
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
