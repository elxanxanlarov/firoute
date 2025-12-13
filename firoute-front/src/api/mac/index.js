import api from '../axios.js';

export const macAPI = {
  // Server MAC-i avtomatik götürəcək; istəyinizlə 'mac' header-i göndərə bilərsiniz
  authorize: async ({ profile, mac } = {}) => {
    const headers = mac ? { 'x-client-mac': mac } : undefined;
    const res = await api.post('/authorize', { profile }, { headers, withCredentials: true });
    return res.data;
  }
};

export default macAPI;