// frontend/src/services/api.js
import axios from 'axios';

// Create axios instance
const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 15000 // 15 seconds timeout
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.code === 'ERR_NETWORK') {
            console.error('Network Error: Backend server is not running');
            // Don't redirect on network errors for API calls
        } else if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            delete api.defaults.headers.common['Authorization'];
            window.location.href = '/login?session=expired';
        }
        
        return Promise.reject(error);
    }
);

// Test connection function
export const testConnection = async () => {
    try {
        const response = await api.get('/health');
        return { 
            connected: true, 
            data: response.data,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { 
            connected: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

export default api;