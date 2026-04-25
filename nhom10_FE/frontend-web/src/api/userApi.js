import api from "../service/api.service";

// Hàm hỗ trợ lấy và làm sạch token
const getCleanToken = () => {
  let token = localStorage.getItem("token");
  if (!token || token === "null" || token === "undefined") return null;
  return token.replace(/^"|"$/g, "").trim();
};

export const getMe = async () => {
  try {
    const res = await api.get("/users/me");
    // 👉 THÊM DÒNG NÀY: Lưu full thông tin user để AuthContext đọc được
    localStorage.setItem("user", JSON.stringify(res.user));
    return res.data;
  } catch (err) {
    return { success: false, status: err.response?.status };
  }
};

// 1. CẬP NHẬT THÔNG TIN (Text)
export const updateProfile = async (data) => {
  try {
    const token = getCleanToken();

    const res = await api.put("/users/update", data, {
      headers: { Authorization: `Bearer ${token}` }
    });

    return res.data; // { success, user }
  } catch (err) {
    return { success: false, message: err.response?.data?.message };
  }
};

export const updateAvatar = async (file) => {
  try {
    const token = getCleanToken();

    const formData = new FormData();
    formData.append("avatar", file);

    const res = await api.put("/users/avatar", formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data"
      }
    });

    return res.data; // { success, user }
  } catch (err) {
    return { success: false, message: err.response?.data?.message };
  }
};

// 3. CẬP NHẬT COVER (File) - (Tùy chọn, thêm vào nếu giao diện cần)
export const updateCover = async (file) => {
    try {
      const token = getCleanToken();
      const formData = new FormData();
      formData.append("cover", file);
  
      const res = await api.put("/users/cover", formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data" 
        }
      });
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || "Lỗi upload cover" };
    }
  };