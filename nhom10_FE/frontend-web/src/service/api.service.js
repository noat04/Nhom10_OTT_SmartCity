// src/services/api.service.js
import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor: Can thiệp vào request TRƯỚC KHI gửi lên server
api.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem("token");

    if (token && token !== "null" && token !== "undefined") {
      token = token.replace(/^"|"$/g, "").trim();
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      console.log("Auto logout do 401");

      localStorage.clear();
      window.location.href = "/login";
    }

    return Promise.reject(err);
  }
);


export default api;
