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

// ==============================
// Sửa tin nhắn
// ==============================
export const editMessageAPI = async (data) => {
  const res = await api.put("/chat/message/edit", data);
  return res.data;
};

// ==============================
// Xóa tin nhắn
// ==============================
export const deleteMessageAPI = async (data) => {
  const res = await api.delete("/chat/message/delete", { data });
  return res.data;
};


//Reaction
export const reactMessageAPI = async (data) => {
  const res = await api.post("/chat/message/react", data);
  return res.data;
};