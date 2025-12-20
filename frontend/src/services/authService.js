import api from './api';

export const authService = {
  // Check if user is authenticated
  isAuthenticated: () => {
    return localStorage.getItem('token') !== null;
  },

  // Get current token
  getToken: () => {
    return localStorage.getItem('token');
  },

  // Get user role
  getUserRole: () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role;
    } catch (err) {
      return null;
    }
  },

  // Check if user has specific role
  hasRole: (role) => {
    const userRole = authService.getUserRole();
    return userRole === role;
  },

  // Get user info from token
  getUserInfo: () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        role: payload.role
      };
    } catch (err) {
      return null;
    }
  },

  // Clear authentication
  clearAuth: () => {
    localStorage.removeItem('token');
  }
};