'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, User, Mail, Calendar, Clock, Cpu, Database,
  ThumbsUp, ThumbsDown, Minus, AlertCircle, Loader2, MessageSquare, Bot,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '@/lib/api';

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
}

function FeedbackBadge({ value }) {
  if (value === 'positive') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
      <ThumbsUp className="w-3 h-3" />Positivo
    </span>
  );
  if (value === 'negative') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300">
      <ThumbsDown className="w-3 h-3" />Negativo
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
      <Minus className="w-3 h-3" />Sin valorar
    </span>
  );
}

function MetaRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">{label}</p>
        <div className="text-sm text-gray-800 dark:text-gray-200 leading-snug">{children}</div>
      </div>
    </div>
  );
}

export default function InteraccionDetailPage() {
  const { id }  = useParams();
  const router  = useRouter();

  const [item, setItem]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/admin/interactions/${id}`);
        setItem(res.data);
      } catch (err) {
        if (err.response?.status === 404) setNotFound(true);
        else setError('No se pudo cargar la interacción.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // ── Error / not found ────────────────────────────────────────────────────
  if (notFound || error) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.push('/admin/interacciones')} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          <ArrowLeft className="w-4 h-4" />Volver al listado
        </button>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-5 py-4 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {notFound ? 'Interacción no encontrada.' : error}
        </div>
      </div>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Back + title */}
      <button
        onClick={() => router.push('/admin/interacciones')}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />Volver al listado
      </button>

      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Detalle de interacción</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">ID #{id}</p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5 items-start">

        {/* ── Left: question + answer ── */}
        <div className="space-y-4">

          {/* Question card */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
              <MessageSquare className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Pregunta</h3>
            </div>
            <div className="px-5 py-4 bg-blue-50/40 dark:bg-blue-950/20">
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{item.query}</p>
            </div>
          </div>

          {/* Answer card */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
              <Bot className="w-4 h-4 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Respuesta</h3>
            </div>
            <div className="px-5 py-5">
              <div className="
                prose prose-sm max-w-none
                dark:prose-invert
                prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed
                prose-headings:text-gray-800 dark:prose-headings:text-gray-100 prose-headings:font-semibold
                prose-strong:text-gray-800 dark:prose-strong:text-gray-100
                prose-li:text-gray-700 dark:prose-li:text-gray-300
                prose-code:text-indigo-600 dark:prose-code:text-indigo-400 prose-code:bg-indigo-50 dark:prose-code:bg-indigo-950/40 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[13px] prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950 prose-pre:rounded-lg prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700
                prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                prose-blockquote:border-l-indigo-400 prose-blockquote:text-gray-500 dark:prose-blockquote:text-gray-400
                prose-hr:border-gray-200 dark:prose-hr:border-gray-700
              ">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.response}</ReactMarkdown>
              </div>
            </div>
          </div>

        </div>

        {/* ── Right: metadata ── */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Información</h3>
          </div>
          <div className="px-5 py-1">

            <MetaRow icon={User} label="Técnico">
              <span className="font-medium">{item.user?.name ?? '—'}</span>
            </MetaRow>

            <MetaRow icon={Mail} label="Email">
              {item.user?.email
                ? <span className="text-blue-600 dark:text-blue-400">{item.user.email}</span>
                : '—'}
            </MetaRow>

            <MetaRow icon={Calendar} label="Fecha">
              {formatDate(item.created_at)}
            </MetaRow>

            <MetaRow icon={Clock} label="Tiempo de respuesta">
              {item.response_time_ms != null
                ? <span className="font-mono">{item.response_time_ms} ms</span>
                : '—'}
            </MetaRow>

            <MetaRow icon={Cpu} label="Modelo">
              {item.model
                ? <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-1.5 py-0.5 rounded">{item.model}</span>
                : '—'}
            </MetaRow>

            <MetaRow icon={Database} label="Desde caché">
              {item.from_cache
                ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">Sí</span>
                : <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">No</span>}
            </MetaRow>

            <MetaRow icon={ThumbsUp} label="Feedback">
              <FeedbackBadge value={item.feedback} />
            </MetaRow>

          </div>
        </div>

      </div>
    </div>
  );
}
