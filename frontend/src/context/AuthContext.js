'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage and fetch current user
  useEffect(() => {
    async function loadUser() {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await api.get('/auth/me');
        if (res.success && res.user) {
          setUser(res.user);
        } else {
          localStorage.removeItem('token');
          setUser(null);
        }
      } catch (err) {
        console.warn('Failed to restore session:', err.message);
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  // Login handler
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.token) {
      localStorage.setItem('token', res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error(res.message || 'Login failed');
  };

  // Register handler
  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    if (res.success && res.token) {
      localStorage.setItem('token', res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error(res.message || 'Registration failed');
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  // Refresh profile details
  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.success && res.user) {
        setUser(res.user);
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
    }
  };

  // Switch role handler between Job Seeker and Recruiter
  const switchRole = async (targetRole) => {
    try {
      const res = await api.post('/auth/switch-role', { role: targetRole });
      if (res.success && res.token && res.user) {
        localStorage.setItem('token', res.token);
        setUser(res.user);
        return res.user;
      }
      throw new Error(res.message || 'Failed to switch role');
    } catch (err) {
      console.error('switchRole error:', err);
      throw err;
    }
  };

  const isSeeker = user?.role === 'job_seeker';
  const isRecruiter = user?.role === 'recruiter';
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        switchRole,
        isSeeker,
        isRecruiter,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
