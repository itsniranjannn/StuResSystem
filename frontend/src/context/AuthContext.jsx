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
            
            // Fetch user profile
            const response = await api.get('/auth/profile');
            if (response.data.success) {
                setUser(response.data.data);
            } else {
                localStorage.removeItem('token');
                delete api.defaults.headers.common['Authorization'];
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('token');
            delete api.defaults.headers.common['Authorization'];
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            setError(null);
            const response = await api.post('/auth/login', { email, password });
            
            if (response.data.success) {
                const { token, user } = response.data.data;
                
                // Store token
                localStorage.setItem('token', token);
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                
                // Set user
                setUser(user);
                
                // Redirect based on role
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
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Login failed');
            return { success: false, error: error.response?.data?.message };
        }
    };

    const register = async (userData) => {
        try {
            setError(null);
            const response = await api.post('/auth/register', userData);
            
            if (response.data.success) {
                const { token, user } = response.data.data;
                
                // Store token
                localStorage.setItem('token', token);
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                
                // Set user
                setUser(user);
                
                return { success: true, message: response.data.message };
            } else {
                return { success: false, error: response.data.message };
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Registration failed';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        }
    };

    const logout = () => {
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
            }
        } catch (error) {
            return { success: false, error: error.response?.data?.message };
        }
    };

    const value = {
        user,
        loading,
        error,
        login,
        register,
        logout,
        updateProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};