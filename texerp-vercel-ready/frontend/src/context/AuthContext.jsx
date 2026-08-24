import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('tex_erp_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem('tex_erp_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (res.data?.success) {
          setUser(res.data.user);
          localStorage.setItem('tex_erp_user', JSON.stringify(res.data.user));
        }
      } catch (err) {
        localStorage.removeItem('tex_erp_token');
        localStorage.removeItem('tex_erp_user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data?.success) {
      localStorage.setItem('tex_erp_token', res.data.token);
      localStorage.setItem('tex_erp_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      return res.data;
    }
    throw new Error(res.data?.message || 'Login failed');
  };

  const logout = () => {
    localStorage.removeItem('tex_erp_token');
    localStorage.removeItem('tex_erp_user');
    setUser(null);
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    const res = await api.get('/auth/me');
    if (res.data?.success) {
      setUser(res.data.user);
      localStorage.setItem('tex_erp_user', JSON.stringify(res.data.user));
    }
  };

  const isMainAdmin = user?.role_name === 'Main Admin';
  const isAdmin = user?.role_name === 'Admin';

  const hasRole = (...roles) => {
    if (!user) return false;
    return roles.includes(user.role_name);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        refreshUser,
        logout,
        hasRole,
        isMainAdmin,
        isAdmin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
