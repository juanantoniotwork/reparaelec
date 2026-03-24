'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { UserPlus, Edit2, Power, Trash2, X, Check, AlertCircle } from 'lucide-react';

export default function UsuariosPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Estados de error localizados
  const [fieldErrors, setFieldErrors] = useState({});
  const [modalGeneralError, setModalGeneralError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'tecnico',
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 3) Limpiar errores al empezar a escribir
    if (fieldErrors[name]) {
      const newErrors = { ...fieldErrors };
      delete newErrors[name];
      setFieldErrors(newErrors);
    }
    if (modalGeneralError) setModalGeneralError('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFieldErrors({});
    setModalGeneralError('');
  };

  const openModal = (user = null) => {
    // 2) Limpiar errores al abrir
    setFieldErrors({});
    setModalGeneralError('');
    
    if (user) {
      setCurrentUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
      });
    } else {
      setCurrentUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'tecnico',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setModalGeneralError('');
    
    try {
      if (currentUser) {
        const dataToUpdate = { ...formData };
        if (!dataToUpdate.password) delete dataToUpdate.password;
        await api.put(`/users/${currentUser.id}`, dataToUpdate);
      } else {
        await api.post('/users', formData);
      }
      closeModal();
      fetchUsers();
    } catch (err) {
      if (err.response?.status === 422) {
        // 1) Mapeo de errores de validación debajo de cada campo
        setFieldErrors(err.response.data.errors || {});
      } else {
        // Error de red o servidor dentro del modal
        setModalGeneralError(err.response?.data?.message || 'Error de conexión con el servidor');
      }
    }
  };

  const toggleStatus = async (user) => {
    try {
      await api.patch(`/users/${user.id}/toggle`);
      fetchUsers();
    } catch (err) {
      alert('Error al cambiar el estado');
    }
  };

  const deleteUser = async (id) => {
    if (!confirm('¿Estás seguro?')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Usuarios</h2>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Nuevo usuario
        </button>
      </div>

      {/* 1) ELIMINADO EL GLOBAL ERROR DE AQUÍ */}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Cargando usuarios...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Nombre</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Email</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Rol</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Estado</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 text-gray-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center text-xs font-medium ${
                        user.is_active ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {user.is_active ? <Check className="w-4 h-4 mr-1" /> : <X className="w-4 h-4 mr-1" />}
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-3 text-gray-400">
                        <button onClick={() => openModal(user)} className="hover:text-blue-600"><Edit2 className="w-5 h-5" /></button>
                        <button onClick={() => toggleStatus(user)} className="hover:text-orange-500"><Power className="w-5 h-5" /></button>
                        <button onClick={() => deleteUser(user.id)} className="hover:text-red-600"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">{currentUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Error General de Red/Servidor dentro del modal */}
              {modalGeneralError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {modalGeneralError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none ${
                    fieldErrors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {fieldErrors.name && <p className="text-red-500 text-xs mt-1 font-medium">{fieldErrors.name[0]}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none ${
                    fieldErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {fieldErrors.email && <p className="text-red-500 text-xs mt-1 font-medium">{fieldErrors.email[0]}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña {currentUser && '(Opcional)'}
                </label>
                <input
                  name="password"
                  type="password"
                  required={!currentUser}
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none ${
                    fieldErrors.password ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {fieldErrors.password && <p className="text-red-500 text-xs mt-1 font-medium">{fieldErrors.password[0]}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none ${
                    fieldErrors.role ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value="admin">Admin</option>
                  <option value="tecnico">Técnico</option>
                </select>
                {fieldErrors.role && <p className="text-red-500 text-xs mt-1 font-medium">{fieldErrors.role[0]}</p>}
              </div>

              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  {currentUser ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
