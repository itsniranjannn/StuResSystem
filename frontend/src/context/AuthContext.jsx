import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Try to get user profile
        const response = await api.get('/auth/profile');
        setUser(response.data.user);
      }
    } catch (err) {
      console.log('No valid token found or session expired');
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
      }
      
      return { success: true, data: response.data };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Login failed. Please check your credentials.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      const response = await api.post('/auth/register', userData);
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
      }
      
      return { success: true, data: response.data };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Registration failed. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setError(null);
    setSidebarOpen(false);
  };

  const forgotPassword = async (email) => {
    try {
      setError(null);
      const response = await api.post('/auth/forgot-password', { email });
      return { success: true, data: response.data };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to send reset email. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const resetPassword = async (token, password) => {
    try {
      setError(null);
      const response = await api.post('/auth/reset-password', { token, password });
      return { success: true, data: response.data };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to reset password. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      setError(null);
      const response = await api.put('/auth/profile', profileData);
      
      // Update user in state
      setUser(prev => ({ ...prev, ...profileData }));
      
      return { success: true, data: response.data };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to update profile';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const value = {
    user,
    loading,
    error,
    sidebarOpen,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    setError,
    checkAuthStatus,
    toggleSidebar,
    setSidebarOpen
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Helper function to get navigation based on role
export const getNavigationByRole = (role) => {
  const baseNav = [
    { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    { path: '/profile', label: 'Profile', icon: 'User' },
  ];

  const roleNav = {
    student: [
      ...baseNav,
      { path: '/my-results', label: 'My Results', icon: 'FileText' },
      { path: '/marks', label: 'Marks', icon: 'BookOpen' },
      { path: '/ranking', label: 'Class Ranking', icon: 'Trophy' },
      { path: '/notices', label: 'Notices', icon: 'Bell' },
    ],
    teacher: [
      ...baseNav,
      { path: '/students', label: 'Students', icon: 'Users' },
      { path: '/marks-entry', label: 'Enter Marks', icon: 'Edit' },
      { path: '/subjects', label: 'My Subjects', icon: 'BookOpen' },
      { path: '/results', label: 'Results', icon: 'FileText' },
      { path: '/notices', label: 'Notices', icon: 'Bell' },
    ],
    admin: [
      ...baseNav,
      { path: '/users', label: 'User Management', icon: 'Users' },
      { path: '/students', label: 'Students', icon: 'GraduationCap' },
      { path: '/teachers', label: 'Teachers', icon: 'UserCog' },
      { path: '/subjects', label: 'Subjects', icon: 'BookOpen' },
      { path: '/results', label: 'Results', icon: 'BarChart3' },
      { path: '/analysis', label: 'Analytics', icon: 'LineChart' },
      { path: '/settings', label: 'Settings', icon: 'Settings' },
      { path: '/notices', label: 'Notices', icon: 'Bell' },
    ]
  };

  return roleNav[role] || baseNav;
};