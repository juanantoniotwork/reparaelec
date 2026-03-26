'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Loader2, AlertCircle, CheckCircle2, Save,
  Database, Cpu, Zap, Settings2, SlidersHorizontal,
} from 'lucide-react'

import { getSettings, updateSettings, type Setting } from '@/lib/api/settings'
import { settingsFormSchema, type SettingsForm } from '@/lib/schemas'

import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'

// ── Metadatos de presentación ─────────────────────────────────────────────────

const KEY_LABELS: Record<string, string> = {
  rag_chunks:      'Fragmentos RAG por consulta',
  cache_threshold: 'Umbral de caché semántica',
  chunk_size:      'Tamaño de chunk (caracteres)',
  default_model:   'Modelo por defecto',
  max_tokens:      'Tokens máximos en respuesta',
  ollama_timeout:  'Timeout de Ollama (segundos)',
}

// Grupos de settings — las claves no listadas aquí caen en "Otros"
const GROUPS: { id: string; label: string; icon: React.ElementType; keys: string[] }[] = [
  {
    id:    'rag',
    label: 'Motor RAG',
    icon:  Database,
    keys:  ['rag_chunks', 'cache_threshold', 'chunk_size'],
  },
  {
    id:    'model',
    label: 'Modelo de IA',
    icon:  Cpu,
    keys:  ['default_model', 'max_tokens'],
  },
  {
    id:    'performance',
    label: 'Rendimiento',
    icon:  Zap,
    keys:  ['ollama_timeout'],
  },
]

const ALL_GROUPED_KEYS = new Set(GROUPS.flatMap(g => g.keys))

// ── Helpers ───────────────────────────────────────────────────────────────────

function toReadableKey(key: string): string {
  return KEY_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const TYPE_BADGE: Record<string, string> = {
  string:  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  integer: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  float:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  boolean: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
}

const TYPE_LABEL: Record<string, string> = {
  string: 'texto', integer: 'entero', float: 'decimal', boolean: 'booleano',
}

// ── SettingField ──────────────────────────────────────────────────────────────

function SettingField({
  setting,
  register,
  error,
  watch,
  setValue,
}: {
  setting: Setting
  register: ReturnType<typeof useForm<SettingsForm>>['register']
  error?: string
  watch: (key: string) => string | undefined
  setValue: (key: string, value: string) => void
}) {
  const value = watch(setting.key) ?? setting.value

  const inputBase =
    'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-9 text-sm'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-3 items-start py-4 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      {/* Label + description */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {toReadableKey(setting.key)}
          </Label>
          <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${TYPE_BADGE[setting.type] ?? TYPE_BADGE.string}`}>
            {TYPE_LABEL[setting.type] ?? setting.type}
          </span>
          <code className="text-[10px] font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
            {setting.key}
          </code>
        </div>
        {setting.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {setting.description}
          </p>
        )}
        {error && (
          <p className="text-xs font-medium text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />{error}
          </p>
        )}
      </div>

      {/* Input */}
      <div>
        {setting.type === 'boolean' ? (
          <div className="flex items-center h-9 gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={value === 'true'}
              onClick={() => setValue(setting.key, value === 'true' ? 'false' : 'true')}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                value === 'true' ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transform transition-transform ${
                  value === 'true' ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${
              value === 'true'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-400 dark:text-gray-500'
            }`}>
              {value === 'true' ? 'Activado' : 'Desactivado'}
            </span>
            {/* hidden input para registrar el valor en react-hook-form */}
            <input type="hidden" {...register(setting.key)} />
          </div>
        ) : setting.type === 'integer' ? (
          <Input
            type="number"
            step="1"
            {...register(setting.key)}
            aria-invalid={!!error}
            className={inputBase}
          />
        ) : setting.type === 'float' ? (
          <Input
            type="number"
            step="0.01"
            min="0"
            max="1"
            {...register(setting.key)}
            aria-invalid={!!error}
            className={inputBase}
          />
        ) : (
          <Input
            type="text"
            {...register(setting.key)}
            aria-invalid={!!error}
            className={inputBase}
          />
        )}
      </div>
    </div>
  )
}

// ── SettingGroup ──────────────────────────────────────────────────────────────

function SettingGroup({
  label,
  icon: Icon,
  settings,
  register,
  errors,
  watch,
  setValue,
}: {
  label: string
  icon: React.ElementType
  settings: Setting[]
  register: ReturnType<typeof useForm<SettingsForm>>['register']
  errors: Record<string, { message?: string } | undefined>
  watch: (key: string) => string | undefined
  setValue: (key: string, value: string) => void
}) {
  if (settings.length === 0) return null

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700">
        <div className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-sm">
          <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</h3>
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
          {settings.length} parámetro{settings.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Fields */}
      <div className="px-5 divide-y-0">
        {settings.map(s => (
          <SettingField
            key={s.key}
            setting={s}
            register={register}
            error={errors[s.key]?.message}
            watch={watch}
            setValue={setValue}
          />
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConfiguracionPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading]   = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [apiError, setApiError]     = useState<string | null>(null)

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsFormSchema),
  })

  // ── Carga ──────────────────────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    const result = await getSettings()
    if (result.success) {
      setSettings(result.data!)
      const defaults: Record<string, string> = {}
      result.data!.forEach(s => { defaults[s.key] = s.value })
      reset(defaults)
    } else {
      setFetchError(result.error || 'Error al cargar la configuración.')
    }
    setLoading(false)
  }, [reset])

  useEffect(() => { loadSettings() }, [loadSettings])

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (data: SettingsForm) => {
    setApiError(null)
    setSuccessMsg(null)

    const payload = Object.entries(data).map(([key, value]) => ({ key, value: String(value) }))
    const result  = await updateSettings(payload)

    if (result.success) {
      setSettings(result.data!)
      const updated: Record<string, string> = {}
      result.data!.forEach(s => { updated[s.key] = s.value })
      reset(updated)
      setSuccessMsg('Configuración guardada correctamente.')
      setTimeout(() => setSuccessMsg(null), 4000)
    } else {
      setApiError(result.error || 'Error al guardar la configuración.')
    }
  }

  // ── Construcción de grupos ─────────────────────────────────────────────────
  const settingsByKey = Object.fromEntries(settings.map(s => [s.key, s]))

  const groups = GROUPS.map(g => ({
    ...g,
    settings: g.keys.map(k => settingsByKey[k]).filter(Boolean) as Setting[],
  }))

  const otherSettings = settings.filter(s => !ALL_GROUPED_KEYS.has(s.key))

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-5 py-4 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {fetchError}
        </div>
        <Button variant="outline" onClick={loadSettings} className="text-sm">
          Reintentar
        </Button>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <SlidersHorizontal className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            Configuración del sistema
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Parámetros del motor RAG, modelos de IA y procesamiento de documentos.
          </p>
        </div>
      </div>

      {/* Banners */}
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

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Grupos conocidos */}
        {groups.map(g => (
          <SettingGroup
            key={g.id}
            label={g.label}
            icon={g.icon}
            settings={g.settings}
            register={register}
            errors={errors as Record<string, { message?: string } | undefined>}
            watch={(key) => watch(key as keyof SettingsForm) as string | undefined}
            setValue={(key, value) => setValue(key as keyof SettingsForm, value)}
          />
        ))}

        {/* Otros (settings desconocidos del backend) */}
        {otherSettings.length > 0 && (
          <SettingGroup
            label="Otros parámetros"
            icon={Settings2}
            settings={otherSettings}
            register={register}
            errors={errors as Record<string, { message?: string } | undefined>}
            watch={(key) => watch(key as keyof SettingsForm) as string | undefined}
            setValue={(key, value) => setValue(key as keyof SettingsForm, value)}
          />
        )}

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const defaults: Record<string, string> = {}
              settings.forEach(s => { defaults[s.key] = s.value })
              reset(defaults)
              setApiError(null)
            }}
            disabled={!isDirty || isSubmitting}
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
          >
            Descartar cambios
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            {isSubmitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              : <><Save className="w-4 h-4" /> Guardar cambios</>}
          </Button>
        </div>

      </form>
    </div>
  )
}
