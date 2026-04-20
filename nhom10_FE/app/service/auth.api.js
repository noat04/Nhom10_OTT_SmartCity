import api from "./api.service";

export const loginSendOtpAPI = (data) => api.post("/auth/login/send-otp", data);

export const loginVerifyOtpAPI = (data) => api.post("/auth/login/verify", data);

export const registerSendOtpAPI = (data) =>
  api.post("/auth/register/send-otp", data);

export const registerVerifyOtpAPI = (data) =>
  api.post("/auth/register/verify", data);

// 🔥 gửi OTP reset
export const forgotPasswordAPI = (email) =>
  api.post("/auth/forgot-password", { email });

// 🔥 verify OTP reset
export const verifyResetOtpAPI = (data) =>
  api.post("/auth/verify-reset-otp", data);

// 🔥 reset password
export const resetPasswordAPI = (data) =>
  api.post("/auth/reset-password", data);

export const logoutAPI = () => api.post("/auth/logout");
