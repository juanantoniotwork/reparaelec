'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import {
  FileText, Upload, Trash2, Eye, X, CheckCircle2, Clock, Loader2,
  AlertCircle, File, Filter, Tag, Bookmark, MoreVertical, Pencil, ChevronDown,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function DocumentosPage() {
  const [documents, setDocuments]     = useState([]);
  const [categories, setCategories]   = useState([]);
  const [brands, setBrands]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [uploading, setUploading]     = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [modalGeneralError, setModalGeneralError] = useState('');
  const [formData, setFormData]       = useState({ title: '', file: null, category_id: '', brand_id: '' });
  const [formBrands, setFormBrands]   = useState([]);
  const [viewDoc, setViewDoc]         = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Dropdown
  const [openDropdown, setOpenDropdown] = useState(null);
  const [dropdownPos, setDropdownPos]   = useState({ top: 0, right: 0 });

  // Edit modal
  const [editDoc, setEditDoc]             = useState(null);
  const [editUploading, setEditUploading] = useState(false);
  const [editFieldErrors, setEditFieldErrors]       = useState({});
  const [editGeneralError, setEditGeneralError]     = useState('');
  const [editFormData, setEditFormData]   = useState({ title: '', file: null, category_id: '', brand_id: '' });

  // Brand combobox – modal subir
  const [brandSearch, setBrandSearch]     = useState('');
  const [brandOpen, setBrandOpen]         = useState(false);
  // Brand combobox – modal editar
  const [editBrandSearch, setEditBrandSearch] = useState('');
  const [editBrandOpen, setEditBrandOpen]     = useState(false);

  // Filtros
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand]       = useState('');
  const [filterBrands, setFilterBrands]     = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docsRes, catsRes, brandsRes] = await Promise.all([
        api.get('/documents'),
        api.get('/categories'),
        api.get('/brands'),
      ]);
      setDocuments(docsRes.data);
      setCategories(catsRes.data);
      setBrands(brandsRes.data);
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

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const close = () => setOpenDropdown(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  // Marcas en filtro según categoría del filtro
  useEffect(() => {
    if (filterCategory) {
      setFilterBrands(brands.filter(b => b.category_id === parseInt(filterCategory)));
    } else {
      setFilterBrands(brands);
    }
    setFilterBrand('');
  }, [filterCategory, brands]);

  // Marcas en formulario de subida según categoría seleccionada
  useEffect(() => {
    if (formData.category_id) {
      setFormBrands(brands.filter(b => b.category_id === parseInt(formData.category_id)));
    } else {
      setFormBrands([]);
    }
    setFormData(prev => ({ ...prev, brand_id: '' }));
    setBrandSearch('');
    setBrandOpen(false);
  }, [formData.category_id, brands]);

  // Marcas en formulario de edición
  const editFormBrands = useMemo(() => {
    if (editFormData.category_id) return brands.filter(b => b.category_id === parseInt(editFormData.category_id));
    return [];
  }, [editFormData.category_id, brands]);

  // Filtrado de documentos
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      if (filterCategory) {
        const hasCat = doc.categories?.some(c => c.id === parseInt(filterCategory));
        if (!hasCat) return false;
      }
      if (filterBrand) {
        if (doc.brand_id !== parseInt(filterBrand)) return false;
      }
      return true;
    });
  }, [documents, filterCategory, filterBrand]);

  // Agrupación por categoría
  const groupedDocuments = useMemo(() => {
    const groups = {};
    filteredDocuments.forEach(doc => {
      const key = doc.categories?.length > 0 ? doc.categories[0].name : 'Sin categoría';
      if (!groups[key]) groups[key] = [];
      groups[key].push(doc);
    });
    return groups;
  }, [filteredDocuments]);

  // ── Upload form handlers ───────────────────────────────────────────────
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
    setFormData({ title: '', file: null, category_id: '', brand_id: '' });
    setFormBrands([]);
    setFieldErrors({});
    setModalGeneralError('');
    setBrandSearch('');
    setBrandOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setFieldErrors({});
    setModalGeneralError('');
    const data = new FormData();
    data.append('title', formData.title);
    if (formData.file) data.append('file', formData.file);
    if (formData.category_id) data.append('category_ids[]', formData.category_id);
    if (formData.brand_id) data.append('brand_id', formData.brand_id);
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

  // ── Edit form handlers ─────────────────────────────────────────────────
  const openEditModal = (doc) => {
    setEditDoc(doc);
    setEditFormData({
      title: doc.title,
      file: null,
      category_id: doc.categories?.[0]?.id ? String(doc.categories[0].id) : '',
      brand_id: doc.brand_id ? String(doc.brand_id) : '',
    });
    setEditBrandSearch(doc.brand?.name ?? '');
    setEditBrandOpen(false);
    setEditFieldErrors({});
    setEditGeneralError('');
    setOpenDropdown(null);
  };

  const closeEditModal = () => {
    setEditDoc(null);
    setEditFormData({ title: '', file: null, category_id: '', brand_id: '' });
    setEditBrandSearch('');
    setEditBrandOpen(false);
    setEditFieldErrors({});
    setEditGeneralError('');
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'category_id' ? { brand_id: '' } : {}),
    }));
    if (name === 'category_id') { setEditBrandSearch(''); setEditBrandOpen(false); }
    if (editFieldErrors[name]) {
      const n = { ...editFieldErrors }; delete n[name]; setEditFieldErrors(n);
    }
  };

  const handleEditFileChange = (e) => {
    setEditFormData(prev => ({ ...prev, file: e.target.files[0] }));
    if (editFieldErrors.file) { const n = { ...editFieldErrors }; delete n.file; setEditFieldErrors(n); }
  };

  const handleEditCategoryToggle = (id) => {
    setEditFormData(prev => {
      const isSelected = prev.category_ids.includes(id);
      return {
        ...prev,
        category_ids: isSelected ? prev.category_ids.filter(c => c !== id) : [...prev.category_ids, id],
        brand_id: '',
      };
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditUploading(true);
    setEditFieldErrors({});
    setEditGeneralError('');
    const data = new FormData();
    data.append('_method', 'PUT');
    data.append('title', editFormData.title);
    if (editFormData.file) data.append('file', editFormData.file);
    if (editFormData.category_id) data.append('category_ids[]', editFormData.category_id);
    if (editFormData.brand_id) data.append('brand_id', editFormData.brand_id);
    try {
      await api.post(`/documents/${editDoc.id}`, data);
      closeEditModal();
      fetchData();
    } catch (err) {
      if (err.response?.status === 422) {
        setEditFieldErrors(err.response.data.errors || {});
      } else {
        setEditGeneralError(err.response?.data?.message || 'Error al actualizar el documento');
      }
    } finally {
      setEditUploading(false);
    }
  };

  // ── View modal ─────────────────────────────────────────────────────────
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

  const DocumentRow = ({ doc }) => (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
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
            <span key={cat.id} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Tag className="w-2.5 h-2.5" />{cat.name}
            </span>
          ))}
          {doc.brand && (
            <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Bookmark className="w-2.5 h-2.5" />{doc.brand.name}
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4">{getStatusBadge(doc.status)}</td>
      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
        {new Date(doc.created_at).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 text-right">
        <button
          onClick={(e) => {
            e.nativeEvent.stopImmediatePropagation();
            if (openDropdown === doc.id) {
              setOpenDropdown(null);
            } else {
              const rect = e.currentTarget.getBoundingClientRect();
              setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
              setOpenDropdown(doc.id);
            }
          }}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </td>
    </tr>
  );

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

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-5 py-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Filter className="w-4 h-4" />
          <span className="font-medium">Filtrar:</span>
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Todas las categorías</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <select
          value={filterBrand}
          onChange={e => setFilterBrand(e.target.value)}
          className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Todas las marcas</option>
          {filterBrands.map(brand => (
            <option key={brand.id} value={brand.id}>{brand.name}</option>
          ))}
        </select>
        {(filterCategory || filterBrand) && (
          <button
            onClick={() => { setFilterCategory(''); setFilterBrand(''); }}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Limpiar
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">{filteredDocuments.length} documento{filteredDocuments.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center text-gray-400 dark:text-gray-500">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p>Cargando documentos...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="p-10 text-center text-gray-400 dark:text-gray-500">
            No hay documentos que coincidan con los filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold">Título / Archivo</th>
                  <th className="px-6 py-4 text-sm font-semibold">Categoría / Marca</th>
                  <th className="px-6 py-4 text-sm font-semibold">Estado</th>
                  <th className="px-6 py-4 text-sm font-semibold">Subido en</th>
                  <th className="px-6 py-4 text-sm font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {Object.entries(groupedDocuments).map(([groupName, docs]) => (
                  <>
                    <tr key={`group-${groupName}`} className="bg-gray-50/80 dark:bg-gray-900/60">
                      <td colSpan="5" className="px-6 py-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-2">
                          <Tag className="w-3 h-3" />{groupName}
                          <span className="font-normal normal-case tracking-normal text-gray-400 dark:text-gray-500">({docs.length})</span>
                        </span>
                      </td>
                    </tr>
                    {docs.map(doc => <DocumentRow key={doc.id} doc={doc} />)}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Ver Documento */}
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
                    <span key={cat.id} className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                      <Tag className="w-3 h-3" />{cat.name}
                    </span>
                  ))}
                  {viewDoc.brand && (
                    <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                      <Bookmark className="w-3 h-3" />{viewDoc.brand.name}
                    </span>
                  )}
                  {getStatusBadge(viewDoc.status)}
                </div>

                {viewDoc.summary && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Resumen</h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewDoc.summary}</ReactMarkdown>
                    </div>
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

      {/* Modal Subir Documento */}
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
                <select
                  name="category_id"
                  required
                  value={formData.category_id}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-3 py-2.5 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    fieldErrors['category_ids'] || fieldErrors['category_ids.0']
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500'
                  }`}
                >
                  <option value="">Selecciona una categoría</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {(fieldErrors['category_ids'] || fieldErrors['category_ids.0']) && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">
                    {(fieldErrors['category_ids'] || fieldErrors['category_ids.0'])[0]}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Marca <span className="text-gray-400 dark:text-gray-500 font-normal"></span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={brandSearch}
                    onChange={(e) => {
                      setBrandSearch(e.target.value);
                      setBrandOpen(true);
                      setFormData(prev => ({ ...prev, brand_id: '' }));
                    }}
                    onFocus={() => { if (formBrands.length > 0) setBrandOpen(true); }}
                    onBlur={() => setTimeout(() => setBrandOpen(false), 150)}
                    placeholder={
                      !formData.category_id
                        ? 'Selecciona una categoría primero'
                        : formBrands.length === 0
                          ? 'No hay marcas para esta categoría'
                          : 'Buscar marca...'
                    }
                    disabled={!formData.category_id || formBrands.length === 0}
                    className={`w-full border rounded-lg px-3 py-2.5 pr-9 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                      fieldErrors.brand_id
                        ? 'border-red-500'
                        : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  {brandOpen && formData.category_id && (
                    <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {(() => {
                        const filtered = formBrands.filter(b =>
                          b.name.toLowerCase().includes(brandSearch.toLowerCase())
                        );
                        if (filtered.length === 0) {
                          return <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">Sin resultados</div>;
                        }
                        return (
                          <>
                            <button
                              type="button"
                              onMouseDown={() => {
                                setFormData(prev => ({ ...prev, brand_id: '' }));
                                setBrandSearch('');
                                setBrandOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 italic"
                            >
                              Sin marca específica
                            </button>
                            {filtered.map(brand => (
                              <button
                                key={brand.id}
                                type="button"
                                onMouseDown={() => {
                                  setFormData(prev => ({ ...prev, brand_id: String(brand.id) }));
                                  setBrandSearch(brand.name);
                                  setBrandOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                {brand.name}
                              </button>
                            ))}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
                {fieldErrors.brand_id && <p className="text-red-500 text-xs mt-1.5 font-medium">{fieldErrors.brand_id[0]}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-center">Archivo (PDF, Word hasta 10MB)</label>
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

      {/* Modal Editar Documento */}
      {editDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Editar Documento</h3>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
              {editGeneralError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  {editGeneralError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título descriptivo</label>
                <input
                  name="title"
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={handleEditInputChange}
                  className={`w-full border rounded-lg px-3 py-2.5 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                    editFieldErrors.title
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500'
                  }`}
                />
                {editFieldErrors.title && <p className="text-red-500 text-xs mt-1.5 font-medium">{editFieldErrors.title[0]}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
                <select
                  name="category_id"
                  required
                  value={editFormData.category_id}
                  onChange={handleEditInputChange}
                  className={`w-full border rounded-lg px-3 py-2.5 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    editFieldErrors['category_ids'] || editFieldErrors['category_ids.0']
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500'
                  }`}
                >
                  <option value="">Selecciona una categoría</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {(editFieldErrors['category_ids'] || editFieldErrors['category_ids.0']) && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">
                    {(editFieldErrors['category_ids'] || editFieldErrors['category_ids.0'])[0]}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Marca <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={editBrandSearch}
                    onChange={(e) => {
                      setEditBrandSearch(e.target.value);
                      setEditBrandOpen(true);
                      setEditFormData(prev => ({ ...prev, brand_id: '' }));
                    }}
                    onFocus={() => { if (editFormBrands.length > 0) setEditBrandOpen(true); }}
                    onBlur={() => setTimeout(() => setEditBrandOpen(false), 150)}
                    placeholder={
                      !editFormData.category_id
                        ? 'Selecciona una categoría primero'
                        : editFormBrands.length === 0
                          ? 'No hay marcas para esta categoría'
                          : 'Buscar marca...'
                    }
                    disabled={!editFormData.category_id || editFormBrands.length === 0}
                    className={`w-full border rounded-lg px-3 py-2.5 pr-9 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                      editFieldErrors.brand_id
                        ? 'border-red-500'
                        : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  {editBrandOpen && editFormData.category_id && (
                    <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {(() => {
                        const filtered = editFormBrands.filter(b =>
                          b.name.toLowerCase().includes(editBrandSearch.toLowerCase())
                        );
                        if (filtered.length === 0) {
                          return <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">Sin resultados</div>;
                        }
                        return (
                          <>
                            <button
                              type="button"
                              onMouseDown={() => {
                                setEditFormData(prev => ({ ...prev, brand_id: '' }));
                                setEditBrandSearch('');
                                setEditBrandOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 italic"
                            >
                              Sin marca específica
                            </button>
                            {filtered.map(brand => (
                              <button
                                key={brand.id}
                                type="button"
                                onMouseDown={() => {
                                  setEditFormData(prev => ({ ...prev, brand_id: String(brand.id) }));
                                  setEditBrandSearch(brand.name);
                                  setEditBrandOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                {brand.name}
                              </button>
                            ))}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
                {editFieldErrors.brand_id && <p className="text-red-500 text-xs mt-1.5 font-medium">{editFieldErrors.brand_id[0]}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-center">
                  Reemplazar archivo <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span>
                </label>
                <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl transition-all ${
                  editFieldErrors.file
                    ? 'border-red-400 bg-red-50 dark:bg-red-900/10'
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-400 bg-gray-50/30 dark:bg-gray-700/30'
                }`}>
                  <div className="space-y-1 text-center">
                    <File className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                    <div className="flex text-sm text-gray-600 dark:text-gray-300 justify-center">
                      <label className="relative cursor-pointer rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none">
                        <span>Selecciona un archivo</span>
                        <input name="file" type="file" className="sr-only" onChange={handleEditFileChange} />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {editFormData.file ? editFormData.file.name : editDoc.original_filename}
                    </p>
                  </div>
                </div>
                {editFieldErrors.file && <p className="text-red-500 text-xs mt-1.5 font-medium text-center">{editFieldErrors.file[0]}</p>}
              </div>

              <div className="pt-6 flex space-x-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editUploading}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-lg shadow-blue-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {editUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</> : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dropdown ⋮ — fixed para no ser recortado por overflow */}
      {openDropdown !== null && (() => {
        const activeDoc = documents.find(d => d.id === openDropdown);
        if (!activeDoc) return null;
        return (
          <div
            style={{ position: 'fixed', top: dropdownPos.top, right: dropdownPos.right }}
            className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[130px] py-1"
            onClick={(e) => e.nativeEvent.stopImmediatePropagation()}
          >
            <button
              onClick={() => { openViewModal(activeDoc.id); setOpenDropdown(null); }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 flex items-center gap-2"
            >
              <Eye className="w-4 h-4" /> Ver
            </button>
            <button
              onClick={() => openEditModal(activeDoc)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" /> Editar
            </button>
            <button
              onClick={() => { deleteDocument(activeDoc.id); setOpenDropdown(null); }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Eliminar
            </button>
          </div>
        );
      })()}
    </div>
  );
}
