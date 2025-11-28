import api from './axios.js';

// Radius Profil API servisləri
export const radiusProfileAPI = {
  // Bütün profilləri əldə et
  getAll: async () => {
    const response = await api.get('/radius/profiles');
    return response.data;
  },

  // Tək profil əldə et
  getByGroupname: async (groupname) => {
    const response = await api.get(`/radius/profiles/${encodeURIComponent(groupname)}`);
    return response.data;
  },

  // Yeni profil yarat
  create: async (profileData) => {
    const response = await api.post('/radius/profiles', profileData);
    return response.data;
  },

  // Profil yenilə
  update: async (groupname, profileData) => {
    const response = await api.put(`/radius/profiles/${encodeURIComponent(groupname)}`, profileData);
    return response.data;
  },

  // Profil sil
  delete: async (groupname) => {
    const response = await api.delete(`/radius/profiles/${encodeURIComponent(groupname)}`);
    return response.data;
  }
};

