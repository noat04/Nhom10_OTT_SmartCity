const BASE_URL = "http://localhost:3000/api";

// --- LOGIN FLOW ---
export const loginAPI = async (data) => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  return res.json();
};
// --- REGISTER FLOW ---
// Bước 1: Gửi OTP đến email đăng ký
export const registerAPI = async (email) => {
  const res = await fetch(`${BASE_URL}/auth/register/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  return res.json();
};

// --- VERIFY FLOW (Dùng chung cho cả 2) ---
export const verifyOtpAPI = async (endpoint, data) => {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const json = await res.json();

    return {
      success: res.ok,
      ...json
    };
  } catch (err) {
    return { success: false };
  }
};

// FORGOT PASSWORD
export const forgotPasswordAPI = async (email) => {
  const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  return res.json();
};

export const verifyResetOtpAPI = async (data) => {
  const res = await fetch(`${BASE_URL}/auth/verify-reset-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const resetPasswordAPI = async (data) => {
  const res = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return res.json();
};