'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { FileText, Users, MessageSquare, Database, ThumbsUp, ThumbsDown, Zap, Layers, Euro } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats')
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
        Cargando estadísticas...
      </div>
    );
  }

  if (!stats) return null;

  const kpis = [
    {
      title: 'Total consultas',
      value: stats.totals.interactions.toLocaleString(),
      icon: MessageSquare,
      color: 'bg-blue-500',
      sub: `${stats.totals.users} usuarios activos`,
    },
    {
      title: 'Satisfacción',
      value: stats.feedback.positive_pct !== null ? `${stats.feedback.positive_pct}%` : 'Sin datos',
      icon: ThumbsUp,
      color: 'bg-green-500',
      sub: `${stats.feedback.positive} positivos · ${stats.feedback.negative} negativos`,
    },
    {
      title: 'Hit rate caché',
      value: `${stats.cache.hit_rate}%`,
      icon: Zap,
      color: 'bg-purple-500',
      sub: `${stats.cache.hits} hits · ${stats.cache.entries} entradas`,
    },
    {
      title: 'Base de conocimiento',
      value: stats.totals.documents.toLocaleString(),
      icon: FileText,
      color: 'bg-orange-500',
      sub: `${stats.totals.chunks} chunks indexados`,
    },
    {
      title: 'Coste estimado IA',
      value: stats.tokens.estimated_cost_eur > 0 ? `${stats.tokens.estimated_cost_eur.toFixed(4)} €` : '—',
      icon: Euro,
      color: 'bg-rose-500',
      sub: `${(stats.tokens.input + stats.tokens.output).toLocaleString()} tokens totales`,
    },
  ];

  // Build chart bars for last 7 days
  const dayEntries = Object.entries(stats.interactions_by_day);
  const maxVal = Math.max(...dayEntries.map(([, v]) => v), 1);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-gray-500 mt-1">Métricas en tiempo real</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.title} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">{kpi.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
                </div>
                <div className={`${kpi.color} w-11 h-11 rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Consultas por día — bar chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Consultas últimos 7 días</h3>
          <div className="flex items-end gap-2 h-36">
            {dayEntries.map(([day, count]) => {
              const heightPct = maxVal > 0 ? Math.round((count / maxVal) * 100) : 0;
              const label = new Date(day + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-500 font-medium">{count || ''}</span>
                  <div className="w-full flex items-end" style={{ height: '96px' }}>
                    <div
                      className="w-full bg-blue-500 rounded-t transition-all"
                      style={{ height: `${heightPct}%`, minHeight: count > 0 ? '4px' : '0' }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 text-center leading-tight">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 preguntas */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Top 5 preguntas frecuentes</h3>
          <ol className="space-y-3">
            {stats.top_questions.map((q, idx) => (
              <li key={idx} className="flex items-center gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="text-sm text-gray-700 flex-1 truncate" title={q.query}>{q.query}</span>
                <span className="flex-shrink-0 text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                  ×{q.total}
                </span>
              </li>
            ))}
            {stats.top_questions.length === 0 && (
              <p className="text-sm text-gray-400">Sin datos aún</p>
            )}
          </ol>
        </div>
      </div>

      {/* Feedback + Cache detail row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Feedback bar */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Feedback de respuestas</h3>
          {stats.feedback.total > 0 ? (
            <>
              <div className="flex gap-2 h-4 rounded-full overflow-hidden mb-3">
                <div
                  className="bg-green-400 transition-all"
                  style={{ width: `${stats.feedback.positive_pct}%` }}
                />
                <div
                  className="bg-red-400 flex-1 transition-all"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3 text-green-500" /> {stats.feedback.positive} positivos ({stats.feedback.positive_pct}%)</span>
                <span className="flex items-center gap-1"><ThumbsDown className="w-3 h-3 text-red-500" /> {stats.feedback.negative} negativos</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">Sin valoraciones aún</p>
          )}
        </div>

        {/* Cache stats */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Caché semántica</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-purple-600">{stats.cache.entries}</p>
              <p className="text-xs text-gray-500 mt-1">Entradas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{stats.cache.hits}</p>
              <p className="text-xs text-gray-500 mt-1">Hits totales</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{stats.cache.hit_rate}%</p>
              <p className="text-xs text-gray-500 mt-1">Hit rate</p>
            </div>
          </div>
          <div className="mt-4 w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(stats.cache.hit_rate, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
