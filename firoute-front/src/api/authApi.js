import api from './axios.js';

export const authApi = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password }, { withCredentials: true });
    return res.data;
  },
  me: async () => {
    const res = await api.get('/auth/me', { withCredentials: true });
    return res.data;
  },
  logout: async () => {
    const res = await api.post('/auth/logout', {}, { withCredentials: true });
    sessionStorage.removeItem('token');
    return res.data;
  },
};


