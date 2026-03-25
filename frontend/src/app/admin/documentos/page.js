'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { FileText, Upload, Trash2, Eye, X, CheckCircle2, Clock, Loader2, AlertCircle, File } from 'lucide-react';

export default function DocumentosPage() {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [modalGeneralError, setModalGeneralError] = useState('');
  const [formData, setFormData] = useState({ title: '', file: null, category_ids: [] });
  const [viewDoc, setViewDoc] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docsRes, catsRes] = await Promise.all([api.get('/documents'), api.get('/categories')]);
      setDocuments(docsRes.data);
      setCategories(catsRes.data);
    } catch { console.error('Error al cargar datos'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const hasProcessing = documents.some(doc => doc.status === 'processing');
    if (!hasProcessing) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/documents');
        setDocuments(res.data);
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [documents]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      const n = { ...fieldErrors }; delete n[name]; setFieldErrors(n);
    }
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, file: e.target.files[0] }));
    if (fieldErrors.file) { const n = { ...fieldErrors }; delete n.file; setFieldErrors(n); }
  };

  const handleCategoryToggle = (id) => {
    setFormData(prev => {
      const isSelected = prev.category_ids.includes(id);
      return {
        ...prev,
        category_ids: isSelected ? prev.category_ids.filter(c => c !== id) : [...prev.category_ids, id],
      };
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ title: '', file: null, category_ids: [] });
    setFieldErrors({});
    setModalGeneralError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setFieldErrors({});
    setModalGeneralError('');
    const data = new FormData();
    data.append('title', formData.title);
    if (formData.file) data.append('file', formData.file);
    formData.category_ids.forEach(id => data.append('category_ids[]', id));
    try {
      await api.post('/documents', data);
      closeModal();
      fetchData();
    } catch (err) {
      if (err.response?.status === 422) {
        setFieldErrors(err.response.data.errors || {});
      } else {
        setModalGeneralError(err.response?.data?.message || 'Error al subir el documento');
      }
    } finally {
      setUploading(false);
    }
  };

  const openViewModal = async (id) => {
    setViewDoc(null);
    setViewLoading(true);
    try {
      const res = await api.get(`/documents/${id}`);
      setViewDoc(res.data);
    } catch {
      alert('No se pudo cargar el documento.');
    } finally {
      setViewLoading(false);
    }
  };

  const deleteDocument = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este documento?')) return;
    try { await api.delete(`/documents/${id}`); fetchData(); }
    catch { alert('Error al eliminar el documento'); }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'processed':
        return <span className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-1 rounded-full text-xs font-semibold flex items-center w-fit"><CheckCircle2 className="w-3 h-3 mr-1" /> Procesado</span>;
      case 'processing':
        return <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-1 rounded-full text-xs font-semibold flex items-center w-fit animate-pulse"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Procesando</span>;
      case 'error':
        return <span className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-2 py-1 rounded-full text-xs font-semibold flex items-center w-fit"><AlertCircle className="w-3 h-3 mr-1" /> Error</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-semibold flex items-center w-fit"><Clock className="w-3 h-3 mr-1" /> Pendiente</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Documentos</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Biblioteca de conocimiento técnico</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm"
        >
          <Upload className="w-5 h-5 mr-2" />
          Subir documento
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center text-gray-400 dark:text-gray-500">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p>Cargando documentos...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold">Título / Archivo</th>
                  <th className="px-6 py-4 text-sm font-semibold">Categorías</th>
                  <th className="px-6 py-4 text-sm font-semibold">Estado</th>
                  <th className="px-6 py-4 text-sm font-semibold">Subido en</th>
                  <th className="px-6 py-4 text-sm font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg mr-3">
                          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100 leading-tight">{doc.title}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{doc.original_filename}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {doc.categories?.map(cat => (
                          <span key={cat.id} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(doc.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button onClick={() => openViewModal(doc.id)} title="Ver" className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"><Eye className="w-5 h-5" /></button>
                      <button onClick={() => deleteDocument(doc.id)} title="Eliminar" className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {documents.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-10 text-center text-gray-400 dark:text-gray-500">
                      No hay documentos disponibles. ¡Sube el primero!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(viewDoc || viewLoading) && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 truncate pr-4">
                {viewDoc ? viewDoc.title : 'Cargando...'}
              </h3>
              <button onClick={() => setViewDoc(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0">
                <X className="w-6 h-6" />
              </button>
            </div>

            {viewLoading && (
              <div className="flex-1 flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            )}

            {viewDoc && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex flex-wrap gap-2">
                  {viewDoc.categories?.map(cat => (
                    <span key={cat.id} className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                      {cat.name}
                    </span>
                  ))}
                  {getStatusBadge(viewDoc.status)}
                </div>

                {viewDoc.summary && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Resumen</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 leading-relaxed">
                      {viewDoc.summary}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Chunks extraídos
                    <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full text-xs font-normal">
                      {viewDoc.chunks?.length ?? 0}
                    </span>
                  </h4>
                  {viewDoc.chunks?.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">Sin chunks procesados aún.</p>
                  ) : (
                    <div className="space-y-3">
                      {viewDoc.chunks?.map((chunk, i) => (
                        <div key={chunk.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3 bg-gray-50/50 dark:bg-gray-900/30">
                          <div className="flex items-center gap-3 mb-1.5 text-xs text-gray-400 dark:text-gray-500">
                            <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">#{i + 1}</span>
                            {chunk.page_number && <span>Pág. {chunk.page_number}</span>}
                            {chunk.section && <span className="truncate max-w-xs">{chunk.section}</span>}
                            {chunk.token_count && <span className="ml-auto">{chunk.token_count} tokens</span>}
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">
                            {chunk.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Subir Documento Técnico</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {modalGeneralError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  {modalGeneralError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título descriptivo</label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="Ej: Manual Técnico TV Samsung QLED 2024"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-3 py-2.5 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                    fieldErrors.title
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500'
                  }`}
                />
                {fieldErrors.title && <p className="text-red-500 text-xs mt-1.5 font-medium">{fieldErrors.title[0]}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categorías asociadas</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-gray-100 dark:border-gray-600 rounded-lg p-3 bg-gray-50/50 dark:bg-gray-700/50">
                  {categories.map(cat => (
                    <label key={cat.id} className="flex items-center text-sm text-gray-600 dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 mr-2 focus:ring-blue-500"
                        checked={formData.category_ids.includes(cat.id)}
                        onChange={() => handleCategoryToggle(cat.id)}
                      />
                      {cat.name}
                    </label>
                  ))}
                </div>
                {fieldErrors.category_ids && <p className="text-red-500 text-xs mt-1.5 font-medium">{fieldErrors.category_ids[0]}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-center">Archivo (PDF, Word hasta 50MB)</label>
                <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl transition-all ${
                  fieldErrors.file
                    ? 'border-red-400 bg-red-50 dark:bg-red-900/10'
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-400 bg-gray-50/30 dark:bg-gray-700/30'
                }`}>
                  <div className="space-y-1 text-center">
                    <File className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                    <div className="flex text-sm text-gray-600 dark:text-gray-300 justify-center">
                      <label className="relative cursor-pointer rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none">
                        <span>Selecciona un archivo</span>
                        <input name="file" type="file" required className="sr-only" onChange={handleFileChange} />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formData.file ? formData.file.name : 'PDF, DOC o DOCX'}
                    </p>
                  </div>
                </div>
                {fieldErrors.file && <p className="text-red-500 text-xs mt-1.5 font-medium text-center">{fieldErrors.file[0]}</p>}
              </div>

              <div className="pt-6 flex space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-lg shadow-blue-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Subiendo...</> : 'Confirmar Subida'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
