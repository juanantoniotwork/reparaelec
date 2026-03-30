'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlignJustify, Search, ChevronUp, ChevronDown, Plus,
  MoreVertical, Edit2, Power, Trash2, X, AlertCircle,
  CheckCircle2, Loader2,
} from 'lucide-react'

import { getUsers, createUser, updateUser, deleteUser, type User } from '@/lib/api/users'
import { createUserFormSchema, type CreateUserForm } from '@/lib/schemas'
import { handleApiErrors, type FieldMap } from '@/lib/form-errors'
import { PaginationControls } from '@/components/ui/pagination-controls'

import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
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

const apiFieldMap: FieldMap<CreateUserForm> = {
  name:     'name',
  email:    'email',
  password: 'password',
  role:     'role',
}

function formatDate(str: string | null | undefined): string {
  if (!str) return '—'
  const d = new Date(str)
  return (
    d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
    ' ' +
    d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  )
}

type AppliedFilters = { name: string; email: string; status: string }

export default function UsuariosPage() {
  const router = useRouter()

  const [users, setUsers]     = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // Filters UI state
  const [filtersOpen, setFiltersOpen]   = useState(true)
  const [filterName, setFilterName]     = useState('')
  const [filterEmail, setFilterEmail]   = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [applied, setApplied] = useState<AppliedFilters>({ name: '', email: '', status: 'all' })

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage]       = useState(1)
  const [total, setTotal]             = useState(0)
  const [perPage, setPerPage]         = useState(10)

  // Checkboxes
  const [selected, setSelected] = useState<string[]>([])

  // Dropdown (toolbar)
  const [openToolbar, setOpenToolbar] = useState(false)

  // Dropdown (row ⋮)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [apiError, setApiError]     = useState<string | null>(null)

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete]         = useState<User | null>(null)
  const [isDeleting, setIsDeleting]             = useState(false)
  const [deleteError, setDeleteError]           = useState<string | null>(null)

  // ── react-hook-form ──────────────────────────────────────────────────────────
  const {
    register, handleSubmit, reset, setError, clearErrors, control,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: { name: '', email: '', password: '', role: 'tecnico' },
  })

  // ── Carga (server-side pagination + filters) ─────────────────────────────────
  const loadUsers = useCallback(async (
    page: number,
    pp: number,
    filters: AppliedFilters,
  ) => {
    setLoading(true)
    const result = await getUsers({
      page,
      per_page: pp,
      name:   filters.name   || undefined,
      email:  filters.email  || undefined,
      status: filters.status !== 'all' ? filters.status : undefined,
    })
    if (result.success && result.data) {
      setUsers(result.data.items)
      setCurrentPage(result.data.currentPage)
      setLastPage(result.data.lastPage)
      setTotal(result.data.total)
      setSelected([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadUsers(currentPage, perPage, applied)
  }, [loadUsers, currentPage, perPage, applied])

  // ── Filtros ───────────────────────────────────────────────────────────────────
  const applyFilters = () => {
    const next = { name: filterName, email: filterEmail, status: filterStatus }
    setApplied(next)
    setCurrentPage(1)
  }

  const resetFilters = () => {
    setFilterName(''); setFilterEmail(''); setFilterStatus('all')
    setApplied({ name: '', email: '', status: 'all' })
    setCurrentPage(1)
  }

  // ── Selección ────────────────────────────────────────────────────────────────
  const toggleAll = () =>
    setSelected(selected.length === users.length ? [] : users.map(u => u.id))
  const toggleOne = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  // ── Dialog crear ─────────────────────────────────────────────────────────────
  const openCreateDialog = () => {
    setApiError(null)
    clearErrors()
    reset({ name: '', email: '', password: '', role: 'tecnico' })
    setDialogOpen(true)
    setOpenMenu(null)
  }

  const closeDialog = () => {
    if (isSubmitting) return
    setDialogOpen(false)
    setTimeout(() => { setApiError(null); clearErrors() }, 150)
  }

  const onSubmit = async (data: CreateUserForm) => {
    setApiError(null)
    clearErrors()
    const result = await createUser({
      name:     data.name,
      email:    data.email,
      password: data.password,
      role:     data.role,
    })
    if (result.success) {
      closeDialog()
      await loadUsers(1, perPage, applied)
      setCurrentPage(1)
    } else {
      const { unmappedErrors } = handleApiErrors<CreateUserForm>({
        errors:       result.errors,
        fieldMap:     apiFieldMap,
        setError,
        defaultError: result.error,
      })
      if (unmappedErrors.length > 0) setApiError(unmappedErrors.join('. '))
    }
  }

  // ── Toggle estado ─────────────────────────────────────────────────────────────
  const handleToggleStatus = async (user: User) => {
    setOpenMenu(null)
    await updateUser(user.id, { is_active: !user.isActive })
    await loadUsers(currentPage, perPage, applied)
  }

  // ── Dialog eliminar ──────────────────────────────────────────────────────────
  const openDeleteDialog = (user: User) => {
    setUserToDelete(user)
    setDeleteError(null)
    setDeleteDialogOpen(true)
    setOpenMenu(null)
  }

  const confirmDelete = async () => {
    if (!userToDelete) return
    setIsDeleting(true)
    setDeleteError(null)
    const result = await deleteUser(userToDelete.id)
    setIsDeleting(false)
    if (result.success) {
      setDeleteDialogOpen(false)
      setUserToDelete(null)
      await loadUsers(currentPage, perPage, applied)
    } else {
      setDeleteError(result.error || 'Error al eliminar el usuario.')
    }
  }

  // ── Exportar CSV (página actual) ──────────────────────────────────────────────
  const exportCSV = () => {
    setOpenToolbar(false)
    const header = ['Nombre', 'Email', 'Rol', 'Estado', 'Último acceso']
    const rows   = users.map(u => [
      u.name,
      u.email,
      u.role,
      u.isActive ? 'Activo' : 'Inactivo',
      formatDate(u.lastLoginAt ?? u.updatedAt),
    ])
    const csv  = [header, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\r\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'usuarios.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Usuarios</h2>

      {/* ── Panel de filtros ── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
        <button
          onClick={() => setFiltersOpen(p => !p)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <Search className="w-4 h-4 text-gray-400" />
            Buscar
          </span>
          {filtersOpen
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {filtersOpen && (
          <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Nombre</label>
                <input
                  type="text"
                  placeholder="Introduce nombre"
                  value={filterName}
                  onChange={e => setFilterName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyFilters()}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Email</label>
                <input
                  type="text"
                  placeholder="Introduce email"
                  value={filterEmail}
                  onChange={e => setFilterEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyFilters()}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Estado</label>
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? 'all')}>
                  <SelectTrigger className="w-full h-9 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="inactive">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end items-center gap-3 mt-5">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Reiniciar
              </button>
              <button
                onClick={applyFilters}
                className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                Filtrar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Panel tabla ── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <AlignJustify className="w-4 h-4 text-gray-400" />
            Listado
          </span>
          <div className="flex items-center gap-2">
            <Button
              onClick={openCreateDialog}
              className="h-8 px-4 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
            >
              <Plus className="w-4 h-4" /> Nuevo
            </Button>
            <div className="relative">
              <button
                onClick={() => setOpenToolbar(p => !p)}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {openToolbar && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpenToolbar(false)} />
                  <div className="absolute right-0 top-10 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 w-44">
                    <button
                      onClick={exportCSV}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                      Exportar a Excel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center text-gray-400 dark:text-gray-500 gap-3">
            <Loader2 className="w-7 h-7 animate-spin" />
            <span className="text-sm">Cargando usuarios...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={users.length > 0 && selected.length === users.length}
                        onChange={toggleAll}
                        className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nombre</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Rol</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Último acceso</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {users.map(user => (
                    <tr
                      key={user.id}
                      onDoubleClick={() => router.push(`/admin/usuarios/${user.id}`)}
                      className="hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={selected.includes(user.id)}
                          onChange={() => toggleOne(user.id)}
                          className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                            <CheckCircle2 className="w-3 h-3" /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">
                            <X className="w-3 h-3" /> Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                          {user.role === 'admin' ? 'Admin' : 'Técnico'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(user.lastLoginAt ?? user.updatedAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="relative flex justify-center">
                          <button
                            onClick={() => setOpenMenu(prev => prev === user.id ? null : user.id)}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-400 dark:text-gray-500 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openMenu === user.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                              <div className="absolute right-0 top-8 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 w-44">
                                <button
                                  onClick={() => { setOpenMenu(null); router.push(`/admin/usuarios/${user.id}`) }}
                                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" /> Editar
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(user)}
                                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                  <Power className="w-3.5 h-3.5" />
                                  {user.isActive ? 'Desactivar' : 'Activar'}
                                </button>
                                <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                                <button
                                  onClick={() => openDeleteDialog(user)}
                                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {users.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-14 text-center text-sm text-gray-400 dark:text-gray-500">
                        No se encontraron usuarios.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

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

      {/* ── Dialog: crear usuario ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        >
          <DialogHeader className="border-b border-gray-100 dark:border-gray-700 -mx-4 -mt-4 px-6 py-4 bg-gray-50 dark:bg-gray-900 rounded-t-xl">
            <DialogTitle className="text-base font-bold text-gray-800 dark:text-gray-100">
              Nuevo usuario
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {apiError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {apiError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="u-name" className="text-gray-700 dark:text-gray-300">Nombre</Label>
              <Input
                id="u-name"
                {...register('name')}
                aria-invalid={!!errors.name}
                placeholder="Nombre completo"
                autoFocus
                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-10"
              />
              {errors.name && <p className="text-red-500 text-xs font-medium">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="u-email" className="text-gray-700 dark:text-gray-300">Email</Label>
              <Input
                id="u-email"
                type="email"
                {...register('email')}
                aria-invalid={!!errors.email}
                placeholder="correo@ejemplo.com"
                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-10"
              />
              {errors.email && <p className="text-red-500 text-xs font-medium">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="u-password" className="text-gray-700 dark:text-gray-300">Contraseña</Label>
              <Input
                id="u-password"
                type="password"
                {...register('password')}
                aria-invalid={!!errors.password}
                placeholder="Mínimo 8 caracteres"
                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-10"
              />
              {errors.password && <p className="text-red-500 text-xs font-medium">{errors.password.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="u-role" className="text-gray-700 dark:text-gray-300">Rol</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v ?? 'tecnico')}>
                    <SelectTrigger
                      id="u-role"
                      aria-invalid={!!errors.role}
                      className="w-full h-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="tecnico">Técnico</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role && <p className="text-red-500 text-xs font-medium">{errors.role.message}</p>}
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
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" />&nbsp;Creando...</>
                  : 'Crear usuario'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog: confirmar eliminación ────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open && !isDeleting) { setDeleteDialogOpen(false); setUserToDelete(null); setDeleteError(null) } }}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-100">
              ¿Eliminar usuario?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 dark:text-gray-400">
              Se eliminará <strong className="text-gray-700 dark:text-gray-300">{userToDelete?.name}</strong>.
              Esta acción no se puede deshacer.
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
              onClick={() => { setUserToDelete(null); setDeleteError(null) }}
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
