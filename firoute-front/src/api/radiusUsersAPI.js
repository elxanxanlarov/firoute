import api from './axios.js';

export const radiusUsersAPI = {
    // Bütün istifadəçiləri gətir
        getOnlineUsers: async () => {
            const res = await api.get('/radius-users/online-users');
            return res.data?.data || [];
        },

        getAllUsers: async () => {
            const response = await api.get('/radius-users');
            return response.data;
        },

        // Müəyyən istifadəçinin detallarını gətir
        getUserDetails: async (username) => {
            const response = await api.get(`/radius-users/${username}`);
            return response.data;
        },

        // İstifadəçi yarat və ya yenilə
        createOrUpdateUser: async (userData) => {
            const response = await api.put('/radius-users', userData);
            return response.data;
        },

        // Atribut sil
        deleteAttribute: async (table, id) => {
            const response = await api.delete(`/radius-users/${table}/${id}`);
            return response.data;
        }
        ,
        // Update single attribute by id
        updateAttribute: async (table, id, payload) => {
            const response = await api.put(`/radius-users/attribute/${table}/${id}`, payload);
            return response.data;
        },
        // İstifadəçini tam sil (radcheck + radreply)
        deleteUser: async (username) => {
            const response = await api.delete(`/radius-users/user/${encodeURIComponent(username)}`);
            return response.data;
        }
    };

