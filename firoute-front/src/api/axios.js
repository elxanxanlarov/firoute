import axios from 'axios';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // Backend API base URL
  timeout: 10000, 
  headers: {
    'Content-Type': 'application/json',
  },
});
export default api;
