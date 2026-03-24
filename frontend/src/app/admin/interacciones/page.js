'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Download, Search } from 'lucide-react';
import api from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const FEEDBACK_LABELS = {
  positive: { label: '👍 Positivo', className: 'bg-green-100 text-green-700' },
  negative: { label: '👎 Negativo', className: 'bg-red-100 text-red-600' },
  none:     { label: 'Sin valorar', className: 'bg-gray-100 text-gray-500' },
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

export default function InteraccionesPage() {
  const [interactions, setInteractions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  const [filters, setFilters] = useState({
    feedback: '',
    user_id: '',
    date_from: '',
    date_to: '',
  });

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

  const handleFilter = (e) => {
    e.preventDefault();
    fetchInteractions(filters);
  };

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
          <h2 className="text-2xl font-bold text-gray-800">Interacciones</h2>
          <p className="text-gray-500 text-sm">Historial de consultas de todos los técnicos</p>
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
      <form onSubmit={handleFilter} className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3 items-end shadow-sm">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Feedback</label>
          <select
            value={filters.feedback}
            onChange={e => setFilters(f => ({ ...f, feedback: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="positive">👍 Positivo</option>
            <option value="negative">👎 Negativo</option>
            <option value="none">Sin valorar</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Usuario</label>
          <select
            value={filters.user_id}
            onChange={e => setFilters(f => ({ ...f, user_id: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Desde</label>
          <input
            type="date"
            value={filters.date_from}
            onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Hasta</label>
          <input
            type="date"
            value={filters.date_to}
            onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2 ml-auto">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
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
      {loading && <div className="py-16 text-center text-gray-400">Cargando...</div>}
      {error   && <div className="py-16 text-center text-red-400">{error}</div>}

      {!loading && !error && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {interactions.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">No hay interacciones con los filtros aplicados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Pregunta</th>
                    <th className="px-4 py-3">Feedback</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Tiempo</th>
                    <th className="px-4 py-3">Caché</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {interactions.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelected(item)}
                      className="hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{item.id}</td>
                      <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">{item.user?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{item.query}</td>
                      <td className="px-4 py-3">{feedbackBadge(item.feedback)}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(item.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {item.response_time_ms != null ? `${item.response_time_ms} ms` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${item.from_cache ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
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

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between p-5 border-b border-gray-100">
              <div className="min-w-0 pr-4 space-y-1">
                <p className="font-bold text-gray-800 text-sm line-clamp-2">{selected.query}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                  <span className="font-medium text-gray-600">{selected.user?.name ?? '—'}</span>
                  <span>•</span>
                  <span>{new Date(selected.created_at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  <span>•</span>
                  {feedbackBadge(selected.feedback)}
                  {selected.response_time_ms != null && <><span>•</span><span>{selected.response_time_ms} ms</span></>}
                  {selected.from_cache && <><span>•</span><span className="text-yellow-600 font-medium">Desde caché</span></>}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 flex-1">
              <div className="prose prose-sm max-w-none text-gray-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selected.response}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
