// frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                return;
            }

            // Set token in axios headers
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            try {
                const response = await api.get('/auth/profile');
                if (response.data.success) {
                    setUser(response.data.data);
                } else {
                    // Clear invalid token
                    localStorage.removeItem('token');
                    delete api.defaults.headers.common['Authorization'];
                }
            } catch (profileError) {
                if (profileError.code !== 'ERR_NETWORK') {
                    console.log('Profile fetch failed, clearing token');
                    localStorage.removeItem('token');
                    delete api.defaults.headers.common['Authorization'];
                }
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            setError(null);
            console.log('🔐 Attempting login for:', email);
            
            const response = await api.post('/auth/login', { email, password });
            
            if (response.data.success) {
                const { token, user } = response.data.data;
                
                console.log('✅ Login successful, token received');
                
                // Store token
                localStorage.setItem('token', token);
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                
                // Set user
                setUser(user);
                setError(null);
                
                // Navigate based on role
                switch(user.role) {
                    case 'admin':
                        navigate('/admin/dashboard');
                        break;
                    case 'teacher':
                        navigate('/teacher/dashboard');
                        break;
                    case 'student':
                        navigate('/student/dashboard');
                        break;
                    default:
                        navigate('/dashboard');
                }
                
                return { success: true };
            } else {
                setError(response.data.message || 'Login failed');
                return { success: false, error: response.data.message };
            }
        } catch (error) {
            console.error('Login error:', error);
            
            let errorMessage = 'Login failed. Please check credentials.';
            
            if (error.response) {
                if (error.response.data) {
                    errorMessage = error.response.data.message || errorMessage;
                }
            } else if (error.code === 'ERR_NETWORK') {
                errorMessage = 'Cannot connect to server. Please make sure backend is running on http://localhost:5000';
            }
            
            setError(errorMessage);
            return { success: false, error: errorMessage };
        }
    };

    const register = async (userData) => {
        try {
            setError(null);
            console.log('📤 Registering user:', userData.email);
            
            const response = await api.post('/auth/register', userData);
            
            if (response.data.success) {
                const { token, user } = response.data.data;
                
                console.log('✅ Registration successful, auto-login:', user.email);
                
                // Store token
                localStorage.setItem('token', token);
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                
                // Set user
                setUser(user);
                setError(null);
                
                // Navigate based on role
                navigate(`/${user.role}/dashboard`);
                
                return { 
                    success: true, 
                    message: 'Registration successful!',
                    data: { user }
                };
            } else {
                setError(response.data.message);
                return { success: false, error: response.data.message };
            }
        } catch (error) {
            console.error('Registration error:', error);
            
            let errorMessage = 'Registration failed. Please try again.';
            
            if (error.response) {
                if (error.response.data) {
                    errorMessage = error.response.data.message || errorMessage;
                }
            } else if (error.code === 'ERR_NETWORK') {
                errorMessage = 'Cannot connect to server. Please make sure backend is running on http://localhost:5000';
            }
            
            setError(errorMessage);
            return { success: false, error: errorMessage };
        }
    };

    const logout = () => {
        console.log('👋 Logging out user');
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
        setError(null);
        navigate('/login');
    };

    const updateProfile = async (profileData) => {
        try {
            const response = await api.put('/auth/profile', profileData);
            if (response.data.success) {
                setUser(prev => ({ ...prev, ...profileData }));
                return { success: true };
            } else {
                return { success: false, error: response.data.message };
            }
        } catch (error) {
            console.error('Update profile error:', error);
            return { success: false, error: error.response?.data?.message || 'Update failed' };
        }
    };

    const clearError = () => {
        setError(null);
    };

    const value = {
        user,
        loading,
        error,
        login,
        register,
        logout,
        updateProfile,
        clearError,
        setError
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};