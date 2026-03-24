'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Eye, 
  X, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  AlertCircle,
  File
} from 'lucide-react';

export default function DocumentosPage() {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [fieldErrors, setFieldErrors] = useState({});
  const [modalGeneralError, setModalGeneralError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    file: null,
    category_ids: []
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docsRes, catsRes] = await Promise.all([
        api.get('/documents'),
        api.get('/categories')
      ]);
      setDocuments(docsRes.data);
      setCategories(catsRes.data);
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const hasProcessing = documents.some(doc => doc.status === 'processing');
    if (!hasProcessing) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get('/documents');
        setDocuments(res.data);
      } catch (err) {
        console.error('Error al hacer polling de documentos:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [documents]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      const newErrors = { ...fieldErrors };
      delete newErrors[name];
      setFieldErrors(newErrors);
    }
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, file: e.target.files[0] }));
    if (fieldErrors.file) {
      const newErrors = { ...fieldErrors };
      delete newErrors.file;
      setFieldErrors(newErrors);
    }
  };

  const handleCategoryToggle = (id) => {
    setFormData(prev => {
      const isSelected = prev.category_ids.includes(id);
      if (isSelected) {
        return { ...prev, category_ids: prev.category_ids.filter(catId => catId !== id) };
      } else {
        return { ...prev, category_ids: [...prev.category_ids, id] };
      }
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
    formData.category_ids.forEach(id => {
      data.append('category_ids[]', id);
    });

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

  const deleteDocument = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este documento?')) return;
    try {
      await api.delete(`/documents/${id}`);
      fetchData();
    } catch (err) {
      alert('Error al eliminar el documento');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'processed':
        return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold flex items-center w-fit"><CheckCircle2 className="w-3 h-3 mr-1" /> Procesado</span>;
      case 'processing':
        return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold flex items-center w-fit animate-pulse"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Procesando</span>;
      case 'error':
        return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold flex items-center w-fit"><AlertCircle className="w-3 h-3 mr-1" /> Error</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-semibold flex items-center w-fit"><Clock className="w-3 h-3 mr-1" /> Pendiente</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Documentos</h2>
          <p className="text-gray-500 mt-1">Biblioteca de conocimiento técnico</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm"
        >
          <Upload className="w-5 h-5 mr-2" />
          Subir documento
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p>Cargando documentos...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-600">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold">Título / Archivo</th>
                  <th className="px-6 py-4 text-sm font-semibold">Categorías</th>
                  <th className="px-6 py-4 text-sm font-semibold">Estado</th>
                  <th className="px-6 py-4 text-sm font-semibold">Subido en</th>
                  <th className="px-6 py-4 text-sm font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="bg-blue-50 p-2 rounded-lg mr-3">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 leading-tight">{doc.title}</p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">{doc.original_filename}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {doc.categories?.map(cat => (
                          <span key={cat.id} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(doc.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button title="Ver" className="text-gray-400 hover:text-blue-600"><Eye className="w-5 h-5" /></button>
                      <button 
                        onClick={() => deleteDocument(doc.id)} 
                        title="Eliminar" 
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {documents.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-10 text-center text-gray-400">
                      No hay documentos disponibles. ¡Sube el primero!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Subida */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Subir Documento Técnico</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {modalGeneralError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  {modalGeneralError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título descriptivo</label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="Ej: Manual Técnico TV Samsung QLED 2024"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-3 py-2.5 outline-none transition-all ${
                    fieldErrors.title ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                  }`}
                />
                {fieldErrors.title && <p className="text-red-500 text-xs mt-1.5 font-medium">{fieldErrors.title[0]}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categorías asociadas</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                  {categories.map(cat => (
                    <label key={cat.id} className="flex items-center text-sm text-gray-600 cursor-pointer hover:text-blue-600 transition-colors">
                      <input 
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 mr-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1 text-center">Archivo (PDF, Word hasta 50MB)</label>
                <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl transition-all ${
                  fieldErrors.file ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-blue-400 bg-gray-50/30'
                }`}>
                  <div className="space-y-1 text-center">
                    <File className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                        <span>Selecciona un archivo</span>
                        <input name="file" type="file" required className="sr-only" onChange={handleFileChange} />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">
                      {formData.file ? formData.file.name : 'PDF, DOC o DOCX'}
                    </p>
                  </div>
                </div>
                {fieldErrors.file && <p className="text-red-500 text-xs mt-1.5 font-medium text-center">{fieldErrors.file[0]}</p>}
              </div>

              <div className="pt-6 flex space-x-3">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={uploading}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
