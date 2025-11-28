import api from './axios.js';

// System Activity API servisləri
export const systemActivityAPI = {
  // Bütün əməliyyatları əldə et (opsional filtr params)
  getAll: async (params) => {
    const response = await api.get('/system-activities', { params });
    return response.data;
  },

  // Müştərinin əməliyyatlarını əldə et
  getByCustomer: async (customerId, params) => {
    const response = await api.get(`/system-activities/customer/${customerId}`, { params });
    return response.data;
  }
};

export default systemActivityAPI;

