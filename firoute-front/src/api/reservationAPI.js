import api from './axios.js';

// Rezervasiya API servisləri
export const reservationAPI = {
  // Bütün rezervasiyaları əldə et (opsional filtr params)
  getAll: async (params) => {
    const response = await api.get('/reservations', { params });
    return response.data;
  },

  // Tək rezervasiya əldə et
  getById: async (id) => {
    const response = await api.get(`/reservations/${id}`);
    return response.data;
  },

  // Yeni rezervasiya yarat
  create: async (reservationData) => {
    const response = await api.post('/reservations', reservationData);
    return response.data;
  },

  // Rezervasiya yenilə
  update: async (id, reservationData) => {
    const response = await api.put(`/reservations/${id}`, reservationData);
    return response.data;
  },

  // Rezervasiya sil
  delete: async (id) => {
    const response = await api.delete(`/reservations/${id.toString()}`);
    return response.data;
  },

  // Rezervasiya statusunu dəyişdir
  updateStatus: async (id, status) => {
    const response = await api.patch(`/reservations/${id}/status`, { status });
    return response.data;
  }
};

