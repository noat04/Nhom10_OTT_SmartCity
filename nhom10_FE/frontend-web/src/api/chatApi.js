import api from "../service/api.service";

// ==============================
// 📩 LẤY LỊCH SỬ TIN NHẮN
// ==============================
export const getMessages = async (conversationId, page = 1, limit = 20) => {
  try {
    const res = await api.get(
      `/chat/${conversationId}/history?page=${page}&limit=${limit}`
    );

    return res.data;
  } catch (err) {
    console.error("❌ getMessages:", err?.response?.data || err.message);

    return {
      success: false,
      status: err.response?.status,
      message: err.response?.data?.message || "Lỗi load tin nhắn",
    };
  }
};

// ==============================
// 📤 GỬI TIN NHẮN (TEXT / FILE)
// ==============================
export const sendMessageAPI = async (data) => {
  try {
    const res = await api.post("/chat/message", data);

    return res.data;
  } catch (err) {
    console.error("❌ sendMessage:", err?.response?.data || err.message);

    return {
      success: false,
      status: err.response?.status,
      message: err.response?.data?.message || "Gửi tin nhắn thất bại",
    };
  }
};

// ==============================
// 💬 DANH SÁCH CUỘC TRÒ CHUYỆN
// ==============================
export const getConversations = async () => {
  try {
    const res = await api.get("/chat/conversations");

    return res.data;
  } catch (err) {
    console.error("❌ getConversations:", err?.response?.data || err.message);

    return {
      success: false,
      status: err.response?.status,
      message: err.response?.data?.message || "Lỗi load conversations",
    };
  }
};

// ==============================
// ☁️ LẤY PRESIGNED URL (UPLOAD FILE)
// ==============================
export const getPresignedUrl = async (data) => {
  try {
    const res = await api.post("/upload/presigned-url", data);

    return res.data;
  } catch (err) {
    console.error("❌ getPresignedUrl:", err?.response?.data || err.message);

    return {
      success: false,
      status: err.response?.status,
      message: err.response?.data?.message || "Lỗi lấy link upload",
    };
  }
};