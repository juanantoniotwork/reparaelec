'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft, User, Mail, Globe, Clock, KeyRound,
  Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, RefreshCw,
} from 'lucide-react'

import { getUser, updateUser } from '@/lib/api/users'
import { editUserFormSchema, type EditUserForm } from '@/lib/schemas'
import { handleApiErrors, type FieldMap } from '@/lib/form-errors'

import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ── Constantes ────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pt', label: 'Português' },
]

const apiFieldMap: FieldMap<EditUserForm> = {
  name:     'name',
  email:    'email',
  role:     'role',
  language: 'language',
  is_active:'isActive',
  password: 'newPassword',
}

function generatePassword(): string {
  const upper   = 'ABCDEFGHJKMNPQRSTUVWXYZ'
  const lower   = 'abcdefghjkmnpqrstuvwxyz'
  const digits  = '23456789'
  const symbols = '!@#$%&*'
  const all     = upper + lower + digits + symbols
  const pwd = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ]
  for (let i = 4; i < 14; i++) {
    pwd.push(all[Math.floor(Math.random() * all.length)])
  }
  return pwd.sort(() => Math.random() - 0.5).join('')
}

function formatDate(str: string | null | undefined): string {
  if (!str) return '—'
  const d = new Date(str)
  return (
    d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  )
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [loadingUser, setLoadingUser] = useState(true)
  const [notFound, setNotFound]       = useState(false)
  const [lastLoginAt, setLastLoginAt] = useState<string | null>(null)
  const [successMsg, setSuccessMsg]   = useState<string | null>(null)
  const [apiError, setApiError]       = useState<string | null>(null)

  // Password visibility
  const [showNew, setShowNew]       = useState(false)
  const [showRepeat, setShowRepeat] = useState(false)

  // ── react-hook-form ──────────────────────────────────────────────────────────
  const {
    register, handleSubmit, reset, setError, clearErrors, control, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<EditUserForm>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      name:            '',
      email:           '',
      role:            'tecnico',
      language:        'es',
      isActive:        true,
      newPassword:     '',
      confirmPassword: '',
    },
  })

  const isActive = watch('isActive')

  // ── Carga ────────────────────────────────────────────────────────────────────
  const loadUser = useCallback(async () => {
    setLoadingUser(true)
    const result = await getUser(id)
    if (result.success && result.data) {
      const u = result.data
      reset({
        name:            u.name,
        email:           u.email,
        role:            u.role,
        language:        u.language,
        isActive:        u.isActive,
        newPassword:     '',
        confirmPassword: '',
      })
      setLastLoginAt(u.lastLoginAt)
    } else {
      setNotFound(true)
    }
    setLoadingUser(false)
  }, [id, reset])

  useEffect(() => { loadUser() }, [loadUser])

  // ── Submit ───────────────────────────────────────────────────────────────────
  const onSubmit = async (data: EditUserForm) => {
    setApiError(null)
    setSuccessMsg(null)
    clearErrors()

    const payload: Parameters<typeof updateUser>[1] = {
      name:      data.name,
      email:     data.email,
      role:      data.role,
      language:  data.language,
      is_active: data.isActive,
    }
    if (data.newPassword) {
      payload.password              = data.newPassword
      payload.password_confirmation = data.confirmPassword
    }

    const result = await updateUser(id, payload)

    if (result.success) {
      setValue('newPassword', '')
      setValue('confirmPassword', '')
      setSuccessMsg('Cambios guardados correctamente.')
      setTimeout(() => setSuccessMsg(null), 3000)
    } else {
      const { unmappedErrors } = handleApiErrors<EditUserForm>({
        errors:       result.errors,
        fieldMap:     apiFieldMap,
        setError,
        defaultError: result.error,
      })
      if (unmappedErrors.length > 0) setApiError(unmappedErrors.join('. '))
    }
  }

  // ── Estados de carga / not found ─────────────────────────────────────────────
  if (loadingUser) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/admin/usuarios')}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al listado
        </button>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-5 py-4 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          Usuario no encontrado.
        </div>
      </div>
    )
  }

  // ── Render principal ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push('/admin/usuarios')}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al listado
      </button>

      {/* Título */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Editar usuario</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">ID #{id}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* ── Banners de feedback ── */}
        {apiError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{apiError}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />{successMsg}
          </div>
        )}

        {/* ── Card: información general ── */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm divide-y divide-gray-100 dark:divide-gray-700">
          <div className="px-5 py-3.5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Información general</h3>
          </div>

          <div className="px-5 py-5 space-y-4">
            {/* Nombre + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="e-name" className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Nombre
                </Label>
                <Input
                  id="e-name"
                  {...register('name')}
                  aria-invalid={!!errors.name}
                  placeholder="Nombre completo"
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-[38px]"
                />
                {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="e-email" className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email
                </Label>
                <Input
                  id="e-email"
                  type="email"
                  {...register('email')}
                  aria-invalid={!!errors.email}
                  placeholder="correo@ejemplo.com"
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-[38px]"
                />
                {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
              </div>
            </div>

            {/* Rol + Idioma */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="e-role" className="text-xs font-medium text-gray-500 dark:text-gray-400">Rol</Label>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(v) => field.onChange(v ?? 'tecnico')}>
                      <SelectTrigger
                        id="e-role"
                        className="w-full h-[38px] border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
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
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="e-language" className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Idioma
                </Label>
                <Controller
                  name="language"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(v) => field.onChange(v ?? 'es')}>
                      <SelectTrigger
                        id="e-language"
                        className="w-full h-[38px] border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(l => (
                          <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Estado + Último acceso */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">Estado</Label>
                <div className="flex items-center h-[38px]">
                  <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                      <button
                        type="button"
                        onClick={() => field.onChange(!field.value)}
                        className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                          field.value ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        aria-pressed={field.value}
                      >
                        <span
                          className={`inline-block w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                            field.value ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    )}
                  />
                  <span className={`ml-2 text-xs font-medium ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Último acceso
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 pt-2">{formatDate(lastLoginAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Card: cambiar contraseña ── */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm divide-y divide-gray-100 dark:divide-gray-700">
          <div className="px-5 py-3.5 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cambiar contraseña</h3>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(dejar en blanco para no cambiar)</span>
          </div>

          <div className="px-5 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nueva contraseña */}
              <div className="space-y-1.5">
                <Label htmlFor="e-newpwd" className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Nueva contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="e-newpwd"
                    type={showNew ? 'text' : 'password'}
                    {...register('newPassword')}
                    aria-invalid={!!errors.newPassword}
                    placeholder="Nueva contraseña"
                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-[38px] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(p => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-red-500 text-xs">{errors.newPassword.message}</p>
                )}
              </div>

              {/* Repetir contraseña */}
              <div className="space-y-1.5">
                <Label htmlFor="e-confirmpwd" className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Repetir contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="e-confirmpwd"
                    type={showRepeat ? 'text' : 'password'}
                    {...register('confirmPassword')}
                    aria-invalid={!!errors.confirmPassword}
                    placeholder="Repite la contraseña"
                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-[38px] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRepeat(p => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showRepeat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Generar contraseña */}
            <button
              type="button"
              onClick={() => {
                const pwd = generatePassword()
                setValue('newPassword', pwd)
                setValue('confirmPassword', pwd)
                setShowNew(true)
                setShowRepeat(true)
              }}
              className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Generar contraseña aleatoria
            </button>
          </div>
        </div>

        {/* ── Acciones ── */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/usuarios')}
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-5"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5"
          >
            {isSubmitting
              ? <><Loader2 className="w-4 h-4 animate-spin" />&nbsp;Guardando...</>
              : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  )
}
