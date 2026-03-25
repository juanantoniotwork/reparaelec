'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

const TYPE_LABELS = {
  string: 'Texto',
  integer: 'Entero',
  float: 'Decimal',
  boolean: 'Booleano',
};

export default function ConfiguracionPage() {
  const [settings, setSettings] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get('/admin/settings');
      setSettings(data);
      const initial = {};
      data.forEach(s => { initial[s.key] = s.value; });
      setValues(initial);
    } catch {
      setError('Error al cargar la configuración.');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(key, value) {
    setValues(prev => ({ ...prev, [key]: value }));
    setSuccess(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const payload = Object.entries(values).map(([key, value]) => ({ key, value: String(value) }));
      await api.put('/admin/settings', payload);
      setSuccess(true);
    } catch {
      setError('Error al guardar la configuración.');
    } finally {
      setSaving(false);
    }
  }

  function renderInput(setting) {
    const value = values[setting.key] ?? setting.value;

    if (setting.type === 'boolean') {
      return (
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => handleChange(setting.key, value === 'true' || value === true ? 'false' : 'true')}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              value === 'true' || value === true ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                value === 'true' || value === true ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {value === 'true' || value === true ? 'Activado' : 'Desactivado'}
          </span>
        </label>
      );
    }

    const baseInput = 'w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600';

    if (setting.type === 'integer') {
      return (
        <input
          type="number"
          step="1"
          value={value}
          onChange={e => handleChange(setting.key, e.target.value)}
          className={baseInput}
        />
      );
    }

    if (setting.type === 'float') {
      return (
        <input
          type="number"
          step="0.01"
          min="0"
          max="1"
          value={value}
          onChange={e => handleChange(setting.key, e.target.value)}
          className={baseInput}
        />
      );
    }

    return (
      <input
        type="text"
        value={value}
        onChange={e => handleChange(setting.key, e.target.value)}
        className={baseInput}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuración del sistema</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Parámetros del motor RAG, modelos de IA y procesamiento de documentos.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-md px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-md px-4 py-3 text-sm">
          Configuración guardada correctamente.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {settings.map(setting => (
            <div key={setting.key} className="px-6 py-5 grid grid-cols-2 gap-6 items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white text-sm">{setting.key}</span>
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                    {TYPE_LABELS[setting.type] ?? setting.type}
                  </span>
                </div>
                {setting.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{setting.description}</p>
                )}
              </div>
              <div>{renderInput(setting)}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
