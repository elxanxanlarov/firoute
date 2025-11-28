import api from './axios.js';

// Router API servisləri
export const routerAPI = {
  // Bütün router-ləri əldə et (opsional filtr params)
  getAll: async (params) => {
    const response = await api.get('/routers', { params });
    return response.data;
  },

  // Tək router əldə et
  getById: async (id) => {
    const response = await api.get(`/routers/${id}`);
    return response.data;
  },

  // Yeni router yarat
  create: async (routerData) => {
    const response = await api.post('/routers', routerData);
    return response.data;
  },

  // Router yenilə
  update: async (id, routerData) => {
    const response = await api.put(`/routers/${id}`, routerData);
    return response.data;
  },

  // Router sil
  delete: async (id) => {
    const response = await api.delete(`/routers/${id.toString()}`);
    return response.data;
  },

  // Router statusunu dəyişdir
  updateStatus: async (id, status) => {
    const response = await api.patch(`/routers/${id}/status`, { status });
    return response.data;
  }
};

