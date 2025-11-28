import api from './axios.js';

// Müştəri API servisləri
export const customerAPI = {
  // Bütün müştəriləri əldə et (opsional filtr params)
  getAll: async (params) => {
    const response = await api.get('/customers', { params });
    return response.data;
  },

  // Tək müştəri əldə et
  getById: async (id) => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

  // Yeni müştəri yarat
  create: async (customerData) => {
    const response = await api.post('/customers', customerData);
    return response.data;
  },

  // Müştəri yenilə
  update: async (id, customerData) => {
    const response = await api.put(`/customers/${id}`, customerData);
    return response.data;
  },

  // Müştəri sil
  delete: async (id) => {
    const response = await api.delete(`/customers/${id.toString()}`);
    return response.data;
  },

  // Müştəri statusunu dəyişdir
  toggleStatus: async (id) => {
    const response = await api.patch(`/customers/${id}/toggle`);
    return response.data;
  }
};

