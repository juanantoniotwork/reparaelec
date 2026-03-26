'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
  Bookmark, Trash2, Plus, X, AlertCircle, FileText, RefreshCw,
  Loader2, MoreVertical, Pencil, Tag, Filter,
} from 'lucide-react';

export default function MarcasPage() {
  const [brands, setBrands]               = useState([]);
  const [categories, setCategories]       = useState([]);
  const [loading, setLoading]             = useState(true);
  const [fetchError, setFetchError]       = useState('');
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [currentBrand, setCurrentBrand]   = useState(null);
  const [fieldErrors, setFieldErrors]     = useState({});
  const [modalGeneralError, setModalGeneralError] = useState('');
  const [formData, setFormData]           = useState({ name: '', category_id: '' });
  const [filterCategory, setFilterCategory] = useState('');

  // Dropdown ⋮
  const [openDropdown, setOpenDropdown] = useState(null);
  const [dropdownPos, setDropdownPos]   = useState({ top: 0, right: 0 });

  const fetchData = async () => {
    try {
      setLoading(true);
      setFetchError('');
      const [brandsRes, catsRes] = await Promise.all([
        api.get('/brands'),
        api.get('/categories'),
      ]);
      setBrands(Array.isArray(brandsRes.data) ? brandsRes.data : []);
      setCategories(Array.isArray(catsRes.data) ? catsRes.data : []);
    } catch {
      setFetchError('No se pudieron cargar las marcas. Verifica la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const close = () => setOpenDropdown(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) { const n = { ...fieldErrors }; delete n[name]; setFieldErrors(n); }
    if (modalGeneralError) setModalGeneralError('');
  };

  const closeModal = () => { setIsModalOpen(false); setFieldErrors({}); setModalGeneralError(''); };

  const openModal = (brand = null) => {
    setFieldErrors({});
    setModalGeneralError('');
    if (brand) {
      setCurrentBrand(brand);
      setFormData({ name: brand.name, category_id: brand.category_id });
    } else {
      setCurrentBrand(null);
      setFormData({ name: '', category_id: filterCategory || '' });
    }
    setIsModalOpen(true);
    setOpenDropdown(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setModalGeneralError('');
    try {
      if (currentBrand) {
        await api.put(`/brands/${currentBrand.id}`, formData);
      } else {
        await api.post('/brands', formData);
      }
      closeModal();
      fetchData();
    } catch (err) {
      if (err.response?.status === 422) {
        setFieldErrors(err.response.data.errors || {});
      } else {
        setModalGeneralError(err.response?.data?.message || 'Error de conexión con el servidor');
      }
    }
  };

  const deleteBrand = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta marca?')) return;
    try { await api.delete(`/brands/${id}`); fetchData(); }
    catch { alert('Error al eliminar la marca.'); }
  };

  const filteredBrands = filterCategory
    ? brands.filter(b => b.category_id === parseInt(filterCategory))
    : brands;

  const getCategoryName = (id) => categories.find(c => c.id === id)?.name ?? '—';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Marcas</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gestiona las marcas por categoría</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-all"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nueva marca
        </button>
      </div>

      {/* Filtro */}
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
        {filterCategory && (
          <button
            onClick={() => setFilterCategory('')}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Limpiar
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
          {filteredBrands.length} marca{filteredBrands.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center text-gray-400 dark:text-gray-500">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p>Cargando marcas...</p>
          </div>
        ) : fetchError ? (
          <div className="p-20 flex flex-col items-center text-gray-500 dark:text-gray-400">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="font-medium">{fetchError}</p>
            <button onClick={fetchData} className="mt-4 flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold">
              <RefreshCw className="w-4 h-4 mr-2" /> Reintentar
            </button>
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="p-16 text-center text-gray-400 dark:text-gray-500">
            <Bookmark className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No hay marcas registradas.</p>
            <button onClick={() => openModal()} className="text-blue-600 dark:text-blue-400 font-medium mt-2 hover:underline text-sm">
              Crea tu primera marca
            </button>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold">Nombre</th>
                <th className="px-6 py-4 text-sm font-semibold">Slug</th>
                <th className="px-6 py-4 text-sm font-semibold">Categoría</th>
                <th className="px-6 py-4 text-sm font-semibold">Documentos</th>
                <th className="px-6 py-4 text-sm font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {filteredBrands.map(brand => (
                <tr key={brand.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-50 dark:bg-purple-900/30 p-2 rounded-lg">
                        <Bookmark className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{brand.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      /{brand.slug}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium px-2.5 py-1 rounded-full">
                      <Tag className="w-3 h-3" />
                      {getCategoryName(brand.category_id)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                      <FileText className="w-4 h-4" />
                      {brand.documents_count ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.nativeEvent.stopImmediatePropagation();
                        if (openDropdown === brand.id) {
                          setOpenDropdown(null);
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                          setOpenDropdown(brand.id);
                        }
                      }}
                      className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Dropdown ⋮ — fixed para no ser recortado por overflow */}
      {openDropdown !== null && (() => {
        const activeBrand = brands.find(b => b.id === openDropdown);
        if (!activeBrand) return null;
        return (
          <div
            style={{ position: 'fixed', top: dropdownPos.top, right: dropdownPos.right }}
            className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[130px] py-1"
            onClick={(e) => e.nativeEvent.stopImmediatePropagation()}
          >
            <button
              onClick={() => openModal(activeBrand)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" /> Editar
            </button>
            <button
              onClick={() => { deleteBrand(activeBrand.id); setOpenDropdown(null); }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Eliminar
            </button>
          </div>
        );
      })()}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                {currentBrand ? 'Editar Marca' : 'Nueva Marca'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {modalGeneralError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  {modalGeneralError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
                <select
                  name="category_id"
                  required
                  value={formData.category_id}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    fieldErrors.category_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Selecciona una categoría</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {fieldErrors.category_id && <p className="text-red-500 text-xs mt-1.5 font-medium">{fieldErrors.category_id[0]}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la marca</label>
                <input
                  name="name"
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej: Samsung, LG, Whirlpool..."
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                    fieldErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {fieldErrors.name && <p className="text-red-500 text-xs mt-1.5 font-medium">{fieldErrors.name[0]}</p>}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">El slug se generará automáticamente a partir del nombre.</p>
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-lg shadow-blue-200 dark:shadow-none"
                >
                  {currentBrand ? 'Actualizar' : 'Crear Marca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
