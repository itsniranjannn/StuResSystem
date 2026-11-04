import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('stures_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const onAuthPage = /^\/(login|register|forgot|reset)/.test(window.location.pathname);
    if (err.response?.status === 401 && !onAuthPage && localStorage.getItem('stures_token')) {
      localStorage.removeItem('stures_token');
      window.location.assign('/login');
    }
    return Promise.reject(err);
  },
);

export const errMsg = (e) => e.response?.data?.message || (e.code === 'ERR_NETWORK' ? 'Cannot reach the server' : 'Something went wrong');
export const get = (url, params) => api.get(url, { params }).then((r) => r.data);
export const post = (url, body) => api.post(url, body).then((r) => r.data);
export const put = (url, body) => api.put(url, body).then((r) => r.data);
export const patch = (url, body) => api.patch(url, body).then((r) => r.data);
export const del = (url) => api.delete(url).then((r) => r.data);
export default api;
