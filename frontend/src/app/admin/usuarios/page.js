'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  AlignJustify, Search, ChevronUp, ChevronDown, Plus,
  MoreVertical, Edit2, Power, Trash2, X, AlertCircle, CheckCircle2,
} from 'lucide-react';

const PER_PAGE = 10;

export default function UsuariosPage() {
  const router = useRouter();

  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);

  // Filters
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [filterName, setFilterName]   = useState('');
  const [filterEmail, setFilterEmail] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [applied, setApplied] = useState({ name: '', email: '', status: 'all' });

  // Pagination
  const [page, setPage] = useState(1);

  // Checkboxes
  const [selected, setSelected] = useState([]);

  // Dropdown (filas)
  const [openMenu, setOpenMenu] = useState(null);
  // Dropdown toolbar
  const [openToolbar, setOpenToolbar] = useState(false);

  // Modal (crear)
  const [isModalOpen, setIsModalOpen]         = useState(false);
  const [formData, setFormData]               = useState({ name: '', email: '', password: '', role: 'tecnico' });
  const [fieldErrors, setFieldErrors]         = useState({});
  const [modalGeneralError, setModalGeneralError] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data);
    } catch { console.error('Error al cargar usuarios'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  // Filtered list
  const filtered = users.filter(u => {
    const matchName   = u.name.toLowerCase().includes(applied.name.toLowerCase());
    const matchEmail  = u.email.toLowerCase().includes(applied.email.toLowerCase());
    const matchStatus = applied.status === 'all'
      || (applied.status === 'active'   &&  u.is_active)
      || (applied.status === 'inactive' && !u.is_active);
    return matchName && matchEmail && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const rangeEnd   = Math.min(page * PER_PAGE, filtered.length);

  const applyFilters = () => {
    setApplied({ name: filterName, email: filterEmail, status: filterStatus });
    setPage(1); setSelected([]);
  };

  const resetFilters = () => {
    setFilterName(''); setFilterEmail(''); setFilterStatus('all');
    setApplied({ name: '', email: '', status: 'all' });
    setPage(1); setSelected([]);
  };

  // Selection
  const toggleAll = () =>
    setSelected(selected.length === paginated.length ? [] : paginated.map(u => u.id));
  const toggleOne = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // Modal (crear)
  const openModal = () => {
    setFieldErrors({}); setModalGeneralError('');
    setFormData({ name: '', email: '', password: '', role: 'tecnico' });
    setIsModalOpen(true);
  };
  const closeModal = () => { setIsModalOpen(false); setFieldErrors({}); setModalGeneralError(''); };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) { const n = { ...fieldErrors }; delete n[name]; setFieldErrors(n); }
    if (modalGeneralError) setModalGeneralError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({}); setModalGeneralError('');
    try {
      await api.post('/users', formData);
      closeModal(); fetchUsers();
    } catch (err) {
      if (err.response?.status === 422) setFieldErrors(err.response.data.errors || {});
      else setModalGeneralError(err.response?.data?.message || 'Error de conexión');
    }
  };

  const toggleStatus = async (user) => {
    setOpenMenu(null);
    try { await api.patch(`/users/${user.id}/toggle`); fetchUsers(); }
    catch { alert('Error al cambiar el estado'); }
  };

  const deleteUser = async (id) => {
    setOpenMenu(null);
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) return;
    try { await api.delete(`/users/${id}`); fetchUsers(); }
    catch { alert('Error al eliminar'); }
  };

  const formatDate = (str) => {
    if (!str) return '—';
    const d = new Date(str);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })
      + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const exportCSV = () => {
    setOpenToolbar(false);
    const header = ['Nombre', 'Email', 'Estado', 'Último acceso'];
    const rows = filtered.map(u => [
      u.name,
      u.email,
      u.is_active ? 'Activo' : 'Inactivo',
      formatDate(u.last_login_at ?? u.updated_at),
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'usuarios.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const inputClass = (field) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
      fieldErrors[field] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
    }`;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Usuarios</h2>

      {/* ── Filter panel ── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
        <button
          onClick={() => setFiltersOpen(p => !p)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <Search className="w-4 h-4 text-gray-400" />
            Buscar
          </span>
          {filtersOpen
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {filtersOpen && (
          <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Nombre</label>
                <input
                  type="text"
                  placeholder="Introduce nombre"
                  value={filterName}
                  onChange={e => setFilterName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyFilters()}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Email</label>
                <input
                  type="text"
                  placeholder="Introduce email"
                  value={filterEmail}
                  onChange={e => setFilterEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyFilters()}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Estado</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="all">Todos</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end items-center gap-3 mt-5">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Reiniciar
              </button>
              <button
                onClick={applyFilters}
                className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                Filtrar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Table panel ── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <AlignJustify className="w-4 h-4 text-gray-400" />
            Listado
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openModal()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" /> Nuevo
            </button>
            <div className="relative">
              <button
                onClick={() => setOpenToolbar(p => !p)}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {openToolbar && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpenToolbar(false)} />
                  <div className="absolute right-0 top-10 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 w-44">
                    <button
                      onClick={exportCSV}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                      Exportar a Excel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">Cargando usuarios...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={paginated.length > 0 && selected.length === paginated.length}
                        onChange={toggleAll}
                        className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nombre</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Último acceso</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {paginated.map(user => (
                    <tr
                      key={user.id}
                      onDoubleClick={() => router.push(`/admin/usuarios/${user.id}`)}
                      className="hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={selected.includes(user.id)}
                          onChange={() => toggleOne(user.id)}
                          className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        {user.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                            <CheckCircle2 className="w-3 h-3" /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">
                            <X className="w-3 h-3" /> Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(user.last_login_at ?? user.updated_at)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="relative flex justify-center">
                          <button
                            onClick={() => setOpenMenu(prev => prev === user.id ? null : user.id)}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-400 dark:text-gray-500 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openMenu === user.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                              <div className="absolute right-0 top-8 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 w-44">
                                <button
                                  onClick={() => { setOpenMenu(null); router.push(`/admin/usuarios/${user.id}`); }}
                                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" /> Editar
                                </button>
                                <button
                                  onClick={() => toggleStatus(user)}
                                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                  <Power className="w-3.5 h-3.5" />
                                  {user.is_active ? 'Desactivar' : 'Activar'}
                                </button>
                                <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                                <button
                                  onClick={() => deleteUser(user.id)}
                                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-14 text-center text-sm text-gray-400 dark:text-gray-500">
                        No se encontraron usuarios.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {filtered.length === 0 ? '0 / 0' : `${rangeStart}-${rangeEnd} / ${filtered.length}`}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >‹</button>
                  <span className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400">{page} / {totalPages}</span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >›</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Create modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Nuevo usuario</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {modalGeneralError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{modalGeneralError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                <input name="name" type="text" required value={formData.name} onChange={handleInputChange} className={inputClass('name')} />
                {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name[0]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input name="email" type="email" required value={formData.email} onChange={handleInputChange} className={inputClass('email')} />
                {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email[0]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña</label>
                <input name="password" type="password" required value={formData.password} onChange={handleInputChange} className={inputClass('password')} />
                {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password[0]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
                <select name="role" value={formData.role} onChange={handleInputChange} className={inputClass('role')}>
                  <option value="admin">Admin</option>
                  <option value="tecnico">Técnico</option>
                </select>
                {fieldErrors.role && <p className="text-red-500 text-xs mt-1">{fieldErrors.role[0]}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
