import api from './axios.js';

// Rol API servisləri
export const roleAPI = {
  // Bütün rolları əldə et
  getAll: async () => {
    const response = await api.get('/roles');
    return response.data;
  },

  // Tək rol əldə et
  getById: async (id) => {
    const response = await api.get(`/roles/${id}`);
    return response.data;
  },

  // Yeni rol yarat
  create: async (roleData) => {
    const response = await api.post('/roles', roleData);
    return response.data;
  },

  // Rol yenilə
  update: async (id, roleData) => {
    const response = await api.put(`/roles/${id}`, roleData);
    return response.data;
  },

  // Rol sil
  delete: async (id) => {
    const response = await api.delete(`/roles/${id}`);
    return response.data;
  },

  // Rol statusunu dəyişdir
  toggleStatus: async (id) => {
    const response = await api.patch(`/roles/${id}/toggle`);
    return response.data;
  }
};