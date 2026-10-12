import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Call Error:', error.response || error.message);
    const customError = {
      message: error.response?.data?.message || 'An unexpected server error occurred',
      status: error.response?.status || 500,
    };
    return Promise.reject(customError);
  }
);

export default axiosClient;
