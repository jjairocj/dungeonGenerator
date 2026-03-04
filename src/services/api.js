import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
    timeout: 10000,
});

// Response interceptor — handle 401 globally
api.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error.response?.status === 401) {
            // Clear auth and redirect to login
            localStorage.removeItem('dnd-auth');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
