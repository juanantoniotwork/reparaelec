'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { UserPlus, Edit2, Power, Trash2, X, Check, AlertCircle } from 'lucide-react';

export default function UsuariosPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
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

  useEffect(() => { fetchUsers(); }, []);

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

  const closeModal = () => {
    setIsModalOpen(false);
    setFieldErrors({});
    setModalGeneralError('');
  };

  const openModal = (user = null) => {
    setFieldErrors({});
    setModalGeneralError('');
    if (user) {
      setCurrentUser(user);
      setFormData({ name: user.name, email: user.email, password: '', role: user.role });
    } else {
      setCurrentUser(null);
      setFormData({ name: '', email: '', password: '', role: 'tecnico' });
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
        setFieldErrors(err.response.data.errors || {});
      } else {
        setModalGeneralError(err.response?.data?.message || 'Error de conexión con el servidor');
      }
    }
  };

  const toggleStatus = async (user) => {
    try {
      await api.patch(`/users/${user.id}/toggle`);
      fetchUsers();
    } catch { alert('Error al cambiar el estado'); }
  };

  const deleteUser = async (id) => {
    if (!confirm('¿Estás seguro?')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch { alert('Error al eliminar'); }
  };

  const inputClass = (field) =>
    `w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
      fieldErrors[field]
        ? 'border-red-500 dark:border-red-500'
        : 'border-gray-300 dark:border-gray-600'
    }`;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Usuarios</h2>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Nuevo usuario
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">Cargando usuarios...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Nombre</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Email</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Rol</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Estado</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{user.name}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center text-xs font-medium ${
                        user.is_active ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {user.is_active ? <Check className="w-4 h-4 mr-1" /> : <X className="w-4 h-4 mr-1" />}
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-3 text-gray-400 dark:text-gray-500">
                        <button onClick={() => openModal(user)} className="hover:text-blue-600 dark:hover:text-blue-400"><Edit2 className="w-5 h-5" /></button>
                        <button onClick={() => toggleStatus(user)} className="hover:text-orange-500 dark:hover:text-orange-400"><Power className="w-5 h-5" /></button>
                        <button onClick={() => deleteUser(user.id)} className="hover:text-red-600 dark:hover:text-red-400"><Trash2 className="w-5 h-5" /></button>
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
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{currentUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {modalGeneralError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg text-sm flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {modalGeneralError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                <input name="name" type="text" required value={formData.name} onChange={handleInputChange} className={inputClass('name')} />
                {fieldErrors.name && <p className="text-red-500 text-xs mt-1 font-medium">{fieldErrors.name[0]}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input name="email" type="email" required value={formData.email} onChange={handleInputChange} className={inputClass('email')} />
                {fieldErrors.email && <p className="text-red-500 text-xs mt-1 font-medium">{fieldErrors.email[0]}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contraseña {currentUser && '(Opcional)'}
                </label>
                <input name="password" type="password" required={!currentUser} value={formData.password} onChange={handleInputChange} className={inputClass('password')} />
                {fieldErrors.password && <p className="text-red-500 text-xs mt-1 font-medium">{fieldErrors.password[0]}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
                <select name="role" value={formData.role} onChange={handleInputChange} className={inputClass('role')}>
                  <option value="admin">Admin</option>
                  <option value="tecnico">Técnico</option>
                </select>
                {fieldErrors.role && <p className="text-red-500 text-xs mt-1 font-medium">{fieldErrors.role[0]}</p>}
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
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
