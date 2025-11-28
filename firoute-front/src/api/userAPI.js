import api from './axios.js';

// İstifadəçi API servisləri
export const userAPI = {
  // Bütün istifadəçiləri əldə et (opsional filtr params)
  getAll: async (params) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  // Tək istifadəçi əldə et
  getById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  // Yeni istifadəçi yarat
  create: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  // İstifadəçi yenilə
  update: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  // İstifadəçi sil
  delete: async (id) => {
    const response = await api.delete(`/users/${id.toString()}`);
    return response.data;
  },

  // İstifadəçi statusunu dəyişdir
  toggleStatus: async (id) => {
    const response = await api.patch(`/users/${id}/toggle`);
    return response.data;
  }
};