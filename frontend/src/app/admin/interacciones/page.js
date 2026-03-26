'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Search } from 'lucide-react';
import api from '@/lib/api';

const FEEDBACK_LABELS = {
  positive: { label: '👍 Positivo', className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  negative: { label: '👎 Negativo', className: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300' },
  none:     { label: 'Sin valorar', className: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
};

function feedbackBadge(feedback) {
  const key = feedback ?? 'none';
  const { label, className } = FEEDBACK_LABELS[key] ?? FEEDBACK_LABELS.none;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function stripMarkdown(text) {
  return (text ?? '')
    .replace(/#{1,6}\s+/g, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/^\s*>\s+/gm, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .trim();
}

function formatDateES(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function exportCSV(data) {
  const headers = ['ID', 'Usuario', 'Pregunta', 'Respuesta', 'Valoración', 'Fecha', 'Tiempo respuesta (ms)', 'Desde caché'];
  const rows = data.map(i => {
    const respuesta = stripMarkdown(i.response).slice(0, 500);
    return [
      i.id,
      i.user?.name ?? '',
      `"${(i.query ?? '').replace(/"/g, '""')}"`,
      `"${respuesta.replace(/"/g, '""')}"`,
      i.feedback ?? '',
      formatDateES(i.created_at),
      i.response_time_ms ?? '',
      i.from_cache ? 'Sí' : 'No',
    ];
  });
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `interacciones_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const selectClass = 'border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
const inputClass = 'border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function InteraccionesPage() {
  const router = useRouter();
  const [interactions, setInteractions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({ feedback: '', user_id: '', date_from: '', date_to: '' });

  const fetchInteractions = useCallback(async (f) => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (f.feedback)  params.feedback  = f.feedback;
      if (f.user_id)   params.user_id   = f.user_id;
      if (f.date_from) params.date_from = f.date_from;
      if (f.date_to)   params.date_to   = f.date_to;
      const res = await api.get('/admin/interactions', { params });
      setInteractions(res.data);
    } catch {
      setError('No se pudieron cargar las interacciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInteractions(filters);
    api.get('/users').then(res => setUsers(res.data)).catch(() => {});
  }, []);

  const handleFilter = (e) => { e.preventDefault(); fetchInteractions(filters); };
  const handleReset = () => {
    const empty = { feedback: '', user_id: '', date_from: '', date_to: '' };
    setFilters(empty);
    fetchInteractions(empty);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Interacciones</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Historial de consultas de todos los técnicos</p>
        </div>
        <button
          onClick={() => exportCSV(interactions)}
          disabled={interactions.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <form
        onSubmit={handleFilter}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex flex-wrap gap-3 items-end shadow-sm"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Feedback</label>
          <select value={filters.feedback} onChange={e => setFilters(f => ({ ...f, feedback: e.target.value }))} className={selectClass}>
            <option value="">Todos</option>
            <option value="positive">👍 Positivo</option>
            <option value="negative">👎 Negativo</option>
            <option value="none">Sin valorar</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Usuario</label>
          <select value={filters.user_id} onChange={e => setFilters(f => ({ ...f, user_id: e.target.value }))} className={selectClass}>
            <option value="">Todos</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Desde</label>
          <input type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} className={inputClass} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Hasta</label>
          <input type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} className={inputClass} />
        </div>

        <div className="flex gap-2 ml-auto">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Limpiar
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Search className="w-4 h-4" />
            Filtrar
          </button>
        </div>
      </form>

      {/* Table */}
      {loading && <div className="py-16 text-center text-gray-400 dark:text-gray-500">Cargando...</div>}
      {error   && <div className="py-16 text-center text-red-400 dark:text-red-500">{error}</div>}

      {!loading && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          {interactions.length === 0 ? (
            <div className="py-16 text-center text-gray-400 dark:text-gray-500 text-sm">No hay interacciones con los filtros aplicados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Pregunta</th>
                    <th className="px-4 py-3">Feedback</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Tiempo</th>
                    <th className="px-4 py-3">Caché</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {interactions.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => router.push(`/admin/interacciones/${item.id}`)}
                      className="hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-400 dark:text-gray-500 font-mono text-xs">{item.id}</td>
                      <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">{item.user?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate">{item.query}</td>
                      <td className="px-4 py-3">{feedbackBadge(item.feedback)}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(item.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {item.response_time_ms != null ? `${item.response_time_ms} ms` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.from_cache
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {item.from_cache ? 'Sí' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
