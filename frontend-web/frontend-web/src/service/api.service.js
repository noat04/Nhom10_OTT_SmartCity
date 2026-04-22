// src/services/api.service.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api', // Thay bằng cổng Backend của bạn (VD: 5000 hoặc 8000)
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor: Can thiệp vào request TRƯỚC KHI gửi lên server
api.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem("token");

    console.log("RAW TOKEN:", token);

    if (token && token !== "null" && token !== "undefined") {
      token = token.replace(/^"|"$/g, "").trim();

      console.log("CLEAN TOKEN:", token);

      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.log("❌ NO TOKEN FOUND");
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