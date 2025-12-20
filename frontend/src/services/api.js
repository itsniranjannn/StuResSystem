import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 10000
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('API Request:', config.method, config.url);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message
    });
    
    if (error.response) {
      // Server responded with error
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      
      return Promise.reject({
        message: error.response.data?.message || 'An error occurred',
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      // Request made but no response
      console.error('No response received. Check if backend is running.');
      return Promise.reject({
        message: 'Cannot connect to server. Please check if backend is running.',
        status: 0
      });
    } else {
      // Something else
      return Promise.reject({
        message: error.message || 'An error occurred',
        status: 500
      });
    }
  }
);

export default api;