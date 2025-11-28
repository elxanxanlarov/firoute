import api from './axios.js';

// Otaq API servisləri
export const roomAPI = {
  // Bütün otaqları əldə et (opsional filtr params)
  getAll: async (params) => {
    const response = await api.get('/rooms', { params });
    return response.data;
  },

  // Tək otaq əldə et
  getById: async (id) => {
    const response = await api.get(`/rooms/${id}`);
    return response.data;
  },

  // Yeni otaq yarat
  create: async (roomData) => {
    const response = await api.post('/rooms', roomData);
    return response.data;
  },

  // Otaq yenilə
  update: async (id, roomData) => {
    const response = await api.put(`/rooms/${id}`, roomData);
    return response.data;
  },

  // Otaq sil
  delete: async (id) => {
    const response = await api.delete(`/rooms/${id.toString()}`);
    return response.data;
  }
};

