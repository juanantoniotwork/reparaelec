'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'

import { loginUser } from '@/lib/api/auth'
import { loginFormSchema, type LoginForm } from '@/lib/schemas'

import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import DarkModeToggle from '@/components/DarkModeToggle'

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [apiError, setApiError]         = useState<string | null>(null)

  // Aplicar tema guardado antes del primer render
  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginFormSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setApiError(null)

    const result = await loginUser(data.email, data.password)

    if (!result.success) {
      setApiError(result.error ?? 'Error al iniciar sesión.')
      return
    }

    const { role } = result.data!
    if (role === 'admin') {
      router.push('/admin/dashboard')
    } else if (role === 'tecnico') {
      router.push('/tecnico/chat')
    } else {
      setApiError('Rol de usuario no reconocido.')
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950 p-4">

      {/* Dark mode toggle */}
      <div className="absolute top-4 right-4 z-10">
        <DarkModeToggle />
      </div>

      {/* Card */}
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white dark:bg-gray-800 p-8 shadow-md">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Reparaelec
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Inicia sesión para acceder al sistema
          </p>
        </div>

        {/* Form */}
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>

          {/* Error de API */}
          {apiError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {apiError}
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Correo electrónico
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="correo@ejemplo.com"
              aria-invalid={!!errors.email}
              {...register('email')}
              className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 h-10"
            />
            {errors.email && (
              <p className="text-xs font-medium text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Contraseña */}
          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Contraseña
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                {...register('password')}
                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 h-10 pr-10"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword
                  ? <EyeOff className="w-4 h-4" />
                  : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs font-medium text-red-500">{errors.password.message}</p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10 font-medium"
          >
            {isSubmitting
              ? <><Loader2 className="w-4 h-4 animate-spin" />&nbsp;Accediendo...</>
              : 'Iniciar sesión'}
          </Button>

        </form>
      </div>
    </div>
  )
}
