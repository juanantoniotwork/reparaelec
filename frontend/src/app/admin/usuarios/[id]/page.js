'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  ArrowLeft, User, Mail, Globe, Clock, KeyRound, Eye, EyeOff,
  Loader2, AlertCircle, CheckCircle2, RefreshCw,
} from 'lucide-react';

const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pt', label: 'Português' },
];

function generatePassword() {
  const upper  = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const lower  = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*';
  const all = upper + lower + digits + symbols;
  let pwd = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];
  for (let i = 4; i < 14; i++) {
    pwd.push(all[Math.floor(Math.random() * all.length)]);
  }
  return pwd.sort(() => Math.random() - 0.5).join('');
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export default function EditUserPage() {
  const { id }   = useParams();
  const router   = useRouter();

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [success, setSuccess]   = useState(false);

  // General info
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [language, setLanguage] = useState('es');
  const [isActive, setIsActive] = useState(true);
  const [lastLogin, setLastLogin] = useState(null);
  const [role, setRole]         = useState('tecnico');

  // Password
  const [newPassword, setNewPassword]       = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [showNew, setShowNew]               = useState(false);
  const [showRepeat, setShowRepeat]         = useState(false);

  // Errors
  const [fieldErrors, setFieldErrors]   = useState({});
  const [generalError, setGeneralError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/users/${id}`);
        const u   = res.data;
        setName(u.name ?? '');
        setEmail(u.email ?? '');
        setLanguage(u.language ?? 'es');
        setIsActive(!!u.is_active);
        setLastLogin(u.last_login_at ?? u.updated_at ?? null);
        setRole(u.role ?? 'tecnico');
      } catch (err) {
        if (err.response?.status === 404) setNotFound(true);
        else setGeneralError('No se pudo cargar el usuario.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError('');
    setSuccess(false);

    if (newPassword && newPassword !== repeatPassword) {
      setFieldErrors({ repeat_password: ['Las contraseñas no coinciden.'] });
      return;
    }

    setSaving(true);
    try {
      const payload = { name, email, language, is_active: isActive, role };
      if (newPassword) {
        payload.password              = newPassword;
        payload.password_confirmation = repeatPassword;
      }
      await api.put(`/users/${id}`, payload);
      setNewPassword('');
      setRepeatPassword('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      if (err.response?.status === 422) {
        setFieldErrors(err.response.data.errors ?? {});
      } else {
        setGeneralError(err.response?.data?.message ?? 'Error al guardar los cambios.');
      }
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = (field) =>
    `w-full border rounded-lg px-3 py-2.5 text-sm outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
      fieldErrors[field]
        ? 'border-red-500 focus:ring-2 focus:ring-red-300'
        : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500'
    }`;

  // ── Loading / not found ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.push('/admin/usuarios')} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver al listado
        </button>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-5 py-4 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          Usuario no encontrado.
        </div>
      </div>
    );
  }

  // ── Main ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push('/admin/usuarios')}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al listado
      </button>

      {/* Page title */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Editar usuario</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">ID #{id}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Feedback banners ── */}
        {generalError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{generalError}
          </div>
        )}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />Cambios guardados correctamente.
          </div>
        )}

        {/* ── General info card ── */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm divide-y divide-gray-100 dark:divide-gray-700">
          <div className="px-5 py-3.5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Información general</h3>
          </div>

          <div className="px-5 py-5 space-y-4">
            {/* Nombre + Email */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />Nombre</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => { setName(e.target.value); if (fieldErrors.name) { const n = {...fieldErrors}; delete n.name; setFieldErrors(n); } }}
                  placeholder="Nombre completo"
                  className={fieldClass('name')}
                />
                {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />Email</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => { setEmail(e.target.value); if (fieldErrors.email) { const n = {...fieldErrors}; delete n.email; setFieldErrors(n); } }}
                  placeholder="correo@ejemplo.com"
                  className={fieldClass('email')}
                />
                {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email[0]}</p>}
              </div>
            </div>

            {/* Idioma + Estado */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />Idioma</span>
                </label>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className={fieldClass('language')}
                >
                  {LANGUAGES.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Estado</label>
                <div className="flex items-center h-[38px]">
                  <button
                    type="button"
                    onClick={() => setIsActive(p => !p)}
                    className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                      isActive ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    aria-pressed={isActive}
                  >
                    <span
                      className={`inline-block w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                        isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`ml-2 text-xs font-medium ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>

            {/* Último acceso */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Último acceso</span>
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 pt-0.5">{formatDate(lastLogin)}</p>
            </div>
          </div>
        </div>

        {/* ── Change password card ── */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm divide-y divide-gray-100 dark:divide-gray-700">
          <div className="px-5 py-3.5 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cambiar contraseña</h3>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(dejar en blanco para no cambiar)</span>
          </div>

          <div className="px-5 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Nueva contraseña */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Nueva contraseña</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); if (fieldErrors.password) { const n = {...fieldErrors}; delete n.password; setFieldErrors(n); } }}
                    placeholder="Nueva contraseña"
                    className={fieldClass('password') + ' pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(p => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password[0]}</p>}
              </div>

              {/* Repetir contraseña */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Repetir contraseña</label>
                <div className="relative">
                  <input
                    type={showRepeat ? 'text' : 'password'}
                    value={repeatPassword}
                    onChange={e => { setRepeatPassword(e.target.value); if (fieldErrors.repeat_password) { const n = {...fieldErrors}; delete n.repeat_password; setFieldErrors(n); } }}
                    placeholder="Repite la contraseña"
                    className={fieldClass('repeat_password') + ' pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRepeat(p => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showRepeat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.repeat_password && <p className="text-red-500 text-xs mt-1">{fieldErrors.repeat_password[0]}</p>}
              </div>
            </div>

            {/* Generar contraseña */}
            <button
              type="button"
              onClick={() => {
                const pwd = generatePassword();
                setNewPassword(pwd);
                setRepeatPassword(pwd);
                setShowNew(true);
                setShowRepeat(true);
              }}
              className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Generar contraseña aleatoria
            </button>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={() => router.push('/admin/usuarios')}
            className="px-5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
