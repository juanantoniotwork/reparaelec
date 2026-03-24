import api from './api';
import Cookies from 'js-cookie';

export const login = async (email, password) => {
  const response = await api.post('/login', { email, password });
  const { access_token, role, user } = response.data;

  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('role', role);
    localStorage.setItem('user', JSON.stringify(user));

    // Guardamos en cookies para el middleware de Next.js
    Cookies.set('access_token', access_token, { expires: 7 });
    Cookies.set('role', role, { expires: 7 });
  }

  return response.data;
};

export const logout = async () => {
  try {
    await api.post('/logout');
  } catch (error) {
    console.error('Error logging out:', error);
  } finally {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('role');
      localStorage.removeItem('user');

      // Borramos cookies
      Cookies.remove('access_token');
      Cookies.remove('role');
    }
  }
};

export const getUser = () => {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
  return null;
};

export const getRole = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('role');
  }
  return null;
};
