import api from './axios.js';

// Pending Customer API servisləri
export const pendingCustomerAPI = {
  // Bütün pending customer-ləri əldə et (opsional filtr params)
  getAll: async (params) => {
    const response = await api.get('/pending-customers', { params });
    return response.data;
  },

  // Tək pending customer əldə et
  getById: async (id) => {
    const response = await api.get(`/pending-customers/${id}`);
    return response.data;
  },

  // Yeni pending customer yarat
  create: async (pendingCustomerData) => {
    const response = await api.post('/pending-customers', pendingCustomerData);
    return response.data;
  },

  // Pending customer yenilə
  update: async (id, pendingCustomerData) => {
    const response = await api.put(`/pending-customers/${id}`, pendingCustomerData);
    return response.data;
  },

  // Pending customer sil
  delete: async (id) => {
    const response = await api.delete(`/pending-customers/${id.toString()}`);
    return response.data;
  },

  // Pending customer statusunu dəyişdir
  updateStatus: async (id, status) => {
    const response = await api.patch(`/pending-customers/${id}/status`, { status });
    return response.data;
  }
};

export default pendingCustomerAPI;

