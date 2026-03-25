'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Tag, Edit2, Trash2, Plus, X, AlertCircle, FileText, RefreshCw } from 'lucide-react';

export default function CategoriasPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [modalGeneralError, setModalGeneralError] = useState('');
  const [formData, setFormData] = useState({ name: '' });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setFetchError('');
      const response = await api.get('/categories');
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch {
      setFetchError('No se pudieron cargar las categorías. Verifica la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      const newErrors = { ...fieldErrors };
      delete newErrors[name];
      setFieldErrors(newErrors);
    }
    if (modalGeneralError) setModalGeneralError('');
  };

  const closeModal = () => { setIsModalOpen(false); setFieldErrors({}); setModalGeneralError(''); };

  const openModal = (category = null) => {
    setFieldErrors({});
    setModalGeneralError('');
    if (category) {
      setCurrentCategory(category);
      setFormData({ name: category.name });
    } else {
      setCurrentCategory(null);
      setFormData({ name: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setModalGeneralError('');
    try {
      if (currentCategory) {
        await api.put(`/categories/${currentCategory.id}`, formData);
      } else {
        await api.post('/categories', formData);
      }
      closeModal();
      fetchCategories();
    } catch (err) {
      if (err.response?.status === 422) {
        setFieldErrors(err.response.data.errors || {});
      } else {
        setModalGeneralError(err.response?.data?.message || 'Error de conexión con el servidor');
      }
    }
  };

  const deleteCategory = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta categoría?')) return;
    try {
      await api.delete(`/categories/${id}`);
      fetchCategories();
    } catch {
      alert('Error al eliminar la categoría. Asegúrate de que no tenga documentos asociados.');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Categorías</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Organiza tus documentos técnicos</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center shadow-md transition-all active:scale-95"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nueva categoría
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />
          Cargando categorías...
        </div>
      ) : fetchError ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-gray-700 dark:text-gray-300 font-medium">{fetchError}</p>
          <button onClick={fetchCategories} className="mt-4 flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold">
            <RefreshCw className="w-4 h-4 mr-2" /> Reintentar
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.length > 0 ? (
            categories.map((category) => (
              <div key={category.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col justify-between hover:shadow-md transition-shadow group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-50 dark:bg-gray-900 rounded-bl-xl border-l border-b border-gray-100 dark:border-gray-700 flex">
                  <button onClick={() => openModal(category)} className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Editar">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteCategory(category.id)} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <div className="bg-blue-50 dark:bg-blue-900/30 w-12 h-12 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                    <Tag className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{category.name}</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-1">/{category.slug}</p>
                </div>

                <div className="mt-6 flex items-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded-lg">
                  <FileText className="w-4 h-4 mr-2" />
                  <span>{category.documents_count || 0} documentos</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <Tag className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No hay categorías registradas.</p>
              <button onClick={() => openModal()} className="text-blue-600 dark:text-blue-400 font-medium mt-2 hover:underline">
                Crea tu primera categoría
              </button>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{currentCategory ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {modalGeneralError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  {modalGeneralError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la categoría</label>
                <input
                  name="name"
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej: Televisores, Microondas..."
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                    fieldErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {fieldErrors.name && <p className="text-red-500 text-xs mt-1.5 font-medium">{fieldErrors.name[0]}</p>}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  El slug se generará automáticamente a partir del nombre.
                </p>
              </div>

              <div className="pt-6 flex space-x-3">
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
                  {currentCategory ? 'Actualizar' : 'Crear Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
