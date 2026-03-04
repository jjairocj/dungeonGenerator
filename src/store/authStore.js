import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
    persist(
        (set, get) => ({
            token: null,
            refreshToken: null,
            user: null,

            login: async (email, password) => {
                const res = await api.post('/auth/login', { email, password });
                const { accessToken, refreshToken, user } = res.data;
                api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                set({ token: accessToken, refreshToken, user });
                return user;
            },

            register: async (email, password, username) => {
                const res = await api.post('/auth/register', { email, password, username });
                const { accessToken, refreshToken, user } = res.data;
                api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                set({ token: accessToken, refreshToken, user });
                return user;
            },

            logout: async () => {
                try { await api.post('/auth/logout'); } catch (_) { }
                delete api.defaults.headers.common['Authorization'];
                set({ token: null, refreshToken: null, user: null });
            },

            // Called on app boot to rehydrate auth header
            rehydrate: () => {
                const { token } = get();
                if (token) {
                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                }
            },
        }),
        {
            name: 'dnd-auth',
            partialize: (s) => ({ token: s.token, refreshToken: s.refreshToken, user: s.user }),
        }
    )
);
